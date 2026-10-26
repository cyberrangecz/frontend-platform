import type { Page } from '@playwright/test';
import { LoadingWindow } from './loading-window';
import { userMenuButton } from './page-chrome';

const URL_SETTLE_MILLISECONDS = 600;
const BUSY_RECHECK_MILLISECONDS = 300;

const BUSY_INDICATORS = [
    'mat-progress-bar[mode="indeterminate"]',
    'mat-progress-spinner[mode="indeterminate"]',
    'crczp-logo-spinner',
    'ngx-skeleton-loader',
].join(', ');

async function waitForUrlToSettle(page: Page, window: LoadingWindow): Promise<void> {
    let previous = page.url();
    let stableSince = Date.now();
    while (window.isOpen) {
        await page.waitForTimeout(100);
        const current = page.url();
        if (current !== previous) {
            previous = current;
            stableSince = Date.now();
        } else if (Date.now() - stableSince >= URL_SETTLE_MILLISECONDS) {
            return;
        }
    }
    throw new Error(`URL did not settle, last seen ${previous}`);
}

async function waitForApplicationLayout(page: Page, window: LoadingWindow): Promise<void> {
    try {
        await window.retry((timeout) =>
            page.locator('sentinel-layout1 h1, sentinel-toolbar').first().waitFor({ timeout }),
        );
    } catch (error) {
        throw new Error(
            `APPLICATION DID NOT BOOT: the Sentinel layout never rendered at ${page.url()}, so the page itself did not load (stalled script chunk or sign-in discovery request), not a defect of the page under test`,
            { cause: error },
        );
    }
}

async function waitForUserMenu(page: Page, window: LoadingWindow): Promise<void> {
    await window.retry((timeout) => userMenuButton(page).waitFor({ timeout }));
}

async function waitForNoBusyIndicator(page: Page, window: LoadingWindow): Promise<void> {
    await window.retry((timeout) =>
        page.waitForFunction(
            (selector) =>
                Array.from(document.querySelectorAll(selector)).every(
                    (element) => !element.checkVisibility({ visibilityProperty: true }),
                ),
            BUSY_INDICATORS,
            { timeout },
        ),
    );
}

/**
 * Waits until a routed page has finished loading: the URL stayed put long enough for a route
 * guard redirect to have happened, the Sentinel layout and its user menu rendered (the sign-in
 * and user info requests of the application boot are done), and no indeterminate progress
 * bar, indeterminate spinner, logo spinner or skeleton is visible, checked twice a moment apart
 * so a request started by the first render is caught. The wait lasts as long as the page keeps
 * loading new requests. It asserts nothing about page content.
 */
export async function waitForPageReady(page: Page): Promise<void> {
    const window = LoadingWindow.of(page);
    await window.retry((timeout) => page.waitForLoadState('domcontentloaded', { timeout }));
    await waitForUrlToSettle(page, window);
    await waitForApplicationLayout(page, window);
    await waitForUserMenu(page, window);
    await waitForNoBusyIndicator(page, window);
    await page.waitForTimeout(BUSY_RECHECK_MILLISECONDS);
    await waitForNoBusyIndicator(page, window);
}
