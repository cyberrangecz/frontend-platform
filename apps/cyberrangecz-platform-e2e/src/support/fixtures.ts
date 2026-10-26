import { basename } from 'node:path';
import { test as base, type Page, type TestInfo } from '@playwright/test';
import { VISUAL_CHECK_ATTACHMENT, type VisualCheckRecord } from '../reporting/visual-check';
import { accountFor, type AccountRole, type BrowserKey } from './accounts';
import { type Api, createApi } from './api/api-client';
import { tokenSourceFor } from './api/token-source';
import { AttemptLedger } from './attempt-ledger';
import { freshStorageState } from './fresh-storage-state';
import { originUrl } from './environment';
import {
    INFRASTRUCTURE_WAIT_LIMIT_MILLISECONDS,
    PROBE_TIMEOUT_MILLISECONDS,
    waitForInfrastructure,
} from './infrastructure-outage';
import { readSharedFixture, type SharedFixture } from './shared-fixture';
import { type Origin, statePaths, type StorageStateObject } from './state-files';
import { StaticAssetCache } from './static-asset-cache';
import { trackLoadActivity } from './ui/loading-window';

/** A role a page is opened as; `anonymous` opens it signed out. */
export type PageRole = AccountRole | 'anonymous';

interface TestOptions {
    /** Account the default `page` is signed in as. */
    account: PageRole;
    /** Origin the default `page` and `openAs` pages load. */
    origin: Origin;
}

interface WorkerOptions {
    /** Browser of the running project; picks the trainee account. */
    browserKey: BrowserKey;
}

/** Options a config project or a spec's `test.use` may set. */
export type SuiteOptions = TestOptions & WorkerOptions;

interface TestFixtures {
    /** Opens a page of its own, recorded on video, signed in as the account of a role. */
    openAs: (role: PageRole) => Promise<Page>;
    /**
     * Attaches a screenshot of a page as a named step of the test. Given what the page should show,
     * it first holds the page still and records that moment of the video as a visual check.
     */
    checkpoint: (page: Page, label: string, shows?: string) => Promise<void>;
    /** Name for an entity a test creates: browser, purpose, run stamp and, on a retried attempt, the attempt number. */
    uniqueName: (purpose: string) => string;
    /**
     * Records the entities this attempt creates. Before a retried test it removes the ones that
     * earlier attempts of the same spec file recorded, so the retry starts clean.
     */
    attemptLedger: AttemptLedger;
    /** After a failed test, waits for the identity provider and platform APIs to answer again. */
    infrastructureGuard: void;
}

interface WorkerFixtures extends WorkerOptions {
    /** Entities of the shared setup. */
    shared: SharedFixture;
    /** REST clients authenticated as the account of a role. */
    apiAs: (role: AccountRole) => Api;
    /** The application's static files, fetched once and shared by every page of the worker. */
    staticAssetCache: StaticAssetCache;
}

async function storageStateFor(
    role: PageRole,
    browser: BrowserKey,
    origin: Origin,
): Promise<StorageStateObject | undefined> {
    return role === 'anonymous'
        ? undefined
        : freshStorageState(statePaths.storageState(accountFor(role, browser), origin));
}

const VISUAL_CHECK_HOLD_MILLISECONDS = 3_000;

/** Start of each recorded page's video and the attachment name that video is reported under. */
const pageRecordings = new WeakMap<Page, { startedAt: number; videoLabel: string }>();

interface PageProblem {
    page: string;
    kind: 'console error' | 'page error' | 'failed response' | 'failed request';
    text: string;
}

/** Collects console errors, uncaught errors and failed network traffic of a page. */
function watchPage(page: Page, label: string, problems: PageProblem[]): void {
    page.on('console', (message) => {
        if (message.type() === 'error') {
            problems.push({ page: label, kind: 'console error', text: message.text() });
        }
    });
    page.on('pageerror', (error) => {
        problems.push({ page: label, kind: 'page error', text: error.message });
    });
    page.on('response', (response) => {
        if (response.status() >= 400) {
            problems.push({
                page: label,
                kind: 'failed response',
                text: `${response.status()} ${response.request().method()} ${response.url()}`,
            });
        }
    });
    page.on('requestfailed', (request) => {
        problems.push({
            page: label,
            kind: 'failed request',
            text: `${request.failure()?.errorText ?? 'failed'} ${request.method()} ${request.url()}`,
        });
    });
}

async function attachProblems(testInfo: TestInfo, problems: PageProblem[]): Promise<void> {
    if (problems.length > 0) {
        await testInfo.attach('diagnostics', {
            body: JSON.stringify(problems, null, 2),
            contentType: 'application/json',
        });
    }
}

/** Runs every step in order even when one throws, then rethrows the first error. */
async function runAll(steps: (() => Promise<unknown>)[]): Promise<void> {
    const failures: unknown[] = [];
    for (const step of steps) {
        try {
            await step();
        } catch (error) {
            failures.push(error);
        }
    }
    if (failures.length > 0) {
        throw failures[0];
    }
}

/**
 * The suite's `test`: every page starts signed in as `account`, records video, and reports its
 * console and network problems as a `diagnostics` attachment without failing the test.
 */
export const test = base.extend<TestFixtures & TestOptions, WorkerFixtures>({
    browserKey: ['chromium', { option: true, scope: 'worker' }],
    account: ['trainee', { option: true }],
    origin: ['application', { option: true }],

    baseURL: async ({ origin }, use) => {
        await use(originUrl(origin));
    },

    storageState: async ({ account, browserKey, origin }, use) => {
        await use(await storageStateFor(account, browserKey, origin));
    },

    page: async ({ page, baseURL, staticAssetCache }, use, testInfo) => {
        trackLoadActivity(page.context());
        if (baseURL) {
            await staticAssetCache.attach(page.context(), baseURL);
        }
        pageRecordings.set(page, { startedAt: Date.now(), videoLabel: 'video' });
        const problems: PageProblem[] = [];
        watchPage(page, 'page', problems);
        await use(page);
        await page.context().unrouteAll({ behavior: 'ignoreErrors' });
        await attachProblems(testInfo, problems);
    },

    staticAssetCache: [
        async ({}, use) => {
            await use(new StaticAssetCache());
        },
        { scope: 'worker' },
    ],

    shared: [
        async ({}, use) => {
            await use(readSharedFixture());
        },
        { scope: 'worker' },
    ],

    apiAs: [
        async ({ browserKey }, use) => {
            await use((role) =>
                createApi(tokenSourceFor(statePaths.storageState(accountFor(role, browserKey)))),
            );
        },
        { scope: 'worker' },
    ],

    openAs: async ({ browser, browserKey, origin, viewport, staticAssetCache }, use, testInfo) => {
        const opened: { role: PageRole; page: Page }[] = [];
        const problems: PageProblem[] = [];
        await use(async (role) => {
            const context = await browser.newContext({
                baseURL: originUrl(origin),
                storageState: await storageStateFor(role, browserKey, origin),
                ignoreHTTPSErrors: true,
                viewport,
                recordVideo: { dir: testInfo.outputPath(`video-${opened.length}`) },
            });
            trackLoadActivity(context);
            await staticAssetCache.attach(context, originUrl(origin));
            const page = await context.newPage();
            pageRecordings.set(page, { startedAt: Date.now(), videoLabel: `video ${role}` });
            watchPage(page, role, problems);
            opened.push({ role, page });
            return page;
        });
        await runAll([
            ...opened.flatMap(({ role, page }) => {
                const video = page.video();
                return [
                    () => page.context().unrouteAll({ behavior: 'ignoreErrors' }),
                    () => page.context().close(),
                    async () => {
                        if (video) {
                            await testInfo.attach(`video ${role}`, {
                                path: await video.path(),
                                contentType: 'video/webm',
                            });
                        }
                    },
                ];
            }),
            () => attachProblems(testInfo, problems),
        ]);
    },

    checkpoint: async ({}, use, testInfo) => {
        let step = 0;
        await use(async (page, label, shows) => {
            step++;
            const screenshotLabel = `checkpoint ${String(step).padStart(2, '0')} ${label}`;
            if (shows !== undefined) {
                const recording = pageRecordings.get(page);
                if (!recording) {
                    throw new Error(`Visual check "${label}" needs a page opened by the suite's fixtures`);
                }
                const check: VisualCheckRecord = {
                    label,
                    shows,
                    videoLabel: recording.videoLabel,
                    atMilliseconds: Date.now() - recording.startedAt,
                    holdMilliseconds: VISUAL_CHECK_HOLD_MILLISECONDS,
                    screenshotLabel,
                };
                await page.waitForTimeout(VISUAL_CHECK_HOLD_MILLISECONDS);
                await testInfo.attach(VISUAL_CHECK_ATTACHMENT, {
                    body: JSON.stringify(check),
                    contentType: 'application/json',
                });
            }
            await testInfo.attach(screenshotLabel, {
                body: await page.screenshot(),
                contentType: 'image/png',
            });
        });
    },

    attemptLedger: [
        async ({ apiAs }, use, testInfo) => {
            const ledger = new AttemptLedger(
                `${testInfo.project.name}-${basename(testInfo.file)}`,
                testInfo.retry,
            );
            if (testInfo.retry > 0) {
                await ledger.removeEarlierAttempts(apiAs('sandboxOrganizer').sandbox);
            }
            await use(ledger);
        },
        { auto: true, timeout: 20 * 60_000 },
    ],

    infrastructureGuard: [
        async ({}, use, testInfo) => {
            await use();
            if (testInfo.status !== 'failed' && testInfo.status !== 'timedOut') {
                return;
            }
            const waitedMilliseconds = await waitForInfrastructure();
            if (waitedMilliseconds > 0) {
                testInfo.annotations.push({
                    type: 'infrastructure outage',
                    description: `waited ${Math.round(waitedMilliseconds / 1000)} s for the identity provider and platform APIs to answer`,
                });
            }
        },
        {
            auto: true,
            timeout: INFRASTRUCTURE_WAIT_LIMIT_MILLISECONDS + 2 * PROBE_TIMEOUT_MILLISECONDS,
        },
    ],

    uniqueName: async ({ browserKey, shared }, use, testInfo) => {
        const attemptSuffix = testInfo.retry > 0 ? `-retry${testInfo.retry}` : '';
        await use((purpose) => `e2e-${browserKey}-${purpose}-${shared.runStamp}${attemptSuffix}`);
    },
});

export { expect } from '@playwright/test';
