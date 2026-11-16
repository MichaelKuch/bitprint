# BitPrint: Print your Bitwarden vault

**BitPrint** is a React app which turns an [exported Bitwarden vault](https://help.bitwarden.com/article/export-your-data/) into a tabular layout designed to be printed. Processing is handled within the browser.

This was designed primarily as a proof of concept, and using it with your personal data is **not recommended**. Be cautious when handling your exported vault data, and **do not share it with anyone**.

In short, **absolutely do not** import your personal vault on the demo site. Instead, clone this repository and run the application locally.

![Screenshot](.github/screenshot.png)

## Requirements

- Node.js >=24
- npm 11

## Quick Start

Install [Node.js](https://nodejs.org/en/download/package-manager) if you don't have it already.

```
$ npm install
$ npm start
```

Navigate to http://localhost:3000.

### How do I get my vault export?

Follow the instructions at [Export Vault Data – Bitwarden Help Center](https://help.bitwarden.com/article/export-your-data/). Download the CSV, the unencrypted JSON or the password protected JSON format. A password protected export is decrypted in the browser after you enter its password. "Account restricted" encrypted exports cannot be read, because their key never leaves Bitwarden.

This file contains all of your passwords and secrets, and could be jeopardized by a compromised machine, network, or printer. Take care to delete it when finished.

## Development

**Start development server**

- **Client:** http://localhost:3000

Commands:

```
npm start            # dev server on http://localhost:3000 (alias: npm run dev)
npm run build        # tsc --noEmit, then vite build → dist/
npm run build:single # same, as one self-contained dist-single/index.html
npm run typecheck    # type-check only
npm run serve        # preview the production build
npm run format       # prettier over css/js/json/md/ts/tsx

```

## Environment Variables

Located in the [.env](.env) file. Follow [.env.example](.env.example) as an example.

## Production

**Build Client**

```
$ npm run build
```

**Serve Client**

```
$ npm run serve
```

**Single file (no server)**

```
$ npm run build:single
```

Creates `dist-single/index.html` with the script, styles, fonts and the demo vault built in. Open it straight from disk (double-click, `file://`) in any current browser; it needs no web server and can be copied to another machine as is. Its Content-Security-Policy only allows that one script and stylesheet, plus favicon images from `icons.bitwarden.net` (switch off "logos" to avoid those).

# License

MIT
