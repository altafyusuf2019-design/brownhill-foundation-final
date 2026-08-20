import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Brownhill Fleet',
        short_name: 'Brownhill',
        description: 'Fleet and Driver Cost Tracking Application',
        theme_color: '#1e1e2e',
        background_color: '#1e1e2e',
        display: 'standalone',
        orientation: 'portrait',
        icons: [
          {
            src: '[https://cdn-icons-png.flaticon.com/512/681/681123.png](https://cdn-icons-png.flaticon.com/512/681/681123.png)',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: '[https://cdn-icons-png.flaticon.com/512/681/681123.png](https://cdn-icons-png.flaticon.com/512/681/681123.png)',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          }
        ]
      }
    })
  ]
})
