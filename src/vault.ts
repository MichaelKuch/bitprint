import type { Folder, VaultData, VaultItem } from './context';

type CsvRow = Record<string, string | undefined>;

/** Pseudo folder id for items that are not in any folder */
export const NO_FOLDER = '__no_folder__';

/** An import problem with a message that is safe to show to the user */
export class VaultImportError extends Error {}

export const folderKey = (item: VaultItem): string => item.folderId || NO_FOLDER;

/**
 * The folders that can be toggled: the vault's folders, plus a "No folder" entry
 * when some logins are unfiled. Empty when the vault has no folders at all
 * (nothing is filtered then).
 */
export function folderOptions(data: VaultData): Folder[] {
  if (data.folders.length === 0) return [];

  const hasUnfiled = data.items.some(item => item.type === 1 && !item.folderId);
  return hasUnfiled ? [...data.folders, { id: NO_FOLDER, name: 'No folder' }] : data.folders;
}

/**
 * The hostname to request a favicon for, or null if the item has no public web
 * address. Anything else (IP addresses, intranet names, app URIs) is not sent
 * to the icon service.
 */
export function getIconHostname(uri: string | undefined): string | null {
  if (!uri) return null;

  try {
    // Bitwarden allows URIs without a scheme, e.g. "example.com"
    const url = new URL(uri.includes('://') ? uri : `https://${uri}`);
    const { hostname, protocol } = url;

    if (protocol !== 'http:' && protocol !== 'https:') return null;
    if (!hostname.includes('.') || hostname.startsWith('[')) return null;
    if (/^[\d.]+$/.test(hostname)) return null;
    if (/\.(local|lan|internal|home\.arpa)$/.test(hostname)) return null;

    return hostname;
  } catch {
    return null;
  }
}

export function parseJson(text: string): VaultData {
  let parsed: unknown;

  try {
    parsed = JSON.parse(text);
  } catch {
    throw new VaultImportError('This file is not valid JSON.');
  }

  if (typeof parsed !== 'object' || parsed === null) {
    throw new VaultImportError('This does not look like a Bitwarden vault export.');
  }

  const { encrypted, folders, items } = parsed as Record<string, unknown>;

  if (encrypted === true) {
    throw new VaultImportError(
      'This export is encrypted. Export your vault as unencrypted .json or .csv instead.'
    );
  }

  if (!Array.isArray(items)) {
    throw new VaultImportError('This does not look like a Bitwarden vault export.');
  }

  return {
    folders: Array.isArray(folders) ? folders : [],
    items: items.filter(item => typeof item === 'object' && item !== null)
  };
}

async function parseCsv(text: string): Promise<VaultData> {
  // Loaded on demand, so JSON imports never download the CSV parser
  const { default: Papa } = await import('papaparse');

  // Values are kept exactly as exported (no trimming: spaces can be part of a password)
  const { data: rows, meta } = Papa.parse<CsvRow>(text, { header: true, skipEmptyLines: true });

  if (!meta.fields?.includes('name')) {
    throw new VaultImportError('This does not look like a Bitwarden vault export.');
  }

  const folderNames = [...new Set(rows.map(row => row.folder))].filter((name): name is string =>
    Boolean(name)
  );
  const folders = folderNames.map(name => ({ id: name, name }));

  const items: VaultItem[] = rows.map(row => ({
    // Empty columns must not become entries, or they print as blank rows
    fields: row.fields ? [{ name: '', value: row.fields }] : [],
    folderId: row.folder,
    name: row.name ?? '',
    notes: row.notes,
    login: {
      username: row.login_username,
      password: row.login_password,
      totp: row.login_totp,
      uris: row.login_uri ? [{ match: null, uri: row.login_uri }] : []
    },
    // Exports have a `type` column ("login" or "note"); only logins are printed
    type: row.type === 'note' ? 2 : 1
  }));

  return { folders, items };
}

/** Reads an exported vault (unencrypted JSON or CSV) into the shape the app prints */
export async function readVault(file: File): Promise<VaultData> {
  const name = file.name.toLowerCase();

  // Some systems (notably Windows) report CSV files with a different MIME type
  const isJson = file.type === 'application/json' || name.endsWith('.json');
  const isCsv = file.type === 'text/csv' || name.endsWith('.csv');

  if (!isJson && !isCsv) {
    throw new VaultImportError('Unsupported file type. Import a Bitwarden .json or .csv export.');
  }

  const text = await file.text();
  const data = isJson ? parseJson(text) : await parseCsv(text);

  if (data.items.length === 0) {
    throw new VaultImportError('This export does not contain any items.');
  }

  return data;
}
