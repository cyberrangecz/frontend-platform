import type { Page } from '@playwright/test';
import type { AccountRole } from './accounts';
import { expect, test, type PageRole } from './fixtures';
import { agendasOf } from './pages/common/role-agendas';
import { expectUrlWhileLoading, waitForPageReady } from './ui';

const HOME_URL = /\/home(\?|#|$)/;

/** The URL pattern an account lands on after a guard sends it away: its sole agenda, or the home page. */
function landingUrlOf(role: AccountRole): RegExp {
    const [soleAgenda, ...otherAgendas] = agendasOf(role);
    if (soleAgenda === undefined || otherAgendas.length > 0) {
        return HOME_URL;
    }
    return new RegExp(`${soleAgenda.path}(\\?|#|$)`);
}

interface RedirectOptions {
    /** Paths the landing page must offer no link to. */
    absentLinks?: readonly string[];
}

const LOGIN_URL = /\/login(\?|$)/;
const APPLICATION_START_TIMEOUT_MILLISECONDS = 60_000;

async function expectLandingAfterVisit(
    page: Page,
    role: AccountRole,
    path: string,
    { absentLinks = [] }: RedirectOptions,
): Promise<void> {
    await page.goto(path);
    await expectUrlWhileLoading(page, landingUrlOf(role));
    if (absentLinks.length === 0) {
        return;
    }
    await waitForPageReady(page);
    for (const link of absentLinks) {
        await expect(page.locator(`a[href="${link}"]`)).toHaveCount(0);
    }
}

/**
 * Opens a path as a role in a page of its own and expects the route guard to turn it away. An
 * account with a single agenda is forwarded from the home page to that agenda; every other account
 * stays on the home page. With `absentLinks`, the landing page must offer no link to those paths.
 */
export async function expectRedirectedAway(
    openAs: (role: PageRole) => Promise<Page>,
    role: AccountRole,
    path: string,
    options: RedirectOptions = {},
): Promise<void> {
    await expectLandingAfterVisit(await openAs(role), role, path, options);
}

/**
 * Runs every path through `visit`, each as a `test.step` titled with the path, and fails once all
 * are visited, naming the paths that failed, so one run reports every path the guard let through.
 * A step that ends because the test timed out is rethrown, not recorded as a path that failed.
 */
async function visitEachPath(paths: readonly string[], visit: (path: string) => Promise<void>): Promise<void> {
    const failedPaths: string[] = [];
    for (const path of paths) {
        await test.step(path, () => visit(path)).catch((error: unknown) => {
            if (test.info().status === 'timedOut') {
                throw error;
            }
            failedPaths.push(path);
        });
    }
    if (failedPaths.length > 0) {
        throw new Error(`The guard did not turn these paths away as expected: ${failedPaths.join(', ')}`);
    }
}

/**
 * Navigates a page that is already open, signed in as the role, to each path in turn and expects
 * the route guard to turn it away every time, as `expectRedirectedAway` does for one path. A path
 * that fails does not stop the rest; each shows as a step of its own.
 */
export async function expectEachRedirectedAway(
    page: Page,
    role: AccountRole,
    paths: readonly string[],
    options: RedirectOptions = {},
): Promise<void> {
    await visitEachPath(paths, (path) => expectLandingAfterVisit(page, role, path, options));
}

/**
 * Navigates a signed-out page to each path in turn and expects the route guard to send it to the
 * login page every time. A path that fails does not stop the rest; each shows as a step of its own.
 */
export async function expectEachSentToLogin(page: Page, paths: readonly string[]): Promise<void> {
    await visitEachPath(paths, async (path) => {
        await page.goto(path);
        await expect(page).toHaveURL(LOGIN_URL, { timeout: APPLICATION_START_TIMEOUT_MILLISECONDS });
    });
}
