import { expect, test } from '../../support/pages/training-instance/training-instance-test';
import {
    SentinelTable,
    expectNoErrorDialog,
    expectUrlWhileLoading,
    breadcrumbLink,
    control,
    pageTitle,
    waitForPageReady,
} from '../../support/ui';

test.use({ account: 'trainingOrganizer' });

test.describe('linear-instance.cheating-detection', () => {
    test('checks the cheating detection page of an instance without detections', async ({
        page,
        createInstance,
        checkpoint,
    }) => {
        test.setTimeout(180_000);
        const instance = await createInstance({ purpose: 'cdcheck' });
        await page.goto(`/linear-instance/${instance.id}/cheating-detection`);
        await waitForPageReady(page);

        await test.step('shows the page title, the create control and the empty table of an instance without detections', async () => {
            await expect
                .soft(pageTitle(page), 'page title')
                .toHaveText(`Cheating Detections of ${instance.title}`);
            const table = SentinelTable.in(page);
            await table.waitUntilLoaded();
            for (const header of [/^id$/i, /executed at/i, /executed by/i, /state/i, /results/i, /stages/i]) {
                await expect.soft(table.headerCell(header), `column ${header}`).toBeVisible();
            }
            await expect.soft(table.rows, 'detection rows').toHaveCount(0);
            await expect
                .soft(table.emptyState, 'empty state')
                .toContainText('No cheating detections have been run yet');
            await expect
                .soft(control(page, 'Create Cheating Detection'), 'create control')
                .toBeEnabled();
            await checkpoint(page, 'empty cheating detection overview');
        });

        await test.step('opens without an error dialog', async () => {
            await expectNoErrorDialog(page);
        });

        await test.step('shows the instance title as the breadcrumb of the page', async () => {
            await expect.soft(breadcrumbLink(page, instance.title), 'instance breadcrumb').toBeVisible();
        });

        await test.step('opens the create page from the create control', async () => {
            await control(page, 'Create Cheating Detection').click();
            await expectUrlWhileLoading(page, new RegExp(`/linear-instance/${instance.id}/cheating-detection/create$`));
        });
    });
});
