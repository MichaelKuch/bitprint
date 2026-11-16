/**
 * Decrypts Bitwarden's password protected JSON exports, in the browser.
 *
 * The format, as implemented by the Bitwarden clients:
 *  1. key material = KDF(password, salt), 32 bytes. The KDF is PBKDF2-SHA256, or
 *     Argon2id with SHA-256(salt) as its salt. The salt is the text from the
 *     file, used as it is (not base64-decoded).
 *  2. That is stretched with HKDF-Expand (SHA-256) into an encryption key
 *     (info "enc") and a MAC key (info "mac"), 32 bytes each.
 *  3. `encKeyValidation_DO_NOT_EDIT` and `data` are "2.<iv>|<ciphertext>|<mac>"
 *     (base64): AES-256-CBC, with HMAC-SHA256 over iv + ciphertext.
 */

/** The fields of a password protected export that are needed to decrypt it */
export interface PasswordProtectedExport {
  salt: string;
  kdfType: number;
  kdfIterations: number;
  kdfMemory?: number;
  kdfParallelism?: number;
  encKeyValidation_DO_NOT_EDIT: string;
  data: string;
}

/** The password does not match the export */
export class WrongPasswordError extends Error {}

/** The export cannot be decrypted here; the message is safe to show to the user */
export class DecryptionError extends Error {}

const KDF_PBKDF2 = 0;
const KDF_ARGON2ID = 1;

// The same limits the Bitwarden clients apply on import. The file decides these
// numbers, and Argon2 allocates `kdfMemory` MiB, so they must be checked first.
const inRange = (value: unknown, min: number, max: number): value is number =>
  typeof value === 'number' && Number.isInteger(value) && value >= min && value <= max;

/** Whether the export's KDF settings are ones this app can and should run */
export function hasSupportedKdf(doc: PasswordProtectedExport): boolean {
  switch (doc.kdfType) {
    case KDF_PBKDF2:
      return inRange(doc.kdfIterations, 5000, 2_000_000);
    case KDF_ARGON2ID:
      return (
        inRange(doc.kdfIterations, 2, 10) &&
        inRange(doc.kdfMemory, 16, 1024) &&
        inRange(doc.kdfParallelism, 1, 16)
      );
    default:
      return false;
  }
}

// Typed as backed by a plain ArrayBuffer, which is what Web Crypto accepts
type Bytes = Uint8Array<ArrayBuffer>;

const utf8 = (text: string): Bytes => new TextEncoder().encode(text);

function fromBase64(text: string): Bytes {
  try {
    return Uint8Array.from(atob(text), char => char.charCodeAt(0));
  } catch {
    throw new DecryptionError('This export is damaged and cannot be decrypted.');
  }
}

async function deriveKeyMaterial(doc: PasswordProtectedExport, password: string): Promise<Bytes> {
  if (doc.kdfType === KDF_ARGON2ID) {
    // Loaded on demand: only exports from accounts that use Argon2id need it
    const { argon2idAsync } = await import('@noble/hashes/argon2.js');
    const salt = new Uint8Array(await crypto.subtle.digest('SHA-256', utf8(doc.salt)));

    try {
      const key = await argon2idAsync(utf8(password), salt, {
        t: doc.kdfIterations,
        m: doc.kdfMemory! * 1024, // MiB → KiB
        p: doc.kdfParallelism!,
        dkLen: 32
      });
      return new Uint8Array(key);
    } catch {
      throw new DecryptionError(
        `This export needs ${doc.kdfMemory} MiB of memory to decrypt, which this browser could not provide.`
      );
    }
  }

  const baseKey = await crypto.subtle.importKey('raw', utf8(password), 'PBKDF2', false, [
    'deriveBits'
  ]);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt: utf8(doc.salt), iterations: doc.kdfIterations },
    baseKey,
    256
  );
  return new Uint8Array(bits);
}

const importHmacKey = (key: Bytes, usage: KeyUsage) =>
  crypto.subtle.importKey('raw', key, { name: 'HMAC', hash: 'SHA-256' }, false, [usage]);

/**
 * HKDF-Expand for a single block (32 bytes with SHA-256): HMAC(key, info + 0x01).
 * Web Crypto's own HKDF always runs the extract step first, which Bitwarden skips.
 */
async function hkdfExpand(keyMaterial: Bytes, info: string): Promise<Bytes> {
  const key = await importHmacKey(keyMaterial, 'sign');
  const block = await crypto.subtle.sign('HMAC', key, new Uint8Array([...utf8(info), 1]));
  return new Uint8Array(block);
}

interface ExportKey {
  encKey: CryptoKey;
  macKey: CryptoKey;
}

/** Decrypts one "2.<iv>|<ciphertext>|<mac>" string; a MAC mismatch means the key is wrong */
async function decryptString(encrypted: string, { encKey, macKey }: ExportKey): Promise<string> {
  const [type, payload, ...rest] = encrypted.split('.');
  const parts = (payload ?? '').split('|');

  if (type !== '2' || rest.length > 0 || parts.length !== 3) {
    throw new DecryptionError('This export uses an encryption format that is not supported.');
  }

  const [iv, ciphertext, mac] = parts.map(fromBase64);
  const signed = new Uint8Array([...iv, ...ciphertext]);

  // Checked before decrypting, in constant time
  if (!(await crypto.subtle.verify('HMAC', macKey, mac, signed))) {
    throw new WrongPasswordError();
  }

  try {
    const plain = await crypto.subtle.decrypt({ name: 'AES-CBC', iv }, encKey, ciphertext);
    return new TextDecoder().decode(plain);
  } catch {
    throw new DecryptionError('This export is damaged and cannot be decrypted.');
  }
}

/**
 * Returns the unencrypted export (JSON text) inside a password protected one.
 * Throws WrongPasswordError for a wrong password, DecryptionError otherwise.
 */
export async function decryptExport(
  doc: PasswordProtectedExport,
  password: string
): Promise<string> {
  // Web Crypto only exists on https://, localhost and file:// pages
  if (!globalThis.crypto?.subtle) {
    throw new DecryptionError(
      'Decryption is not available on this page. Open it via https://, localhost or as a local file.'
    );
  }

  if (!hasSupportedKdf(doc)) {
    throw new DecryptionError('This export uses key derivation settings that are not supported.');
  }

  const keyMaterial = await deriveKeyMaterial(doc, password);
  const key: ExportKey = {
    encKey: await crypto.subtle.importKey(
      'raw',
      await hkdfExpand(keyMaterial, 'enc'),
      'AES-CBC',
      false,
      ['decrypt']
    ),
    macKey: await importHmacKey(await hkdfExpand(keyMaterial, 'mac'), 'verify')
  };

  // Bitwarden checks the password against this value before touching the data
  await decryptString(doc.encKeyValidation_DO_NOT_EDIT, key);

  return decryptString(doc.data, key);
}
