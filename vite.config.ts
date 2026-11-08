
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { readFileSync } from 'node:fs';

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'));
// GitHub Pages serves the project at /supreme-guide/. Override with BASE=/ for other hosts.
const base = process.env.BASE ?? '/supreme-guide/';

export default defineConfig({
  base,
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
    __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      injectRegister: false,
      manifest: {
        id: base,
        name: 'Supreme Guide — The Global Travel Quiz Game',
        short_name: 'Supreme Guide',
        description: 'Every Journey Is a Game! Travel quizzes for flights, trains, buses, road trips, walks and cruises — online or offline.',
        lang: 'en',
        dir: 'ltr',
        start_url: base,
        scope: base,
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#0b1f4d',
        theme_color: '#0b1f4d',
        categories: ['games', 'education', 'travel'],
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'icons/maskable-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
          { src: 'icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        cacheId: 'supreme-guide',
        globPatterns: ['**/*.{js,mjs,css,html,ico,png,webp,jpg,svg,woff2,json}'],
        globIgnores: ['**/brand/supreme-guide-logo-original.jpg', '**/brand/og-*.jpg', '**/brand/mascot-round-256.png', '**/icons/*-512.png', 'legacy/**'],
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
        navigateFallback: 'index.html',
        cleanupOutdatedCaches: true,
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.hostname === 'tiles.openfreemap.org',
            handler: 'CacheFirst',
            options: { cacheName: 'sg-map-tiles-v1', expiration: { maxEntries: 4000, maxAgeSeconds: 60 * 60 * 24 * 30 } },
          },
          {
            urlPattern: ({ url }) => url.hostname.endsWith('wikipedia.org'),
            handler: 'NetworkFirst',
            options: { cacheName: 'sg-wiki-api-v1', networkTimeoutSeconds: 6, expiration: { maxEntries: 800, maxAgeSeconds: 60 * 60 * 24 * 60 } },
          },
          {
            urlPattern: ({ url }) => url.hostname === 'upload.wikimedia.org',
            handler: 'CacheFirst',
            options: { cacheName: 'sg-wiki-img-v1', cacheableResponse: { statuses: [0, 200] }, expiration: { maxEntries: 600, maxAgeSeconds: 60 * 60 * 24 * 90 } },
          },
        ],
      },
    }),
  ],
  build: { target: 'es2020', sourcemap: true, chunkSizeWarningLimit: 1100 },
  test: { environment: 'jsdom', include: ['tests/unit/**/*.test.ts'], setupFiles: ['tests/unit/setup.ts'] },
});
