import { expect, test } from '../../support/fixtures';
import { HomePage } from '../../support/pages/common/home.page';
import { pageTitle, waitForPageReady } from '../../support/ui';

const BLOCKED_HEADING = 'Event database is in use by another window';
const MERGED_TEST_TIMEOUT_MILLISECONDS = 240_000;
const RECOVERY_TIMEOUT_MILLISECONDS = 45_000;

test.describe('single-tab event cache', () => {
    test.use({ account: 'trainingOrganizer' });

    test('second page of one account', async ({ page, shared, checkpoint }) => {
        test.setTimeout(MERGED_TEST_TIMEOUT_MILLISECONDS);
        const analysisPath = `/linear-instance/${shared.trainingInstance.id}/analysis`;
        await page.goto('/home');
        await waitForPageReady(page);
        const secondPage = await page.context().newPage();

        await test.step('redirects a second page of the same account to the blocked screen on a cache route', async () => {
            await secondPage.goto(analysisPath);
            await expect.soft(secondPage, 'address of the second page').toHaveURL(/\/cache-blocked\?/);
            expect
                .soft(new URL(secondPage.url()).searchParams.get('redirect'), 'requested route carried by the blocked address')
                .toBe(analysisPath);
            await expect
                .soft(secondPage.getByRole('heading', { name: BLOCKED_HEADING }), 'blocked heading')
                .toBeVisible();
            await expect
                .soft(secondPage.getByText('Waiting for the connection to be released'), 'waiting message')
                .toBeVisible();
            await checkpoint(secondPage, 'blocked second page');
        });

        await test.step('does not block a second page on a route that does not read the cache', async () => {
            const thirdPage = await page.context().newPage();
            await thirdPage.goto('/home');
            await expect.soft(thirdPage, 'address of the third page').toHaveURL(/\/home$/);
            await expect
                .soft(thirdPage.getByRole('heading', { name: BLOCKED_HEADING }), 'blocked heading on the third page')
                .toHaveCount(0);
            await thirdPage.close();
        });

        await test.step('leaves the first page usable while the second one is blocked', async () => {
            await expect.soft(secondPage, 'address of the second page').toHaveURL(/\/cache-blocked\?/);
            await expect.soft(page, 'address of the first page').toHaveURL(/\/home$/);
            await new HomePage(page).linkButton('Training Instance').click();
            await expect.soft(page, 'address after the Training Instance link').toHaveURL(/\/linear-instance$/);
            await expect.soft(pageTitle(page), 'page title of the first page').toHaveText('Training Instance Overview');
        });

        await test.step('recovers the blocked page on its requested route once the first page closes', async () => {
            await page.close();
            await expect
                .soft(secondPage, 'address of the second page after the first page closed')
                .toHaveURL(new RegExp(`${analysisPath}$`), { timeout: RECOVERY_TIMEOUT_MILLISECONDS });
            await expect
                .soft(secondPage.getByRole('heading', { name: BLOCKED_HEADING }), 'blocked heading after recovery')
                .toHaveCount(0);
            await checkpoint(secondPage, 'recovered second page');
        });
    });
});
