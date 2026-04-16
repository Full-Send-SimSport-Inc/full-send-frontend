import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from "path"

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        // This removes the hash from the main JS file
        entryFileNames: `assets/[name].js`,
        // This removes the hash from chunk files
        chunkFileNames: `assets/[name].js`,
        // This removes the hash from CSS and other assets
        assetFileNames: `assets/[name].[ext]`
      }
    }
  }, // <--- This was the missing brace
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  css: {
    transformer: 'postcss',
  }
})