import { BROWSER_KEYS } from '../support/accounts';
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

test.describe('linear-instance.runs', () => {
    test.use({ account: 'trainingOrganizer' });

    test('checks the runs page of the shared instance', async ({
        page,
        apiAs,
        shared,
        browserKey,
        reviewRuns,
        checkpoint,
    }) => {
        test.setTimeout(240_000);
        await page.goto(`/linear-instance/${shared.trainingInstance.id}/runs`);
        await waitForPageReady(page);
        const table = SentinelTable.in(page);
        await table.waitUntilLoaded();
        const run = reviewRuns[browserKey];
        const row = table.rowByText(run.traineeName);
        const newestFirst = [...BROWSER_KEYS]
            .sort((left, right) => reviewRuns[right].startTime - reviewRuns[left].startTime)
            .map((browser) => reviewRuns[browser].traineeName);

        await test.step('lists one row for the trainee of each browser', async () => {
            for (const browser of BROWSER_KEYS) {
                await expect
                    .soft(table.rowByText(reviewRuns[browser].traineeName), `row of the ${browser} trainee`)
                    .toHaveCount(1);
            }
        });

        await test.step('shows the finished state, end time and duration of a finished run', async () => {
            await expect.soft(await table.cell(row, /^run state$/i), 'run state').toHaveText(/finished/i);
            await expect.soft(await table.cell(row, /^end time$/i), 'end time').not.toHaveText('-');
            await expect.soft(await table.cell(row, /^duration$/i), 'duration').not.toHaveText('-');
        });

        await test.step('shows every run column of the training run table', async () => {
            await expect.soft(table.root.getByRole('columnheader'), 'column count').toHaveCount(RUN_COLUMNS.length);
            for (const column of RUN_COLUMNS) {
                await expect.soft(table.headerCell(column), `column ${column}`).toBeVisible();
            }
            await checkpoint(page, 'training runs table loaded');
        });

        await test.step('shows the trainee email of a run', async () => {
            await expect.soft(await table.cell(row, /^email$/i), 'email').toHaveText(run.traineeMail);
        });

        await test.step('shows the id of the sandbox the run played in', async () => {
            expect.soft(run.sandboxInstanceId, 'sandbox the run played in').not.toBeNull();
            await expect.soft(await table.cell(row, /^sandbox id$/i), 'sandbox id').toHaveText(String(run.sandboxInstanceId));
        });

        await test.step('marks event logging and command logging of a run with the logged or the warning icon', async () => {
            const eventCell = await table.cell(row, /^event logging$/i);
            const commandCell = await table.cell(row, /^command logging$/i);
            await expect
                .soft(eventCell.locator('mat-icon'), 'event logging icon')
                .toHaveText(run.eventLogging ? 'check' : 'warning');
            await expect
                .soft(commandCell.locator('mat-icon'), 'command logging icon')
                .toHaveText(run.commandLogging ? 'check' : 'warning');
        });

        await test.step('offers the delete action as the only action of a run row', async () => {
            await expect.soft(row.locator('sentinel-table-actions button'), 'row actions').toHaveCount(1);
            await expect.soft(table.rowAction(row, 'delete'), 'delete action').toBeVisible();
        });

        await test.step('lists the runs by start time, newest first, on the initial load', async () => {
            await expect
                .soft(table.headerCell(/^start time$/i), 'start time header sort')
                .toHaveAttribute('aria-sort', 'descending');
            await expect
                .configure({ soft: true })
                .poll(() => table.columnTexts(/^player$/i), { message: 'run order' })
                .toEqual(newestFirst);
        });

        await test.step('offers sorting by start time, end time and run state only, and no filtering or row selection', async () => {
            await expect.soft(sortableHeaders(table), 'sortable headers').toHaveCount(3);
            await expectColumnSortability(
                table,
                [/^start time$/i, /^end time$/i, /^run state$/i],
                [/^player$/i, /^duration$/i, /^sandbox id$/i, /^email$/i, /^event logging$/i, /^command logging$/i],
            );
            await expect.soft(tableFilterInput(page), 'filter input').toHaveCount(0);
            await expect.soft(table.selectAllCheckbox, 'select all checkbox').toHaveCount(0);
        });

        await test.step('reloads the runs without an error when sorted by each sortable column', async () => {
            for (const column of [/^start time$/i, /^end time$/i, /^run state$/i]) {
                for (const direction of ['ascending', 'descending'] as const) {
                    await table.sortTo(column, direction);
                    await expect.soft(errorDialog(page), 'error dialog').toHaveCount(0);
                    await expect.soft(table.rows, 'run rows').toHaveCount(BROWSER_KEYS.length);
                }
            }
        });

        const dialog = new ConfirmationDialog(page, 'Delete Sandbox Instance');

        await test.step('asks for confirmation naming the player before deleting a run', async () => {
            await table.rowAction(row, 'delete').click();
            await expect
                .soft(dialog.message, 'confirmation message')
                .toHaveText(`Do you want to delete sandbox instance and training run of player "${run.traineeName}"?`);
            await expect.soft(dialog.cancelButton, 'cancel button').toHaveText(/Cancel/);
            await expect.soft(dialog.confirmButton, 'confirm button').toHaveText(/Delete/);
            await checkpoint(page, 'delete confirmation open');
        });

        await test.step('keeps the run when the delete confirmation is cancelled', async () => {
            await dialog.cancel();
            await expect(dialog.root).toBeHidden();
            await expect.soft(row, 'run row').toHaveCount(1);
            await expect.soft(errorDialog(page), 'error dialog').toHaveCount(0);
            const runs = await apiAs('trainingOrganizer').training.getAll<{ id: number }>(
                `/training-instances/${shared.trainingInstance.id}/training-runs`,
            );
            expect.soft(runs.map((listed) => listed.id), 'listed runs').toContain(run.runId);
        });
    });
});
