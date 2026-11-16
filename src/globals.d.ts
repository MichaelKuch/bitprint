// Replaced at build time, see `define` in vite.config.ts

/** True in the single-file build (`npm run build:single`), which runs from file:// */
declare const __SINGLE_FILE__: boolean;

/** The demo vault as JSON text in the single-file build, otherwise null (it is fetched) */
declare const __DEMO_VAULT__: string | null;
