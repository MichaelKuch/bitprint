# BitPrint: Print your Bitwarden vault

**BitPrint** is a React app which turns an [exported Bitwarden vault](https://help.bitwarden.com/article/export-your-data/) into a tabular layout designed to be printed. Processing is handled within the browser.

This was designed primarily as a proof of concept, and using it with your personal data is **not recommended**. Be cautious when handling your exported vault data, and **do not share it with anyone**.

In short, **absolutely do not** import your personal vault on the demo site. Instead, clone this repository and run the application locally.

![Screenshot](.github/screenshot.png)

## Requirements

- Node.js >=22.12.0
- npm 11

## Quick Start

Install [Node.js](https://nodejs.org/en/download/package-manager) if you don't have it already.

```
$ npm install
$ npm start
```

Navigate to http://localhost:3000.

### How do I get my vault export?

Follow the instructions at [Export Vault Data – Bitwarden Help Center](https://help.bitwarden.com/article/export-your-data/). Download either the CSV or unencrypted JSON format.

This file contains all of your passwords and secrets, and could be jeopardized by a compromised machine, network, or printer. Take care to delete it when finished.

## Development

**Start development server**

- **Client:** http://localhost:3000

Commands:

```
npm start            # dev server on http://localhost:3000 (alias: npm run dev)
npm run build        # tsc --noEmit, then vite build → dist/
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

# License

MIT
