import { defineConfig, devices } from '@playwright/test';
import { adminCredentials } from './src/wipe/admin-credentials';

const OUTPUT_ROOT = '../../dist/.playwright/apps/cyberrangecz-platform-e2e/wipe';

/**
 * Wipes devel and prepares the suite's accounts. With administrator credentials available the
 * browser runs headless and signs in itself; otherwise a person signs in with an administrator
 * account in the headed browser it opens. The run never starts on its own with the suite.
 */
export default defineConfig({
    testDir: './src/wipe',
    outputDir: `${OUTPUT_ROOT}/test-output`,
    workers: 1,
    retries: 0,
    reporter: [['list'], ['html', { open: 'never', outputFolder: `${OUTPUT_ROOT}/report` }]],
    use: {
        ...devices['Desktop Chrome'],
        headless: adminCredentials() !== undefined,
        ignoreHTTPSErrors: true,
        video: 'off',
        screenshot: 'off',
        trace: 'off',
    },
});
