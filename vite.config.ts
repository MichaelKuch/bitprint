import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import svgr from 'vite-plugin-svgr';

// Vault data must never leave the browser. This makes the browser enforce it for
// the production build: the only allowed third-party requests are favicon images.
// (Build only: the dev server needs inline scripts and a websocket for HMR.)
const contentSecurityPolicy = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self'",
  "img-src 'self' data: https://icons.bitwarden.net",
  "font-src 'self' data:",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'none'"
].join('; ');

const csp = (): Plugin => ({
  name: 'bitprint-csp',
  apply: 'build',
  transformIndexHtml: () => [
    {
      tag: 'meta',
      attrs: { 'http-equiv': 'Content-Security-Policy', content: contentSecurityPolicy },
      injectTo: 'head-prepend'
    }
  ]
});

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Empty prefix = load every variable from .env files, for use in this file only.
  // Nothing is exposed to client code; only VITE_* variables are (via import.meta.env).
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [
      react(),
      tailwindcss(),
      svgr(), // import Icon from "./icon.svg?react"
      csp()
    ],

    // Public base path, e.g. PUBLIC_URL=/bitprint when served from a subpath
    base: env.PUBLIC_URL?.replace(/\/$/, '') || '/',

    server: {
      // Local only by default, since real vault exports get loaded here.
      // Set HOST=0.0.0.0 to listen on all interfaces (needed in Docker).
      host: env.HOST || 'localhost',
      port: Number(env.PORT) || 3000,
      open: env.BROWSER !== 'none'
    },

    build: {
      outDir: env.BUILD_PATH || 'dist',
      sourcemap: env.GENERATE_SOURCEMAP === 'true'
    }
  };
});
