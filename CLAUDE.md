# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

BitPrint turns an exported Bitwarden vault (unencrypted JSON or CSV) into a printable layout. Everything runs client-side in the browser; vault data must never leave it. The only outbound requests are favicon images from `icons.bitwarden.net`, and only for public web hostnames (`getIconHostname` in `src/vault.ts`). Production builds enforce this with a Content-Security-Policy meta tag injected by the `csp` plugin in `vite.config.ts`; a new external resource must be added there or it will be blocked. Fonts are self-hosted via `@fontsource` (imported in `src/index.css`).

Stack: React 19 + TypeScript (strict), Vite 8, Tailwind CSS v4 via `@tailwindcss/vite`. Node version in `.nvmrc` (engines: `>=22.12.0`).

## Commands

```
npm start            # dev server on http://localhost:3000 (alias: npm run dev)
npm run build        # tsc --noEmit, then vite build → dist/
npm run typecheck    # type-check only
npm run serve        # preview the production build
npm run format       # prettier over css/js/json/md/ts/tsx
```

There is no test suite or linter; `npm run typecheck` is the correctness check. Append `?demo` to the URL to auto-load `public/demo.json` instead of importing a file.

Prettier style: single quotes, no trailing commas, `arrowParens: avoid`, 100-char lines.

## Architecture

- **State lives in `App` (class component) and is shared via a single React Context** (`src/context/index.ts`). `App` passes its whole state plus a `setContext` function (a thin `setState` wrapper) as the Provider value. Components are class components (except `Logo`) that read it with `static contextType = Context` and `declare context: ContextType<typeof Context>`.
- `initialContext` intentionally omits `setContext`, so `Header.resetState` can reset with `setContext({ ...initialContext })` without clobbering the real setter. Keep it that way when adding state.
- **Import/normalization happens in `src/vault.ts`** (`readVault`, called by `Header.readFile`): JSON is validated and used as-is (with `folders` defaulted to `[]`); CSV rows are mapped into the same `VaultData` shape (folder names become both folder id and name, the `type` column maps to `type: 1` logins or `type: 2` notes, empty `fields`/`login_uri` columns become empty arrays). Anything new to print must be handled in both paths. Failures throw `VaultImportError`, whose message lands in the `error` state and is shown by `App`.
- **`Print` renders the output**: only `type === 1` (login) items are shown, filtered by `foldersToPrint` whenever the vault has folders. Unfiled items use the pseudo folder id `NO_FOLDER`; `folderOptions(data)` is the list of toggles (and the default `foldersToPrint`), so use it instead of `data.folders` for filtering UI. The QR code encodes only the fields that are switched on (`Print.getQrValue`) and is wrapped in the `QrCode` error boundary because oversized payloads throw. Which fields appear is driven by the `dataToPrint` map (keys like `username`, `password`, `totp`, `uris`, `notes`, `fields`, `logos`, `qrcodes`); the Header toggles and the Print summary both iterate its keys, so adding a key there adds a toggle automatically.
- Print-specific styling lives in `src/index.css` (`@media print`, `.no-print` hides UI chrome). Tailwind v4 theme overrides are in the `@theme` block there (no `tailwind.config.js`); element selectors go in `@layer base` so utilities still win.
- SVGs are imported as React components with `?react` (vite-plugin-svgr).
- `vite.config.ts` reads `.env` (HOST, PORT, BROWSER, PUBLIC_URL, BUILD_PATH, GENERATE_SOURCEMAP) for build/server config only; nothing is exposed to client code. Use `import.meta.env.BASE_URL` for asset paths so subpath deploys work.
