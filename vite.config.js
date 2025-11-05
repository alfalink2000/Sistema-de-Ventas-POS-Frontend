// // vite.config.js - CONFIGURACIÓN ACTUALIZADA PARA i.ibb.co
// import { defineConfig } from "vite";
// import react from "@vitejs/plugin-react";
// import { VitePWA } from "vite-plugin-pwa";

// export default defineConfig({
//   base: "/",
//   plugins: [
//     react(),
//     VitePWA({
//       registerType: "autoUpdate",
//       injectRegister: "auto",

//       // Manifest de PWA
//       manifest: {
//         name: "Kiosko POS - Sistema de Ventas",
//         short_name: "KioskoPOS",
//         description: "Sistema de punto de venta offline/online",
//         theme_color: "#2563eb",
//         background_color: "#ffffff",
//         display: "standalone",
//         orientation: "portrait",
//         scope: "/",
//         start_url: "/",
//         categories: ["business", "productivity"],
//         icons: [
//           {
//             src: "icons/icon-72x72.png",
//             sizes: "72x72",
//             type: "image/png",
//           },
//           {
//             src: "icons/icon-96x96.png",
//             sizes: "96x96",
//             type: "image/png",
//           },
//           {
//             src: "icons/icon-128x128.png",
//             sizes: "128x128",
//             type: "image/png",
//           },
//           {
//             src: "icons/icon-144x144.png",
//             sizes: "144x144",
//             type: "image/png",
//           },
//           {
//             src: "icons/icon-152x152.png",
//             sizes: "152x152",
//             type: "image/png",
//           },
//           {
//             src: "icons/icon-192x192.png",
//             sizes: "192x192",
//             type: "image/png",
//             purpose: "any maskable",
//           },
//           {
//             src: "icons/icon-384x384.png",
//             sizes: "384x384",
//             type: "image/png",
//           },
//           {
//             src: "icons/icon-512x512.png",
//             sizes: "512x512",
//             type: "image/png",
//             purpose: "any maskable",
//           },
//         ],
//       },

//       // Workbox configuration - ACTUALIZADA PARA i.ibb.co
//       workbox: {
//         globPatterns: ["**/*.{js,css,html,ico,png,svg,woff,woff2}"],
//         cleanupOutdatedCaches: true,
//         skipWaiting: true,
//         clientsClaim: true,
//         runtimeCaching: [
//           // ✅ NUEVO: CACHE ESPECÍFICO PARA IMÁGENES DE i.ibb.co
//           {
//             urlPattern:
//               /^https:\/\/i\.ibb\.co\/.*\.(?:png|jpg|jpeg|svg|gif|webp)$/,
//             handler: "CacheFirst",
//             options: {
//               cacheName: "ibbco-images-cache",
//               expiration: {
//                 maxEntries: 300, // Hasta 300 imágenes
//                 maxAgeSeconds: 60 * 24 * 60 * 60, // 60 días
//               },
//               cacheableResponse: {
//                 statuses: [0, 200],
//               },
//             },
//           },
//           {
//             urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
//             handler: "CacheFirst",
//             options: {
//               cacheName: "google-fonts-cache",
//               expiration: {
//                 maxEntries: 10,
//                 maxAgeSeconds: 60 * 60 * 24 * 365,
//               },
//               cacheableResponse: {
//                 statuses: [0, 200],
//               },
//             },
//           },
//         ],
//       },

//       // Desarrollo
//       devOptions: {
//         enabled: true,
//         type: "module",
//         navigateFallback: "index.html",
//       },
//     }),
//   ],
//   server: {
//     port: 5173,
//     host: true,
//   },
// });
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  base: "/",
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      injectRegister: "auto",

      // Manifest de PWA
      manifest: {
        name: "Kiosko POS - Sistema de Ventas",
        short_name: "KioskoPOS",
        description: "Sistema de punto de venta offline/online",
        theme_color: "#2563eb",
        background_color: "#ffffff",
        display: "standalone",
        orientation: "portrait",
        scope: "/",
        start_url: "/",
        categories: ["business", "productivity"],
        icons: [
          {
            src: "icons/icon-72x72.png",
            sizes: "72x72",
            type: "image/png",
          },
          {
            src: "icons/icon-96x96.png",
            sizes: "96x96",
            type: "image/png",
          },
          {
            src: "icons/icon-128x128.png",
            sizes: "128x128",
            type: "image/png",
          },
          {
            src: "icons/icon-144x144.png",
            sizes: "144x144",
            type: "image/png",
          },
          {
            src: "icons/icon-152x152.png",
            sizes: "152x152",
            type: "image/png",
          },
          {
            src: "icons/icon-192x192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any maskable",
          },
          {
            src: "icons/icon-384x384.png",
            sizes: "384x384",
            type: "image/png",
          },
          {
            src: "icons/icon-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any maskable",
          },
        ],
      },

      // Workbox configuration - CONFIGURACIÓN MEJORADA
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff,woff2,json}"],
        globIgnores: ["**/sw*.js"],
        cleanupOutdatedCaches: true,
        skipWaiting: true,
        clientsClaim: true,

        // ✅ NUEVO: Precaching mejorado para offline
        navigateFallback: "/index.html",
        navigateFallbackAllowlist: [/^(?!\/__).*/],

        // ✅ ESTRATEGIAS DE CACHE MEJORADAS
        runtimeCaching: [
          // 1. Recursos estáticos de la app - Cache First
          {
            urlPattern: /\.(?:js|css|html|json)$/,
            handler: "StaleWhileRevalidate",
            options: {
              cacheName: "static-resources",
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 * 30, // 30 días
              },
            },
          },

          // 2. Imágenes de la app - Cache First
          {
            urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp|ico)$/,
            handler: "CacheFirst",
            options: {
              cacheName: "image-cache",
              expiration: {
                maxEntries: 200,
                maxAgeSeconds: 60 * 60 * 24 * 60, // 60 días
              },
            },
          },

          // 3. Imágenes externas de i.ibb.co - Cache First
          {
            urlPattern:
              /^https:\/\/i\.ibb\.co\/.*\.(?:png|jpg|jpeg|svg|gif|webp)$/,
            handler: "CacheFirst",
            options: {
              cacheName: "ibbco-images-cache",
              expiration: {
                maxEntries: 300,
                maxAgeSeconds: 60 * 24 * 60 * 60, // 60 días
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },

          // 4. Fuentes de Google - Cache First
          {
            urlPattern: /^https:\/\/fonts\.(?:gstatic|googleapis)\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "google-fonts-cache",
              expiration: {
                maxEntries: 20,
                maxAgeSeconds: 60 * 60 * 24 * 365, // 1 año
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },

          // 5. ✅ NUEVO: API routes - Network First para datos frescos
          {
            urlPattern: /\/api\/.*/i,
            handler: "NetworkFirst",
            options: {
              cacheName: "api-cache",
              networkTimeoutSeconds: 3,
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24, // 24 horas
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },

          // 6. ✅ NUEVO: Rutas de autenticación - Network Only
          {
            urlPattern: /\/auth\/.*/i,
            handler: "NetworkFirst",
            options: {
              cacheName: "auth-cache",
              networkTimeoutSeconds: 3,
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60, // 1 hora
              },
            },
          },
        ],
      },

      // Desarrollo
      devOptions: {
        enabled: true,
        type: "module",
        navigateFallback: "index.html",
      },
    }),
  ],
  server: {
    port: 5173,
    host: true,
  },
});
