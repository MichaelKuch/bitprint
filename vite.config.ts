import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
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

const sha256 = (text: string) => `'sha256-${createHash('sha256').update(text).digest('base64')}'`;

/**
 * `npm run build:single`: folds the script and the stylesheet into index.html, so
 * the result is one file that works when opened straight from disk (file://),
 * where browsers refuse to load module scripts from separate files.
 * Images and fonts are already inlined as data: URIs by `assetsInlineLimit`.
 *
 * The CSP is stricter than the hosted one: nothing may be loaded at all except
 * this exact script and stylesheet (allowed by hash) and favicon images.
 */
const singleFile = (): Plugin => ({
  name: 'bitprint-single-file',
  apply: 'build',
  enforce: 'post',
  generateBundle(_options, bundle) {
    const page = bundle['index.html'];
    if (page?.type !== 'asset') this.error('index.html is missing from the bundle');

    // `</script` or `<!--` inside the code would end the inline script early
    const escape = (code: string) =>
      code.replace(/<\/(script)/gi, '<\\/$1').replace(/<!--/g, '<\\!--');

    let html = String(page.source);
    const scripts: string[] = [];
    const styles: string[] = [];

    for (const [fileName, file] of Object.entries(bundle)) {
      if (file === page) continue;

      const tag =
        file.type === 'chunk'
          ? new RegExp(`<script[^>]*src="[^"]*${fileName}"[^>]*></script>`)
          : fileName.endsWith('.css')
            ? new RegExp(`<link[^>]*href="[^"]*${fileName}"[^>]*>`)
            : null;

      if (!tag || !tag.test(html)) {
        this.error(`${fileName} cannot be inlined into index.html`);
      }

      // Function replacers, since the code can contain `$&` and the like
      if (file.type === 'chunk') {
        const code = escape(file.code);
        scripts.push(code);
        html = html.replace(tag, () => `<script type="module">${code}</script>`);
      } else {
        // Every browser that can run this page reads woff2, so the woff copies
        // of the fonts are dead weight (about a third of the file)
        const css = String(file.source).replace(
          /,\s*url\(data:font\/woff;base64,[^)]*\)\s*format\("woff"\)/g,
          ''
        );
        styles.push(css);
        html = html.replace(tag, () => `<style>${css}</style>`);
      }

      delete bundle[fileName];
    }

    // These point at separate files, which a single-file build does not have
    html = html.replace(/\s*<link rel="(icon|apple-touch-icon|manifest)"[^>]*>/g, '');

    const policy = [
      "default-src 'none'",
      `script-src ${scripts.map(sha256).join(' ')}`,
      `style-src ${styles.map(sha256).join(' ')}`,
      'img-src data: https://icons.bitwarden.net',
      'font-src data:',
      "connect-src 'none'",
      "object-src 'none'",
      "base-uri 'none'",
      "form-action 'none'"
    ].join('; ');

    page.source = html.replace(
      '<head>',
      () => `<head>\n    <meta http-equiv="Content-Security-Policy" content="${policy}" />`
    );
  }
});

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // `vite build --mode single` (npm run build:single), see singleFile() above
  const single = mode === 'single';

  // Empty prefix = load every variable from .env files, for use in this file only.
  // Nothing is exposed to client code; only VITE_* variables are (via import.meta.env).
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [
      react(),
      tailwindcss(),
      svgr(), // import Icon from "./icon.svg?react"
      single ? singleFile() : csp()
    ],

    // Public base path, e.g. PUBLIC_URL=/bitprint when served from a subpath
    base: single ? './' : env.PUBLIC_URL?.replace(/\/$/, '') || '/',

    define: {
      __SINGLE_FILE__: JSON.stringify(single),
      // A page opened from disk cannot fetch demo.json, so it is built in instead
      __DEMO_VAULT__: single ? JSON.stringify(readFileSync('public/demo.json', 'utf8')) : 'null'
    },

    server: {
      // Local only by default, since real vault exports get loaded here.
      // Set HOST=0.0.0.0 to listen on all interfaces (needed in Docker).
      host: env.HOST || 'localhost',
      port: Number(env.PORT) || 3000,
      open: env.BROWSER !== 'none'
    },

    build: single
      ? {
          outDir: 'dist-single',
          // Everything has to end up inside index.html
          assetsInlineLimit: () => true,
          cssCodeSplit: false,
          modulePreload: false,
          copyPublicDir: false,
          rolldownOptions: { output: { codeSplitting: false } }
        }
      : {
          outDir: env.BUILD_PATH || 'dist',
          sourcemap: env.GENERATE_SOURCEMAP === 'true'
        }
  };
});
