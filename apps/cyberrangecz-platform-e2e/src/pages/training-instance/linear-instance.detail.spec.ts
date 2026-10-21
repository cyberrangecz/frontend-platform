import { expectRedirectedAway } from '../../support/route-guard';
import { expect, test } from '../../support/pages/training-instance/training-instance-test';
import { formatSummaryDate, waitForInstanceStart } from '../../support/pages/training-instance/instance-data';
import {
    SentinelTable,
    expectNoErrorDialog,
    expectUrlWhileLoading,
    breadcrumbLink,
    control,
    pageTitle,
    waitForNotification,
    waitForPageReady,
} from '../../support/ui';

test.use({ account: 'trainingOrganizer' });

test.describe('linear-instance.detail', () => {
    test('shows the title, the definition and the data fields of the instance', async ({
        page,
        createInstance,
        shared,
        checkpoint,
    }) => {
        const instance = await createInstance({ purpose: 'detailshow' });
        await page.goto(`/linear-instance/${instance.id}/detail`);
        await waitForPageReady(page);
        await expect(pageTitle(page)).toHaveText(`Detail of ${instance.title}`);
        await expect(page.getByRole('heading', { level: 2, name: instance.title })).toBeVisible();
        await expect(page.getByRole('heading', { level: 3, name: new RegExp(shared.trainingDefinition.title) })).toBeVisible();
        const summary = page.locator('.icon-panel-container');
        await expect(summary.getByText('Start Time', { exact: true })).toBeVisible();
        await expect(summary.getByText('End Time', { exact: true })).toBeVisible();
        await expect(summary.getByText('Assigned Pool', { exact: true })).toBeVisible();
        await expect(summary.getByText('Access Token', { exact: true })).toBeVisible();
        await expect(summary.getByRole('button', { name: instance.accessToken })).toBeVisible();
        await expect(summary.locator('.data-field', { hasText: 'Start Time' }).locator('.value-field')).toHaveText(
            formatSummaryDate(instance.startTime),
        );
        await expect(summary.locator('.data-field', { hasText: 'End Time' }).locator('.value-field')).toHaveText(
            formatSummaryDate(instance.endTime),
        );
        await checkpoint(page, 'detail loaded');
    });

    test('opens without an error dialog', async ({ page, createInstance }) => {
        const instance = await createInstance({ purpose: 'detailnoerror' });
        await page.goto(`/linear-instance/${instance.id}/detail`);
        await waitForPageReady(page);
        await expect(pageTitle(page)).toHaveText(`Detail of ${instance.title}`);
        await expectNoErrorDialog(page);
    });

    test('offers no link to the training definition, which the organizer cannot open', async ({
        page,
        createInstance,
        shared,
    }) => {
        const instance = await createInstance({ purpose: 'detaillinks' });
        await page.goto(`/linear-instance/${instance.id}/detail`);
        await waitForPageReady(page);
        await expect(pageTitle(page)).toHaveText(`Detail of ${instance.title}`);
        await expect(page.getByRole('heading', { level: 3, name: shared.trainingDefinition.title })).toBeVisible();
        await expect(page.getByRole('button', { name: shared.trainingDefinition.title })).toHaveCount(0);
        await expect(page.getByRole('link', { name: shared.trainingDefinition.title })).toHaveCount(0);
    });

    test('opens the pool assigned to the instance', async ({ page, createInstance }) => {
        const instance = await createInstance({ purpose: 'detailpool' });
        await page.goto(`/linear-instance/${instance.id}/detail`);
        await waitForPageReady(page);
        await expect(pageTitle(page)).toHaveText(`Detail of ${instance.title}`);
        const poolName = `Pool ${instance.poolId}`;
        await page
            .getByRole('link', { name: poolName })
            .or(page.getByRole('button', { name: poolName }))
            .click();
        await expectUrlWhileLoading(page, new RegExp(`/pool/${instance.poolId}$`));
    });

    test('confirms copying the access token', async ({ page, createInstance, context }) => {
        await context.grantPermissions(['clipboard-read', 'clipboard-write']).catch(() => undefined);
        const instance = await createInstance({ purpose: 'detailcopy' });
        await page.goto(`/linear-instance/${instance.id}/detail`);
        await waitForPageReady(page);
        await page.getByRole('button', { name: instance.accessToken }).click();
        await waitForNotification(page, 'Access token has been copied');
    });

    test.describe('controls of an instance that has not started', () => {
        for (const label of ['Show Results', 'Cheating Detection', 'Export Score']) {
            test(`disables ${label}`, async ({ page, createInstance }) => {
                const instance = await createInstance({ purpose: `detailnotstarted-${label.toLowerCase().replace(/\s+/g, '-')}` });
                await page.goto(`/linear-instance/${instance.id}/detail`);
                await waitForPageReady(page);
                await expect(pageTitle(page)).toHaveText(`Detail of ${instance.title}`);
                await expect(control(page, label)).toBeDisabled();
            });
        }
    });

    test.describe('controls of an instance that has started', () => {
        test('opens the cheating detection page', async ({ page, createInstance }) => {
            const instance = await createInstance({ purpose: 'detailstarted', startsInMilliseconds: 10_000 });
            await waitForInstanceStart(instance);
            await page.goto(`/linear-instance/${instance.id}/detail`);
            await waitForPageReady(page);
            await expect(control(page, 'Cheating Detection')).toBeEnabled();
            await expect(control(page, 'Show Results')).toBeEnabled();
            await expect(control(page, 'Export Score')).toBeEnabled();
            await control(page, 'Cheating Detection').click();
            await expectUrlWhileLoading(page, new RegExp(`/linear-instance/${instance.id}/cheating-detection$`));
        });
    });

    test('shows the empty training run table of an instance without runs', async ({
        page,
        createInstance,
        checkpoint,
    }) => {
        const instance = await createInstance({ purpose: 'detailruns' });
        await page.goto(`/linear-instance/${instance.id}/detail`);
        await waitForPageReady(page);
        const table = SentinelTable.in(page);
        await table.waitUntilLoaded();
        for (const header of [/player/i, /start time/i, /end time/i, /run state/i, /duration/i, /sandbox id/i]) {
            await expect(table.headerCell(header)).toBeVisible();
        }
        await expect(table.rows).toHaveCount(0);
        await expect(table.emptyState).toContainText('No training runs in this instance yet');
        await checkpoint(page, 'empty run table');
    });

    test('shows a breadcrumb back to the instance overview', async ({ page, createInstance }) => {
        const instance = await createInstance({ purpose: 'detailcrumb' });
        await page.goto(`/linear-instance/${instance.id}/detail`);
        await waitForPageReady(page);
        await expect(pageTitle(page)).toHaveText(`Detail of ${instance.title}`);
        await expect(breadcrumbLink(page, 'Detail')).toBeVisible();
    });

    test.describe('access', () => {
        for (const role of ['trainingDesigner', 'trainee'] as const) {
            test(`sends the ${role} account away from /linear-instance/:id/detail`, async ({ openAs, createInstance }) => {
                const instance = await createInstance({ purpose: `detailaccess-${role}` });
                await expectRedirectedAway(openAs, role, `/linear-instance/${instance.id}/detail`);
            });
        }
    });
});
