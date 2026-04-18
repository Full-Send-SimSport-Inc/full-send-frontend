import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from "path"

export default defineConfig({
  plugins: [react()],
  build: {
    emptyOutDir: false, // Prevents wiping the dist folder
    rollupOptions: {
      output: {
        // This removes the hash from the main JS file
        entryFileNames: `assets/[name].js`,
        // This removes the hash from chunk files
        chunkFileNames: `assets/[name].js`,
        // This removes the hash from CSS and other assets
        assetFileNames: `assets/[name].[ext]`
      } 
    } // Closes rollupOptions
  }, // Closes build
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  css: {
    transformer: 'postcss',
  }
})