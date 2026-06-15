import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import path from 'path'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  logLevel: 'error',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg'],
      manifest: {
        name: 'Koyoo Taxi',
        short_name: 'Koyoo',
        description: 'Your premium ride-hailing experience in Nairobi',
        theme_color: '#0d1117',
        background_color: '#0d1117',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        icons: [
          { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
          { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'maskable' },
        ],
        categories: ['transportation', 'travel', 'navigation'],
        lang: 'en',
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,jpg,jpeg,avif,webp}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/unpkg\.com\/leaflet.*/i,
            handler: 'CacheFirst',
            options: { cacheName: 'leaflet-cache', expiration: { maxEntries: 10, maxAgeSeconds: 86400 * 30 } },
          },
          {
            urlPattern: /^https:\/\/js\.paystack\.co\/.*/i,
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'paystack-cache', expiration: { maxEntries: 5, maxAgeSeconds: 86400 } },
          },
          {
            urlPattern: /^https?:\/\/.*\/api\/.*/i,
            handler: 'NetworkFirst',
            options: { cacheName: 'api-cache', expiration: { maxEntries: 50, maxAgeSeconds: 300 } },
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  server: {
    allowedHosts: ['philologic-debi-unsophisticatedly.ngrok-free.dev'],
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
})
