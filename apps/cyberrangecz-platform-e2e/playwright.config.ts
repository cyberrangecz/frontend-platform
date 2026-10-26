import { defineConfig, devices, type Project } from '@playwright/test';
import { BROWSER_KEYS, type BrowserKey } from './src/support/accounts';
import { environment } from './src/support/environment';
import type { SuiteOptions } from './src/support/fixtures';

const OUTPUT_ROOT = '../../dist/.playwright/apps/cyberrangecz-platform-e2e';

/** Page specs that run on the deployed origin instead of the application origin. */
const DEPLOYED_ORIGIN_SPECS = /microservice\.[\w.-]*spec\.ts$/;

const DEVICES: Record<BrowserKey, (typeof devices)[string]> = {
    chromium: { ...devices['Desktop Chrome'], permissions: ['clipboard-read', 'clipboard-write'] },
    firefox: devices['Desktop Firefox'],
    webkit: devices['Desktop Safari'],
};

/**
 * Specs that create or delete sandbox definitions, or count them for paging, in run order.
 * They run one after another across every browser, because a definition one of them adds or
 * removes changes the totals and pages the others read.
 */
const SANDBOX_DEFINITION_SPECS = [
    { name: 'sandbox-definition-create', testMatch: /sandbox-definition\.create\.spec\.ts$/ },
    { name: 'sandbox-definition', testMatch: /sandbox-definition\.spec\.ts$/ },
] as const;

const SANDBOX_DEFINITION_ORDER = SANDBOX_DEFINITION_SPECS.flatMap((spec) =>
    BROWSER_KEYS.map((browser) => ({ browser, ...spec, projectName: `${browser}-${spec.name}` })),
);

const allOf = (suffix: string) => BROWSER_KEYS.map((browser) => `${browser}-${suffix}`);

/** The browser's sandbox definition projects, chained in one run order across all browsers. */
function sandboxDefinitionProjects(browser: BrowserKey): Project<SuiteOptions>[] {
    const use = { ...DEVICES[browser], browserKey: browser };
    return SANDBOX_DEFINITION_ORDER.flatMap((step, index) =>
        step.browser === browser
            ? [
                  {
                      name: step.projectName,
                      testDir: './src/pages',
                      testMatch: step.testMatch,
                      fullyParallel: false,
                      dependencies:
                          index === 0 ? ['shared'] : [SANDBOX_DEFINITION_ORDER[index - 1]!.projectName],
                      use,
                  },
              ]
            : [],
    );
}

const lastSandboxDefinitionProject = (browser: BrowserKey) =>
    SANDBOX_DEFINITION_ORDER.filter((step) => step.browser === browser).at(-1)!.projectName;

/**
 * Projects of one browser: its page specs, its sandbox chain, the confirmation that every
 * chain left a run, the multi-trainee review, the destructive teardown that runs once every
 * review has ended, whatever the reviews' results, and the trainee's logout after its pages and
 * review.
 */
function browserProjects(browser: BrowserKey): Project<SuiteOptions>[] {
    const use = { ...DEVICES[browser], browserKey: browser };
    return [
        {
            name: browser,
            testDir: './src/pages',
            testIgnore: [
                ...SANDBOX_DEFINITION_SPECS.map((spec) => spec.testMatch),
                ...(environment.deployedOriginSpecs ? [] : [DEPLOYED_ORIGIN_SPECS]),
            ],
            dependencies: ['shared'],
            use,
        },
        ...sandboxDefinitionProjects(browser),
        { name: `${browser}-chain`, testDir: './src/chain', dependencies: ['shared'], use },
        {
            name: `${browser}-runs-ready`,
            testDir: './src/review',
            testMatch: /runs-ready\.setup\.ts/,
            dependencies: allOf('chain'),
            teardown: `${browser}-destructive`,
            use,
        },
        {
            name: `${browser}-review`,
            testDir: './src/review',
            testIgnore: /runs-ready\.setup\.ts/,
            dependencies: allOf('runs-ready'),
            use,
        },
        { name: `${browser}-destructive`, testDir: './src/destructive', use },
        {
            name: `${browser}-logout`,
            testDir: './src/logout',
            dependencies: [browser, `${browser}-review`, lastSandboxDefinitionProject(browser)],
            use,
        },
    ];
}

/**
 * The e2e suite of the platform frontend, run against the frontend at
 * https://localhost:4200 and the devel backends. Every test records video and a final screenshot;
 * the slideshow reporter chains them into one HTML player.
 */
export default defineConfig<SuiteOptions>({
    outputDir: `${OUTPUT_ROOT}/test-output`,
    fullyParallel: true,
    workers: '25%',
    forbidOnly: Boolean(process.env['CI']),
    retries: 2,
    timeout: 120_000,
    expect: { timeout: 15_000 },
    reporter: [
        ['list'],
        ['html', { open: 'never', outputFolder: `${OUTPUT_ROOT}/report` }],
        ['./src/reporting/slideshow-reporter.ts', { outputFolder: `${OUTPUT_ROOT}/slideshow` }],
        ['./src/reporting/retry-warning-reporter.ts'],
        ['./src/reporting/immediate-failure-reporter.ts', { logFile: `${OUTPUT_ROOT}/failures.log` }],
    ],
    use: {
        ignoreHTTPSErrors: true,
        actionTimeout: 20_000,
        navigationTimeout: 45_000,
        video: 'on',
        screenshot: 'on',
        trace: 'retain-on-failure',
    },
    projects: [
        {
            name: 'auth',
            testDir: './src/setup',
            testMatch: /auth\.setup\.ts/,
            use: DEVICES.chromium,
        },
        {
            name: 'shared',
            testDir: './src/setup',
            testMatch: /shared\.setup\.ts/,
            dependencies: ['auth'],
            use: DEVICES.chromium,
        },
        ...BROWSER_KEYS.flatMap(browserProjects),
        {
            name: 'chromium-pool-actions',
            testDir: './src/pool-actions',
            dependencies: ['shared'],
            use: { ...DEVICES.chromium, browserKey: 'chromium' },
        },
    ],
});
