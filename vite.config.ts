import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import svgr from 'vite-plugin-svgr';

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Empty prefix = load every variable from .env files, for use in this file only.
  // Nothing is exposed to client code; only VITE_* variables are (via import.meta.env).
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [
      react(),
      tailwindcss(),
      svgr() // import Icon from "./icon.svg?react"
    ],

    // Public base path, e.g. PUBLIC_URL=/bitprint when served from a subpath
    base: env.PUBLIC_URL?.replace(/\/$/, '') || '/',

    server: {
      host: env.HOST || true, // true = listen on 0.0.0.0 (needed in Docker)
      port: Number(env.PORT) || 3000,
      open: env.BROWSER !== 'none'
    },

    build: {
      outDir: env.BUILD_PATH || 'dist',
      sourcemap: env.GENERATE_SOURCEMAP === 'true'
    }
  };
});
