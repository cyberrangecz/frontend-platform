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

    test('records an error in the bell history', async ({ page, checkpoint }) => {
        const runOverview = new RunOverviewPage(page);
        await recordRejectedTokenNotification(runOverview);
        await openNotificationMenu(page);
        await expect(notificationMenu(page).getByText(REJECTED_TOKEN_NOTIFICATION).first()).toBeVisible();
        await checkpoint(page, 'bell history');
    });

    test('opens the notifications page from the bell history', async ({ page }) => {
        const runOverview = new RunOverviewPage(page);
        await recordRejectedTokenNotification(runOverview);
        await openNotificationMenu(page);
        await page.getByRole('link', { name: 'Show All' }).click();
        await expect(page).toHaveURL(/\/notifications$/);
        await expect(pageTitle(page)).toHaveText('Notifications');
        await expect(page.getByText(REJECTED_TOKEN_NOTIFICATION).first()).toBeVisible();
        await expect(breadcrumbEntries(page)).toHaveText([/^Home/, 'Notifications']);
    });

    test('opens the detail of a notification from the notifications page', async ({ page }) => {
        const runOverview = new RunOverviewPage(page);
        await recordRejectedTokenNotification(runOverview);
        await openNotificationMenu(page);
        await page.getByRole('link', { name: 'Show All' }).click();
        await page.getByText(REJECTED_TOKEN_NOTIFICATION).first().click();
        await expect(page).toHaveURL(/\/notifications\/[^/]+$/);
        await expect(page.getByText(REJECTED_TOKEN_NOTIFICATION).first()).toBeVisible();
        await expect(breadcrumbEntries(page)).toHaveText([/^Home/, /^Notifications/, 'Detail']);
    });

    test('opens the notifications page when its address is loaded directly', async ({ page }) => {
        await page.goto('/notifications');
        await waitForPageReady(page);
        await expect(page).toHaveURL(/\/notifications$/);
        await expect(pageTitle(page)).toHaveText('Notifications');
    });
});
