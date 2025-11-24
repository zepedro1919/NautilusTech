import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa' // Import the plugin

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['logo.png'], // Ensure your logo is cached
      manifest: {
        name: 'Nautilus Tech',
        short_name: 'Nautilus',
        description: 'Plataforma de Gestão Interna',
        theme_color: '#ffffff',
        background_color: '#ffffff',
        display: 'standalone', // This removes the browser URL bar
        orientation: 'portrait',
        icons: [
          {
            src: 'logo.png', // You must have this file in public/ folder
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'logo.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      }
    })
  ],
})
