import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { VitePWA } from "vite-plugin-pwa";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  esbuild: {
    drop: mode === 'production' ? ['console', 'debugger'] : [],
  },
  build: {
    rollupOptions: {
      output: {
        // Use function to avoid circular dependencies and ensure proper load order
        manualChunks(id) {
          // React must be in its own chunk and load first - don't mix with anything else
          if (id.includes('node_modules/react-dom')) {
            return 'vendor-react-dom';
          }
          if (id.includes('node_modules/react/') || id.includes('node_modules/scheduler')) {
            return 'vendor-react';
          }

          // React Router separate from React core
          if (id.includes('node_modules/react-router') || id.includes('node_modules/@remix-run')) {
            return 'vendor-router';
          }

          // Radix UI components - separate chunk, depends on React
          if (id.includes('node_modules/@radix-ui')) {
            return 'vendor-radix';
          }

          // Supabase - no React dependency
          if (id.includes('node_modules/@supabase')) {
            return 'vendor-supabase';
          }

          // TanStack Query - depends on React
          if (id.includes('node_modules/@tanstack')) {
            return 'vendor-query';
          }

          // TipTap editor — solo se usa en rutas de edición, nunca en marketplace
          if (id.includes('node_modules/@tiptap') || id.includes('node_modules/prosemirror')) {
            return 'vendor-editor';
          }

          // Charts — separados en su propio chunk asíncrono.
          // recharts + d3 suman ~200KB y NO se usan en el marketplace principal.
          // Al estar en un chunk propio, solo se descargan cuando se navega
          // a dashboards/analytics que los necesitan.
          if (id.includes('node_modules/recharts') || id.includes('node_modules/d3-')) {
            return 'vendor-charts';
          }

          // Framer Motion — animaciones opcionales, chunk propio para defer
          if (id.includes('node_modules/framer-motion')) {
            return 'vendor-motion';
          }

          // Form handling
          if (id.includes('node_modules/react-hook-form') || id.includes('node_modules/@hookform')) {
            return 'vendor-forms';
          }
          if (id.includes('node_modules/zod')) {
            return 'vendor-zod';
          }

          // Icons — lucide-react es grande (~1MB sin treeshake).
          // Vite/SWC hace tree-shaking por default, pero aislar el chunk
          // evita que cambios en iconos invaliden otros vendor chunks.
          if (id.includes('node_modules/lucide-react')) {
            return 'vendor-icons';
          }

          // Date utilities
          if (id.includes('node_modules/date-fns')) {
            return 'vendor-date';
          }

          // HLS.js - large video streaming library (522KB), loaded dynamically
          if (id.includes('node_modules/hls.js')) {
            return 'hls';
          }

          // next-themes — pequeño pero se puede aislar del bundle principal
          if (id.includes('node_modules/next-themes')) {
            return 'vendor-themes';
          }
        },
      },
    },
    // Reducir el umbral de advertencia — queremos que Rollup avise antes
    // para detectar chunks que crecen sin control.
    chunkSizeWarningLimit: 500,
  },
  plugins: [
    react(),
    VitePWA({
      // Avoid "auto reload" on tab/window focus when a new service worker is detected.
      // We'll prompt the user instead (prevents disruptive full-page refreshes).
      registerType: 'prompt',
      includeAssets: ['favicon.ico', 'favicon.png', 'robots.txt'],
      manifest: {
        name: 'KREOON',
        short_name: 'KREOON',
        description: 'El sistema operativo creativo. Gestiona creadores, contenido, proyectos y resultados.',
        theme_color: '#7700b8',
        background_color: '#0D0D0D',
        display: 'standalone',
        orientation: 'portrait-primary',
        start_url: '/',
        scope: '/',
        icons: [
          {
            src: '/pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any maskable'
          },
          {
            src: '/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      },
      workbox: {
        // CRITICAL: Prevent any automatic takeover that could cause reloads
        skipWaiting: false,
        clientsClaim: false,
        // PERFORMANCE FIX: Only precache the HTML shell + core vendor chunks (~15 files)
        // Previously: **/*.{js,css,html,...} = 202 files (~10MB) downloaded on EVERY deploy
        // Now: only essential entry files; lazy chunks are cached on-demand via runtimeCaching
        globPatterns: [
          'index.html',
          'assets/index-*.css',
          'assets/vendor-react-*.js',
          'assets/vendor-router-*.js',
          'assets/vendor-supabase-*.js',
          'assets/index-*.js',
        ],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024, // 5MB limit
        // Disable navigateFallback to prevent SW interference
        navigateFallback: undefined,
        // Disable navigation preload to prevent race conditions
        navigationPreload: false,
        // Force cache invalidation by using a unique cache name prefix
        // v4: Fixed role detection in MainLayout, Sidebar, MobileNav (2026-04-06)
        cacheId: 'kreoon-v4',
        // Clean up old caches (including v2 bloated ones)
        cleanupOutdatedCaches: true,
        runtimeCaching: [
          {
            // Supabase Edge Functions - ALWAYS go to network, never cache
            // This prevents 404 errors from cached responses
            urlPattern: /^https:\/\/.*\.supabase\.co\/functions\/v1\/.*/i,
            handler: 'NetworkOnly',
            options: {
              cacheName: 'supabase-functions',
            }
          },
          {
            // Lazy-loaded JS/CSS chunks: cache on first visit, serve from cache next time
            urlPattern: /\/assets\/.*\.(?:js|css)$/i,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'app-chunks-v2',
              expiration: {
                maxEntries: 150,
                maxAgeSeconds: 60 * 60 * 24 * 7 // 7 days
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            // Supabase REST API reads (GET only – POST/PATCH are ignored by Workbox)
            // StaleWhileRevalidate: serve cached data INSTANTLY, refresh in background
            urlPattern: /^https:\/\/.*\.supabase\.co\/rest\/v1\/.*/i,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'supabase-rest-v1',
              expiration: {
                maxEntries: 200,
                maxAgeSeconds: 60 * 60 // 1 hour
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            // Supabase Storage (avatars, uploads) – rarely changes, cache aggressively
            urlPattern: /^https:\/\/.*\.supabase\.co\/storage\/v1\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'supabase-storage-v1',
              expiration: {
                maxEntries: 150,
                maxAgeSeconds: 60 * 60 * 24 * 7 // 7 days
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            // Video thumbnails from Bunny CDN - long cache
            urlPattern: /^https:\/\/.*\.b-cdn\.net\/.*thumbnail/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'bunny-thumbnail-cache-v1',
              expiration: {
                maxEntries: 200,
                maxAgeSeconds: 60 * 60 * 24 * 7 // 7 days
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            urlPattern: /\.(?:woff2?|ttf|eot)$/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'fonts-cache-v1',
              expiration: {
                maxEntries: 30,
                maxAgeSeconds: 60 * 60 * 24 * 365 // 1 year
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          }
        ]
      },
      // Disable automatic SW injection - we control it manually
      injectRegister: false,
      devOptions: {
        // ALWAYS disable SW in development to prevent reload issues during testing
        enabled: false
      }
    })
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
