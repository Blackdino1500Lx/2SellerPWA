import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/*.png', 'fonts/*.ttf'],
      manifest: false, // usamos public/manifest.webmanifest
      workbox: {
        globPatterns: ['**/*.{js,css,html,ttf,png,svg,webmanifest}'],
        runtimeCaching: [
          {
            // Supabase: network-first, nunca cachear respuestas de auth
            urlPattern: /^https:\/\/.*supabase.*\/auth\/.*/i,
            handler: 'NetworkOnly'
          },
          {
            // Imágenes remotas (logos, etc): cache-first
            urlPattern: /\.(?:png|jpg|jpeg|svg|webp)$/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'images',
              expiration: { maxEntries: 60, maxAgeSeconds: 60 * 60 * 24 * 30 }
            }
          }
        ]
      }
    })
  ],
  server: {
    host: true,
    port: 5173
  }
})