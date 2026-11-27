import { expect, test } from '../../support/pages/training-instance/training-instance-test';
import { formatSummaryDate } from '../../support/pages/training-instance/instance-data';
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

const MERGED_TEST_TIMEOUT_MILLISECONDS = 180_000;

test.describe('linear-instance.detail', () => {
    test('checks the detail page of an instance that has not started', async ({
        page,
        createInstance,
        shared,
        context,
        checkpoint,
    }) => {
        test.setTimeout(MERGED_TEST_TIMEOUT_MILLISECONDS);
        await context.grantPermissions(['clipboard-read', 'clipboard-write']).catch(() => undefined);
        const instance = await createInstance({ purpose: 'detailcheck' });
        await page.goto(`/linear-instance/${instance.id}/detail`);
        await waitForPageReady(page);

        await test.step('shows the title, the definition and the data fields of the instance', async () => {
            await expect.soft(pageTitle(page), 'page title').toHaveText(`Detail of ${instance.title}`);
            await expect
                .soft(page.getByRole('heading', { level: 2, name: instance.title }), 'instance heading')
                .toBeVisible();
            await expect
                .soft(
                    page.getByRole('heading', { level: 3, name: new RegExp(shared.trainingDefinition.title) }),
                    'training definition heading',
                )
                .toBeVisible();
            const summary = page.locator('.icon-panel-container');
            await expect.soft(summary.getByText('Start Time', { exact: true }), 'start time label').toBeVisible();
            await expect.soft(summary.getByText('End Time', { exact: true }), 'end time label').toBeVisible();
            await expect.soft(summary.getByText('Assigned Pool', { exact: true }), 'assigned pool label').toBeVisible();
            await expect.soft(summary.getByText('Access Token', { exact: true }), 'access token label').toBeVisible();
            await expect
                .soft(summary.getByRole('button', { name: instance.accessToken }), 'access token button')
                .toBeVisible();
            await expect
                .soft(
                    summary.locator('.data-field', { hasText: 'Start Time' }).locator('.value-field'),
                    'start time value',
                )
                .toHaveText(formatSummaryDate(instance.startTime));
            await expect
                .soft(
                    summary.locator('.data-field', { hasText: 'End Time' }).locator('.value-field'),
                    'end time value',
                )
                .toHaveText(formatSummaryDate(instance.endTime));
            await checkpoint(page, 'detail loaded');
        });

        await test.step('opens without an error dialog', async () => {
            await expect.soft(pageTitle(page), 'page title').toHaveText(`Detail of ${instance.title}`);
            await expectNoErrorDialog(page);
        });

        await test.step('offers no link to the training definition, which the organizer cannot open', async () => {
            await expect
                .soft(
                    page.getByRole('heading', { level: 3, name: shared.trainingDefinition.title }),
                    'training definition heading',
                )
                .toBeVisible();
            await expect
                .soft(page.getByRole('button', { name: shared.trainingDefinition.title }), 'definition buttons')
                .toHaveCount(0);
            await expect
                .soft(page.getByRole('link', { name: shared.trainingDefinition.title }), 'definition links')
                .toHaveCount(0);
        });

        for (const label of ['Show Results', 'Cheating Detection', 'Export Score']) {
            await test.step(`disables ${label}`, async () => {
                await expect.soft(control(page, label), `${label} control`).toBeDisabled();
            });
        }

        await test.step('shows the empty training run table of an instance without runs', async () => {
            const table = SentinelTable.in(page);
            await table.waitUntilLoaded();
            for (const header of [/player/i, /start time/i, /end time/i, /run state/i, /duration/i, /sandbox id/i]) {
                await expect.soft(table.headerCell(header), `column ${header}`).toBeVisible();
            }
            await expect.soft(table.rows, 'training run rows').toHaveCount(0);
            await expect
                .soft(table.emptyState, 'empty state')
                .toContainText('No training runs in this instance yet');
            await checkpoint(page, 'empty run table');
        });

        await test.step('shows a breadcrumb back to the instance overview', async () => {
            await expect.soft(breadcrumbLink(page, 'Detail'), 'detail breadcrumb').toBeVisible();
        });

        await test.step('confirms copying the access token', async () => {
            await page.getByRole('button', { name: instance.accessToken }).click();
            await waitForNotification(page, 'Access token has been copied');
        });

        await test.step('opens the pool assigned to the instance', async () => {
            const poolName = `Pool ${instance.poolId}`;
            await page
                .getByRole('link', { name: poolName })
                .or(page.getByRole('button', { name: poolName }))
                .click();
            await expectUrlWhileLoading(page, new RegExp(`/pool/${instance.poolId}$`));
        });

        await test.step('shows the empty state message of the runs page of an instance without runs', async () => {
            await page.goto(`/linear-instance/${instance.id}/runs`);
            await waitForPageReady(page);
            const table = SentinelTable.in(page);
            await table.waitUntilLoaded();
            await expect.soft(table.emptyState, 'empty state').toContainText('No training runs in this instance yet');
            await expect.soft(table.rows, 'run rows').toHaveCount(0);
            await checkpoint(page, 'no training runs yet');
        });
    });
});
