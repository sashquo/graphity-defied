import { defineConfig } from 'vite'
export default defineConfig({base:'./',build:{chunkSizeWarningLimit:1300,rollupOptions:{output:{manualChunks(id){if(id.includes('/phaser/'))return 'phaser';if(id.includes('/@garmin/'))return 'fit'}}}}})
