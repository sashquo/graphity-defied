import {defineConfig} from '@playwright/test'
export default defineConfig({
  testDir:'tests',testMatch:'**/*.spec.ts',workers:2,
  use:{channel:process.env.GRAPHITY_BROWSER_CHANNEL,baseURL:'http://127.0.0.1:4173',trace:'retain-on-failure',viewport:{width:1280,height:900}},
  webServer:{command:'npm run preview -- --host 127.0.0.1 --strictPort',url:'http://127.0.0.1:4173',reuseExistingServer:!process.env.CI,timeout:25000}
})


