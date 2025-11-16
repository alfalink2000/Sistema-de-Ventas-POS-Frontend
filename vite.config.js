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

//       // ✅ MANIFEST
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

//       // ✅ WORKBOX CONFIGURACIÓN MEJORADA - SINCRONIZADA CON ImageCacheService
//       workbox: {
//         globPatterns: ["**/*.{js,css,html,ico,png,svg,woff,woff2,json}"],
//         globIgnores: ["**/sw*.js", "**/dev-sw.js"],
//         cleanupOutdatedCaches: true,
//         skipWaiting: true,
//         clientsClaim: true,

//         // ✅ PRECACHING AGRESIVO PARA IMÁGENES
//         navigateFallback: "/index.html",
//         navigateFallbackAllowlist: [/^(?!\/__).*/],

//         // ✅ ESTRATEGIAS MEJORADAS - CACHE COHERENTE CON ImageCacheService
//         runtimeCaching: [
//           // 1. IMÁGENES EXTERNAS DE IMGBB - Mismo nombre que ImageCacheService
//           {
//             urlPattern: /^https:\/\/i\.ibb\.co\/.*/i,
//             handler: "CacheFirst",
//             options: {
//               cacheName: "imgbb-images-v2", // ✅ Mismo nombre que ImageCacheService
//               expiration: {
//                 maxEntries: 2000,
//                 maxAgeSeconds: 60 * 60 * 24 * 365, // 1 año
//               },
//               cacheableResponse: {
//                 statuses: [0, 200],
//               },
//               // ✅ CONFIGURACIÓN ADICIONAL PARA MEJOR COMPATIBILIDAD
//               fetchOptions: {
//                 mode: "cors",
//                 credentials: "omit",
//               },
//             },
//           },

//           // 2. IMÁGENES LOCALES - Cache agresivo
//           {
//             urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp|ico)$/,
//             handler: "CacheFirst",
//             options: {
//               cacheName: "static-images-v2",
//               expiration: {
//                 maxEntries: 1000,
//                 maxAgeSeconds: 60 * 60 * 24 * 365,
//               },
//             },
//           },

//           // 3. API - Network first con fallback
//           {
//             urlPattern: /\/api\/.*/i,
//             handler: "NetworkFirst",
//             options: {
//               cacheName: "api-cache-v2",
//               networkTimeoutSeconds: 3,
//               expiration: {
//                 maxEntries: 100,
//                 maxAgeSeconds: 60 * 60 * 24,
//               },
//               cacheableResponse: {
//                 statuses: [0, 200, 404],
//               },
//             },
//           },

//           // 4. ESTÁTICOS - Stale while revalidate
//           {
//             urlPattern: /\.(?:js|css|html|json)$/,
//             handler: "StaleWhileRevalidate",
//             options: {
//               cacheName: "static-assets-v2",
//               expiration: {
//                 maxEntries: 200,
//                 maxAgeSeconds: 60 * 60 * 24 * 365,
//               },
//             },
//           },

//           // ✅ NUEVO: CACHE PARA RECURSOS DE LA APLICACIÓN
//           {
//             urlPattern: /\/src\/.*\.(js|css)$/,
//             handler: "StaleWhileRevalidate",
//             options: {
//               cacheName: "app-code-v1",
//               expiration: {
//                 maxEntries: 100,
//                 maxAgeSeconds: 60 * 60 * 24 * 7, // 1 semana
//               },
//             },
//           },
//         ],

//         // ✅ CONFIGURACIÓN ADICIONAL PARA MEJORAR EL CACHE
//         additionalManifestEntries: [
//           {
//             url: "/",
//             revision: Date.now().toString(),
//           },
//         ],
//       },

//       // ✅ CONFIGURACIÓN DESARROLLO MEJORADA
//       devOptions: {
//         enabled: true,
//         type: "module",
//         navigateFallback: "index.html",
//         suppressWarnings: false, // Ver warnings para debugging
//       },

//       // ✅ QUITAR injectManifest si no tienes sw.js personalizado
//       // strategies: 'injectManifest' // ← REMOVER ESTA LÍNEA
//     }),
//   ],
//   server: {
//     port: 5173,
//     host: true,
//   },

//   // ✅ CONFIGURACIÓN ADICIONAL PARA PWA
//   build: {
//     sourcemap: true,
//     rollupOptions: {
//       output: {
//         manualChunks: {
//           vendor: ["react", "react-dom"],
//           pwa: ["workbox-window", "workbox-core"],
//         },
//       },
//     },
//   },
// });
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  base: "/",
  plugins: [
    react({
      // ✅ QUITAR jsxRuntime: "classic" - Puede causar problemas
      // Vite React plugin funciona mejor con el runtime automático
    }),
    VitePWA({
      registerType: "autoUpdate",
      injectRegister: "auto",

      // ✅ MANIFEST MEJORADO
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

      // ✅ WORKBOX CONFIGURACIÓN SIMPLIFICADA
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff,woff2,json}"],
        globIgnores: ["**/sw*.js", "**/dev-sw.js"],
        cleanupOutdatedCaches: true,
        skipWaiting: true,
        clientsClaim: true,
        navigateFallback: "/index.html",
        navigateFallbackAllowlist: [/^(?!\/__).*/],

        runtimeCaching: [
          // CSS con máxima prioridad
          {
            urlPattern: /\.css$/,
            handler: "CacheFirst",
            options: {
              cacheName: "css-cache-v4",
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24 * 365,
              },
            },
          },
          // JavaScript
          {
            urlPattern: /\.js$/,
            handler: "StaleWhileRevalidate",
            options: {
              cacheName: "js-cache-v4",
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 * 30,
              },
            },
          },
          // Imágenes
          {
            urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp|ico)$/,
            handler: "CacheFirst",
            options: {
              cacheName: "images-cache-v4",
              expiration: {
                maxEntries: 200,
                maxAgeSeconds: 60 * 60 * 24 * 365,
              },
            },
          },
        ],
      },

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

  // ✅ BUILD OPTIMIZADO PARA FIREFOX
  build: {
    target: "es2015",
    minify: "terser",
    cssCodeSplit: true, // ✅ CAMBIAR A true - Mejor para caching
    sourcemap: false,

    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ["react", "react-dom"],
          redux: ["react-redux", "@reduxjs/toolkit"],
        },
        chunkFileNames: "assets/[name]-[hash].js",
        entryFileNames: "assets/[name]-[hash].js",
        assetFileNames: (assetInfo) => {
          if (assetInfo.name?.endsWith(".css")) {
            return "assets/[name]-[hash].css";
          }
          return "assets/[name]-[hash][extname]";
        },
      },
    },

    terserOptions: {
      compress: {
        drop_console: true,
      },
    },
  },

  optimizeDeps: {
    include: ["react", "react-dom", "react-redux"],
    esbuildOptions: {
      target: "es2015",
    },
  },
});
