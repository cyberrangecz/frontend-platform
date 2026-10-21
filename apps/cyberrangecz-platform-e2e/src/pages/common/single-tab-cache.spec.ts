import { expect, test } from '../../support/fixtures';
import { HomePage } from '../../support/pages/common/home.page';
import { pageTitle, waitForPageReady } from '../../support/ui';

const BLOCKED_HEADING = 'Event database is in use by another window';
const RECOVERY_TIMEOUT_MILLISECONDS = 45_000;

test.describe('single-tab event cache', () => {
    test.use({ account: 'trainingOrganizer' });

    test('redirects a second page of the same account to the blocked screen on a cache route', async ({
        page,
        shared,
        checkpoint,
    }) => {
        const analysisPath = `/linear-instance/${shared.trainingInstance.id}/analysis`;
        await page.goto('/home');
        await waitForPageReady(page);

        const secondPage = await page.context().newPage();
        await secondPage.goto(analysisPath);

        await expect(secondPage).toHaveURL(/\/cache-blocked\?/);
        expect(new URL(secondPage.url()).searchParams.get('redirect')).toBe(analysisPath);
        await expect(secondPage.getByRole('heading', { name: BLOCKED_HEADING })).toBeVisible();
        await expect(secondPage.getByText('Waiting for the connection to be released')).toBeVisible();
        await checkpoint(secondPage, 'blocked second page');
    });

    test('leaves the first page usable while the second one is blocked', async ({ page, shared }) => {
        await page.goto('/home');
        await waitForPageReady(page);

        const secondPage = await page.context().newPage();
        await secondPage.goto(`/linear-instance/${shared.trainingInstance.id}/analysis`);
        await expect(secondPage).toHaveURL(/\/cache-blocked\?/);

        await expect(page).toHaveURL(/\/home$/);
        await new HomePage(page).linkButton('Training Instance').click();
        await expect(page).toHaveURL(/\/linear-instance$/);
        await expect(pageTitle(page)).toHaveText('Training Instance Overview');
    });

    test('recovers the blocked page on its requested route once the first page closes', async ({
        page,
        shared,
        checkpoint,
    }) => {
        const analysisPath = `/linear-instance/${shared.trainingInstance.id}/analysis`;
        await page.goto('/home');
        await waitForPageReady(page);

        const secondPage = await page.context().newPage();
        await secondPage.goto(analysisPath);
        await expect(secondPage).toHaveURL(/\/cache-blocked\?/);

        await page.close();

        await expect(secondPage).toHaveURL(new RegExp(`${analysisPath}$`), {
            timeout: RECOVERY_TIMEOUT_MILLISECONDS,
        });
        await expect(secondPage.getByRole('heading', { name: BLOCKED_HEADING })).toHaveCount(0);
        await checkpoint(secondPage, 'recovered second page');
    });

    test('does not block a second page on a route that does not read the cache', async ({ page }) => {
        await page.goto('/home');
        await waitForPageReady(page);

        const secondPage = await page.context().newPage();
        await secondPage.goto('/home');

        await expect(secondPage).toHaveURL(/\/home$/);
        await expect(secondPage.getByRole('heading', { name: BLOCKED_HEADING })).toHaveCount(0);
    });
});
