import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, Plugin} from 'vite';

/**
 * Custom Vite plugin to eliminate render-blocking CSS in production.
 * Transforms `<link rel="stylesheet" href="...">` into `<link rel="preload" as="style" onload="...">`
 * with `<noscript>` fallback, preventing ~400ms rendering stalls detected by PageSpeed Insights.
 */
function asyncCssPlugin(): Plugin {
  return {
    name: 'vite-plugin-async-css',
    apply: 'build',
    enforce: 'post',
    transformIndexHtml(html: string) {
      const earlyHints: string[] = [];

      // Discover entry module script for early <link rel="modulepreload"> at top of <head>
      const entryScriptMatch = html.match(/<script\s+type="module"[^>]*src="([^"]+?\.js)"[^>]*>/i);
      if (entryScriptMatch && entryScriptMatch[1]) {
        earlyHints.push(`<link rel="modulepreload" href="${entryScriptMatch[1]}" crossorigin>`);
      }

      let updatedHtml = html.replace(
        /<link\s+([^>]*?)rel="stylesheet"([^>]*?)href="([^"]+?\.css)"([^>]*?)>\s*/gi,
        (match, p1, p2, href, p4) => {
          if (match.includes('media=') || match.includes('onload=')) return match;
          const cleanAttrs = `${p1} ${p2} ${p4}`.replace(/\s+/g, ' ').trim();
          earlyHints.push(
            `<link rel="preload" href="${href}" as="style" onload="this.onload=null;this.rel='stylesheet'" ${cleanAttrs}>\n    <noscript><link rel="stylesheet" href="${href}" ${cleanAttrs}></noscript>`
          );
          return '';
        }
      );

      if (earlyHints.length > 0) {
        const block = earlyHints.join('\n    ');
        if (updatedHtml.includes('<meta name="viewport"')) {
          updatedHtml = updatedHtml.replace(
            /(<meta name="viewport"[^>]*>)/i,
            `$1\n    ${block}`
          );
        } else if (updatedHtml.includes('<script type="module"')) {
          updatedHtml = updatedHtml.replace(
            '<script type="module"',
            `${block}\n    <script type="module"`
          );
        } else {
          updatedHtml = updatedHtml.replace('</head>', `    ${block}\n  </head>`);
        }
      }

      return updatedHtml;
    },
  };
}

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss(), asyncCssPlugin()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    build: {
      cssCodeSplit: true,
      chunkSizeWarningLimit: 1000,
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      allowedHosts: true as const,
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
