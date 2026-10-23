import { defineConfig, devices } from '@playwright/test'

const externalBase = process.env.PLAYWRIGHT_BASE_URL
const chromePath = process.env.PLAYWRIGHT_CHROME_PATH || (process.platform === 'win32'
  ? 'C:/Program Files/Google/Chrome/Application/chrome.exe'
  : '/usr/bin/google-chrome')

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: externalBase || 'http://127.0.0.1:4198/afterhours-experience/',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    acceptDownloads: true,
    launchOptions: { executablePath: chromePath, args: ['--mute-audio'] },
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: externalBase ? undefined : {
    command: 'npm run preview',
    url: 'http://127.0.0.1:4198/afterhours-experience/',
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
  },
})
