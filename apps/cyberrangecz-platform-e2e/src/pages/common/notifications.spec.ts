import { expect, test } from '../../support/fixtures';
import { RunOverviewPage } from '../../support/pages/run/run-overview-page';
import {
    breadcrumbEntries,
    dismissErrorDialog,
    errorDialog,
    notificationMenu,
    openNotificationMenu,
    pageTitle,
    waitForPageReady,
} from '../../support/ui';

const MERGED_TEST_TIMEOUT_MILLISECONDS = 300_000;
const REJECTED_TOKEN_NOTIFICATION = /Resource Not Found|no active training/;

test.describe('notifications', () => {
    test.use({ account: 'trainee' });

    /** Produces a recorded error notification by submitting an access token no run matches. */
    async function recordRejectedTokenNotification(runOverview: RunOverviewPage): Promise<void> {
        await runOverview.open();
        await runOverview.fillToken('e2e-notifications-probe', '1234');
        await runOverview.accessButton.click();
        await expect(errorDialog(runOverview.page)).toBeVisible();
        await dismissErrorDialog(runOverview.page);
    }

    test('notification history', async ({ page, checkpoint }) => {
        test.setTimeout(MERGED_TEST_TIMEOUT_MILLISECONDS);
        await recordRejectedTokenNotification(new RunOverviewPage(page));

        await test.step('records an error in the bell history', async () => {
            await openNotificationMenu(page);
            await expect
                .soft(notificationMenu(page).getByText(REJECTED_TOKEN_NOTIFICATION).first(), 'error in the bell history')
                .toBeVisible();
            await checkpoint(page, 'bell history');
        });

        await test.step('opens the notifications page from the bell history', async () => {
            await page.getByRole('link', { name: 'Show All' }).click();
            await expect.soft(page, 'address of the notifications page').toHaveURL(/\/notifications$/);
            await expect.soft(pageTitle(page), 'page title').toHaveText('Notifications');
            await expect
                .soft(page.getByText(REJECTED_TOKEN_NOTIFICATION).first(), 'error on the notifications page')
                .toBeVisible();
            await expect
                .soft(breadcrumbEntries(page), 'breadcrumbs')
                .toHaveText([/^Home/, 'Notifications']);
        });

        await test.step('opens the detail of a notification from the notifications page', async () => {
            await page.getByText(REJECTED_TOKEN_NOTIFICATION).first().click();
            await expect.soft(page, 'address of the notification detail').toHaveURL(/\/notifications\/[^/]+$/);
            await expect
                .soft(page.getByText(REJECTED_TOKEN_NOTIFICATION).first(), 'error in the detail')
                .toBeVisible();
            await expect
                .soft(breadcrumbEntries(page), 'breadcrumbs of the detail')
                .toHaveText([/^Home/, /^Notifications/, 'Detail']);
        });

        await test.step('opens the notifications page when its address is loaded directly', async () => {
            await page.goto('/notifications');
            await waitForPageReady(page);
            await expect.soft(page, 'address of the notifications page').toHaveURL(/\/notifications$/);
            await expect.soft(pageTitle(page), 'page title').toHaveText('Notifications');
        });
    });
});
