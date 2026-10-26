import { expectRedirectedAway } from '../../support/route-guard';
import { expect, test } from '../../support/pages/training-instance/training-instance-test';
import { waitForInstanceStart } from '../../support/pages/training-instance/instance-data';
import { SentinelTable, expectNoErrorDialog, expectUrlWhileLoading, breadcrumbLink, control, pageTitle, waitForPageReady } from '../../support/ui';

test.use({ account: 'trainingOrganizer' });

test.describe('linear-instance.cheating-detection', () => {
    test('shows the page title, the create control and the empty table of an instance without detections', async ({
        page,
        createInstance,
        checkpoint,
    }) => {
        const instance = await createInstance({ purpose: 'cdshow' });
        await page.goto(`/linear-instance/${instance.id}/cheating-detection`);
        await waitForPageReady(page);
        await expect(pageTitle(page)).toHaveText(`Cheating Detections of ${instance.title}`);
        const table = SentinelTable.in(page);
        await table.waitUntilLoaded();
        for (const header of [/^id$/i, /executed at/i, /executed by/i, /state/i, /results/i, /stages/i]) {
            await expect(table.headerCell(header)).toBeVisible();
        }
        await expect(table.rows).toHaveCount(0);
        await expect(table.emptyState).toContainText('No cheating detections have been run yet');
        await expect(control(page, 'Create Cheating Detection')).toBeEnabled();
        await checkpoint(page, 'empty cheating detection overview');
    });

    test('opens without an error dialog', async ({ page, createInstance }) => {
        const instance = await createInstance({ purpose: 'cdnoerror' });
        await page.goto(`/linear-instance/${instance.id}/cheating-detection`);
        await waitForPageReady(page);
        await expect(pageTitle(page)).toHaveText(`Cheating Detections of ${instance.title}`);
        await expectNoErrorDialog(page);
    });

    test('shows the instance title as the breadcrumb of the page', async ({ page, createInstance }) => {
        const instance = await createInstance({ purpose: 'cdcrumb' });
        await page.goto(`/linear-instance/${instance.id}/cheating-detection`);
        await waitForPageReady(page);
        await expect(breadcrumbLink(page, instance.title)).toBeVisible();
    });

    test('opens the create page from the create control', async ({ page, createInstance }) => {
        const instance = await createInstance({ purpose: 'cdcreate' });
        await page.goto(`/linear-instance/${instance.id}/cheating-detection`);
        await waitForPageReady(page);
        await control(page, 'Create Cheating Detection').click();
        await expectUrlWhileLoading(page, new RegExp(`/linear-instance/${instance.id}/cheating-detection/create$`));
    });

    test('is reached from the cheating detection control of the detail page of a started instance', async ({
        page,
        createInstance,
    }) => {
        const instance = await createInstance({ purpose: 'cdnav', startsInMilliseconds: 10_000 });
        await waitForInstanceStart(instance);
        await page.goto(`/linear-instance/${instance.id}/detail`);
        await waitForPageReady(page);
        await control(page, 'Cheating Detection').click();
        await expectUrlWhileLoading(page, new RegExp(`/linear-instance/${instance.id}/cheating-detection$`));
        await expect(pageTitle(page)).toHaveText(`Cheating Detections of ${instance.title}`);
    });

    test.describe('access', () => {
        for (const role of ['trainingDesigner', 'trainee'] as const) {
            test(`sends the ${role} account away from /linear-instance/:id/cheating-detection`, async ({ openAs, createInstance }) => {
                const instance = await createInstance({ purpose: `cdaccess-${role}` });
                await expectRedirectedAway(openAs, role, `/linear-instance/${instance.id}/cheating-detection`);
            });
        }
    });
});
