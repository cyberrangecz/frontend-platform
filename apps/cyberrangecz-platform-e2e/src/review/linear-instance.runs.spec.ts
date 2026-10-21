import { expectRedirectedAway } from '../support/route-guard';
import { BROWSER_KEYS } from '../support/accounts';
import { test as emptyInstanceTest } from '../support/pages/training-instance/training-instance-test';
import { expect, test } from '../support/pages/review/review-test';
import { ACTIONS_COLUMN, expectColumnSortability, sortableHeaders } from '../support/pages/review/sort-headers';
import {
    ConfirmationDialog,
    errorDialog,
    SentinelTable,
    tableFilterInput,
    waitForPageReady,
} from '../support/ui';

const RUN_COLUMNS = [
    /^player$/i,
    /^start time$/i,
    /^end time$/i,
    /^run state$/i,
    /^duration$/i,
    /^sandbox id$/i,
    /^email$/i,
    /^event logging$/i,
    /^command logging$/i,
    ACTIONS_COLUMN,
];

test.describe('the run rows of the shared instance on the runs and the detail page', () => {
    test.use({ account: 'trainingOrganizer' });

    for (const pageName of ['runs', 'detail'] as const) {
        test.describe(`/linear-instance/:id/${pageName}`, () => {
            test.beforeEach(async ({ page, shared }) => {
                await page.goto(`/linear-instance/${shared.trainingInstance.id}/${pageName}`);
                await waitForPageReady(page);
                await SentinelTable.in(page).waitUntilLoaded();
            });

            test('lists one row for the trainee of each browser', async ({ page, reviewRuns }) => {
                const table = SentinelTable.in(page);
                for (const browser of BROWSER_KEYS) {
                    await expect(table.rowByText(reviewRuns[browser].traineeName)).toHaveCount(1);
                }
            });

            test('shows the finished state, end time and duration of a finished run', async ({
                page,
                browserKey,
                reviewRuns,
            }) => {
                const table = SentinelTable.in(page);
                const row = table.rowByText(reviewRuns[browserKey].traineeName);
                await expect(await table.cell(row, /^run state$/i)).toHaveText(/finished/i);
                await expect(await table.cell(row, /^end time$/i)).not.toHaveText('-');
                await expect(await table.cell(row, /^duration$/i)).not.toHaveText('-');
            });
        });
    }
});

test.describe('linear-instance.runs', () => {
    test.use({ account: 'trainingOrganizer' });

    test.beforeEach(async ({ page, shared }) => {
        await page.goto(`/linear-instance/${shared.trainingInstance.id}/runs`);
        await SentinelTable.in(page).waitUntilLoaded();
    });

    test('shows every run column of the training run table', async ({ page, checkpoint }) => {
        const table = SentinelTable.in(page);
        await expect(table.root.getByRole('columnheader')).toHaveCount(RUN_COLUMNS.length);
        for (const column of RUN_COLUMNS) {
            await expect(table.headerCell(column)).toBeVisible();
        }
        await checkpoint(page, 'training runs table loaded');
    });

    test('shows the trainee email of a run', async ({ page, browserKey, reviewRuns }) => {
        const table = SentinelTable.in(page);
        const run = reviewRuns[browserKey];
        const row = table.rowByText(run.traineeName);
        await expect(await table.cell(row, /^email$/i)).toHaveText(run.traineeMail);
    });

    test('shows the id of the sandbox the run played in', async ({
        page,
        browserKey,
        reviewRuns,
    }) => {
        const table = SentinelTable.in(page);
        const run = reviewRuns[browserKey];
        const row = table.rowByText(run.traineeName);
        expect(run.sandboxInstanceId, 'sandbox the run played in').not.toBeNull();
        await expect(await table.cell(row, /^sandbox id$/i)).toHaveText(String(run.sandboxInstanceId));
    });

    test('marks event logging and command logging of a run with the logged or the warning icon', async ({
        page,
        browserKey,
        reviewRuns,
    }) => {
        const table = SentinelTable.in(page);
        const run = reviewRuns[browserKey];
        const row = table.rowByText(run.traineeName);
        const eventCell = await table.cell(row, /^event logging$/i);
        const commandCell = await table.cell(row, /^command logging$/i);
        await expect(eventCell.locator('mat-icon')).toHaveText(run.eventLogging ? 'check' : 'warning');
        await expect(commandCell.locator('mat-icon')).toHaveText(
            run.commandLogging ? 'check' : 'warning',
        );
    });

    test('offers the delete action as the only action of a run row', async ({
        page,
        browserKey,
        reviewRuns,
    }) => {
        const table = SentinelTable.in(page);
        const row = table.rowByText(reviewRuns[browserKey].traineeName);
        await expect(row.locator('sentinel-table-actions button')).toHaveCount(1);
        await expect(table.rowAction(row, 'delete')).toBeVisible();
    });

    test('lists the runs by start time, newest first, on the initial load', async ({ page, reviewRuns }) => {
        const table = SentinelTable.in(page);
        const newestFirst = [...BROWSER_KEYS]
            .sort((left, right) => reviewRuns[right].startTime - reviewRuns[left].startTime)
            .map((browser) => reviewRuns[browser].traineeName);
        await expect(table.headerCell(/^start time$/i)).toHaveAttribute('aria-sort', 'descending');
        await expect.poll(() => table.columnTexts(/^player$/i)).toEqual(newestFirst);
    });

    test('reloads the runs without an error when sorted by each sortable column', async ({ page }) => {
        const table = SentinelTable.in(page);
        for (const column of [/^start time$/i, /^end time$/i, /^run state$/i]) {
            for (const direction of ['ascending', 'descending'] as const) {
                await table.sortTo(column, direction);
                await expect(errorDialog(page)).toHaveCount(0);
                await expect(table.rows).toHaveCount(BROWSER_KEYS.length);
            }
        }
    });

    test('offers sorting by start time, end time and run state only, and no filtering or row selection', async ({
        page,
    }) => {
        const table = SentinelTable.in(page);
        await expect(sortableHeaders(table)).toHaveCount(3);
        await expectColumnSortability(
            table,
            [/^start time$/i, /^end time$/i, /^run state$/i],
            [/^player$/i, /^duration$/i, /^sandbox id$/i, /^email$/i, /^event logging$/i, /^command logging$/i],
        );
        await expect(tableFilterInput(page)).toHaveCount(0);
        await expect(table.selectAllCheckbox).toHaveCount(0);
    });

    test('asks for confirmation naming the player before deleting a run', async ({
        page,
        browserKey,
        reviewRuns,
        checkpoint,
    }) => {
        const table = SentinelTable.in(page);
        const run = reviewRuns[browserKey];
        await table.rowAction(table.rowByText(run.traineeName), 'delete').click();
        const dialog = new ConfirmationDialog(page, 'Delete Sandbox Instance');
        await expect(dialog.message).toHaveText(
            `Do you want to delete sandbox instance and training run of player "${run.traineeName}"?`,
        );
        await expect(dialog.cancelButton).toHaveText(/Cancel/);
        await expect(dialog.confirmButton).toHaveText(/Delete/);
        await checkpoint(page, 'delete confirmation open');
    });

    test('keeps the run when the delete confirmation is cancelled', async ({
        page,
        apiAs,
        shared,
        browserKey,
        reviewRuns,
    }) => {
        const table = SentinelTable.in(page);
        const run = reviewRuns[browserKey];
        await table.rowAction(table.rowByText(run.traineeName), 'delete').click();
        const dialog = new ConfirmationDialog(page, 'Delete Sandbox Instance');
        await dialog.cancel();
        await expect(dialog.root).toBeHidden();
        await expect(table.rowByText(run.traineeName)).toHaveCount(1);
        await expect(errorDialog(page)).toHaveCount(0);
        const runs = await apiAs('trainingOrganizer').training.getAll<{ id: number }>(
            `/training-instances/${shared.trainingInstance.id}/training-runs`,
        );
        expect(runs.map((listed) => listed.id)).toContain(run.runId);
    });

    test('sends a trainee away from the runs page', async ({
        openAs,
        shared,
    }) => {
        await expectRedirectedAway(openAs, 'trainee', `/linear-instance/${shared.trainingInstance.id}/runs`);
    });
});

emptyInstanceTest.describe('linear-instance.runs of an instance without runs', () => {
    emptyInstanceTest.use({ account: 'trainingOrganizer' });

    emptyInstanceTest('shows the empty state message', async ({ page, createInstance, checkpoint }) => {
        const instance = await createInstance({ purpose: 'no-runs' });
        await page.goto(`/linear-instance/${instance.id}/runs`);
        await waitForPageReady(page);
        const table = SentinelTable.in(page);
        await table.waitUntilLoaded();
        await expect(table.emptyState).toContainText('No training runs in this instance yet');
        await expect(table.rows).toHaveCount(0);
        await checkpoint(page, 'no training runs yet');
    });
});
