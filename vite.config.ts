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

          // TipTap editor
          if (id.includes('node_modules/@tiptap') || id.includes('node_modules/prosemirror')) {
            return 'vendor-editor';
          }

          // Charts and animation
          if (id.includes('node_modules/recharts') || id.includes('node_modules/d3-')) {
            return 'vendor-charts';
          }
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

          // Icons
          if (id.includes('node_modules/lucide-react')) {
            return 'vendor-icons';
          }

          // Date utilities
          if (id.includes('node_modules/date-fns')) {
            return 'vendor-date';
          }
        },
      },
    },
    chunkSizeWarningLimit: 600,
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
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024, // 5MB limit
        // Disable navigateFallback to prevent SW interference
        navigateFallback: undefined,
        // Disable navigation preload to prevent race conditions
        navigationPreload: false,
        // Force cache invalidation by using a unique cache name prefix
        cacheId: 'kreoon-v2',
        // Clean up old caches
        cleanupOutdatedCaches: true,
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/.*\.supabase\.co\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'supabase-cache-v2',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 // 24 hours
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            // HLS manifests - cache for 1 hour (faster subsequent loads)
            urlPattern: /\.m3u8$/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'hls-manifest-cache-v1',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 // 1 hour
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
            // Video content from Bunny CDN
            urlPattern: /^https:\/\/.*\.b-cdn\.net\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'bunny-video-cache-v1',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24 * 30 // 30 days
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
