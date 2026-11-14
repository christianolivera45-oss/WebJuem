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
      const extractedLinks: string[] = [];
      let updatedHtml = html.replace(
        /<link\s+([^>]*?)rel="stylesheet"([^>]*?)href="([^"]+?\.css)"([^>]*?)>\s*/gi,
        (match, p1, p2, href, p4) => {
          if (match.includes('media=') || match.includes('onload=')) return match;
          const cleanAttrs = `${p1} ${p2} ${p4}`.replace(/\s+/g, ' ').trim();
          extractedLinks.push(
            `<link rel="preload" href="${href}" as="style" onload="this.onload=null;this.rel='stylesheet'" ${cleanAttrs}>\n    <noscript><link rel="stylesheet" href="${href}" ${cleanAttrs}></noscript>`
          );
          return '';
        }
      );

      if (extractedLinks.length > 0) {
        const block = extractedLinks.join('\n    ');
        if (updatedHtml.includes('<script type="module"')) {
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
