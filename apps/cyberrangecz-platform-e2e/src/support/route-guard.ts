import type { Page } from '@playwright/test';
import type { AccountRole } from './accounts';
import { expect, type PageRole } from './fixtures';
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

/**
 * Opens a path as a role in a page of its own and expects the route guard to turn it away. An
 * account with a single agenda is forwarded from the home page to that agenda; every other account
 * stays on the home page. With `absentLinks`, the landing page must offer no link to those paths.
 */
export async function expectRedirectedAway(
    openAs: (role: PageRole) => Promise<Page>,
    role: AccountRole,
    path: string,
    options: { absentLinks?: readonly string[] } = {},
): Promise<void> {
    const page = await openAs(role);
    await page.goto(path);
    await expectUrlWhileLoading(page, landingUrlOf(role));
    if (options.absentLinks === undefined) {
        return;
    }
    await waitForPageReady(page);
    for (const link of options.absentLinks) {
        await expect(page.locator(`a[href="${link}"]`)).toHaveCount(0);
    }
}
