import { defineConfig, devices } from '@playwright/test';

const HARNESS_PORT = 4300;
const HARNESS_URL = `https://localhost:${HARNESS_PORT}`;

/**
 * Playwright configuration for the cyberrangecz-platform e2e harness.
 *
 * Runs every spec across Chromium, Firefox, and WebKit so the OPFS-SAHPool
 * cache gate is exercised on all three browser engines (WebKit is Playwright's
 * bundled Safari engine — emulation parity, no real Safari needed). The
 * webServer entry boots the harness Angular app
 * (`nx run cyberrangecz-platform:serve-e2e`) before any spec runs and
 * tears it down on exit. CI gets two retries and a single worker;
 * local runs reuse an already-running dev server when present.
 *
 * `nx` resolves the workspace root from any cwd, so no manual path
 * gymnastics here. Keeping the config strictly CJS-compatible
 * (no `import.meta`) avoids the ESM/CJS loader conflict Playwright's
 * built-in TS compiler runs into.
 */
export default defineConfig({
    testDir: './specs',
    fullyParallel: true,
    forbidOnly: Boolean(process.env['CI']),
    retries: process.env['CI'] !== undefined ? 2 : 0,
    workers: process.env['CI'] !== undefined ? 1 : undefined,
    reporter: process.env['CI'] !== undefined ? 'github' : 'list',
    use: {
        baseURL: HARNESS_URL,
        ignoreHTTPSErrors: true,
        trace: 'on-first-retry',
        screenshot: 'only-on-failure',
    },
    projects: [
        {
            name: 'chromium',
            use: { ...devices['Desktop Chrome'] },
        },
        {
            name: 'firefox',
            use: { ...devices['Desktop Firefox'] },
        },
        {
            name: 'webkit',
            use: { ...devices['Desktop Safari'] },
        },
    ],
    webServer: {
        command: 'npx nx run cyberrangecz-platform:serve-e2e',
        url: HARNESS_URL,
        ignoreHTTPSErrors: true,
        reuseExistingServer: process.env['CI'] === undefined,
        timeout: 180_000,
        stdout: 'pipe',
        stderr: 'pipe',
    },
});
