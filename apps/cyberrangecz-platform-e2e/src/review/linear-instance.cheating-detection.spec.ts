import {
    CHEATING_THRESHOLDS,
    CheatingDetectionOverview,
    createFinishedDetection,
    detectionEventsUrl,
    detectionsOf,
    eventsOf,
    detectionStateByThreshold,
    findDetectionByThreshold,
    waitForFinishedDetection,
} from '../support/pages/review/cheating-detection';
import { expect, test } from '../support/pages/review/cheating-detection-test';
import { ACTIONS_COLUMN, expectColumnSortability, sortableHeaders } from '../support/pages/review/sort-headers';
import {
    captureDownload,
    ConfirmationDialog,
    control,
    errorDialog,
    hoverTooltipTrigger,
    notificationPopups,
    visibleTooltip,
    waitForNotification,
} from '../support/ui';

const DETECTION_COLUMNS = [
    /^id$/i,
    /^executed at$/i,
    /^executed by$/i,
    /^state$/i,
    /^results$/i,
    /^stages$/i,
    ACTIONS_COLUMN,
];

const STAGE_TOOLTIPS = [
    /^Answer similarity detection: /,
    /^Location proximity detection: /,
    /^Time proximity detection: /,
    /^Minimal solve time detection: /,
    /^No commands detection: /,
    /^Forbidden commands detection: /,
];

const MERGED_TEST_TIMEOUT_MILLISECONDS = 300_000;
const RERUN_START_TIMEOUT_MILLISECONDS = 5_000;

test.describe('linear-instance.cheating-detection', () => {
    test.use({ account: 'trainingOrganizer' });
    test.describe.configure({ timeout: MERGED_TEST_TIMEOUT_MILLISECONDS });

    test('checks the cheating detection overview of the shared instance', async ({
        page,
        apiAs,
        shared,
        ownDetection,
        checkpoint,
    }) => {
        expect(ownDetection.current_state).toBe('FINISHED');
        const overview = new CheatingDetectionOverview(page, shared.trainingInstance.id);
        await overview.openShowingEveryDetection();
        const table = overview.table;

        await test.step('shows every column of the cheating detection table', async () => {
            await expect.soft(table.root.getByRole('columnheader'), 'column count').toHaveCount(DETECTION_COLUMNS.length);
            for (const column of DETECTION_COLUMNS) {
                await expect.soft(table.headerCell(column), `column ${column}`).toBeVisible();
            }
            await checkpoint(page, 'cheating detection overview loaded');
        });

        await test.step('starts sorted by the execution time, newest first', async () => {
            await expect
                .soft(table.headerCell(/^executed at$/i), 'execution time header sort')
                .toHaveAttribute('aria-sort', 'descending');
        });

        await test.step('offers sorting by id, execution time, executor, state and results, and no row selection', async () => {
            await expectColumnSortability(
                table,
                [/^id$/i, /^executed at$/i, /^executed by$/i, /^state$/i, /^results$/i],
                [/^stages$/i],
            );
            await expect.soft(sortableHeaders(table), 'sortable headers').toHaveCount(5);
            await expect.soft(table.selectAllCheckbox, 'select all checkbox').toHaveCount(0);
        });

        await test.step('lists a finished detection with its id, state and executor', async () => {
            const row = await overview.rowOf(ownDetection.id);
            await expect.soft(row, 'detection row').toHaveCount(1);
            await expect.soft(await table.cell(row, /^state$/i), 'state').toHaveText(/finished/i);
            await expect.soft(await table.cell(row, /^executed by$/i), 'executor').not.toHaveText('');
            await expect.soft(await table.cell(row, /^executed at$/i), 'execution time').not.toHaveText('');
        });

        await test.step('shows the number of detection events as the results of a finished detection', async () => {
            const events = await eventsOf(apiAs('trainingOrganizer'), shared.trainingInstance.id, ownDetection.id);
            expect.soft(events.length, 'detection events').toBeGreaterThan(0);
            const row = await overview.rowOf(ownDetection.id);
            await expect.soft(await table.cell(row, /^results$/i), 'results').toHaveText(String(events.length));
        });

        await test.step('shows one stage icon per detection method', async () => {
            const row = await overview.rowOf(ownDetection.id);
            await expect.soft(overview.stageIcons(row), 'stage icons').toHaveCount(STAGE_TOOLTIPS.length);
        });

        await test.step('marks the enabled time proximity stage as finished and the others as disabled', async () => {
            const row = await overview.rowOf(ownDetection.id);
            const icons = overview.stageIcons(row);
            for (let index = 0; index < STAGE_TOOLTIPS.length; index++) {
                await expect
                    .soft(icons.nth(index).locator('mat-icon'), `stage icon ${index + 1}`)
                    .toHaveText(index === 2 ? 'check' : 'block');
            }
        });

        await test.step('names the method and the proximity threshold in the time proximity stage tooltip', async () => {
            const row = await overview.rowOf(ownDetection.id);
            await hoverTooltipTrigger(page, overview.stageIcons(row).nth(2));
            await expect
                .soft(visibleTooltip(page), 'stage tooltip')
                .toHaveText(
                    new RegExp(
                        `^Time proximity detection: FINISHED proximity: ${ownDetection.proximity_threshold} sec$`,
                        'i',
                    ),
                );
        });

        await test.step('offers results, archive, run again and delete as the actions of a finished detection', async () => {
            const row = await overview.rowOf(ownDetection.id);
            for (const icon of ['assessment', 'cloud_download', 'run_circle', 'delete']) {
                await expect.soft(table.rowAction(row, icon), `${icon} action`).toBeVisible();
            }
        });

        await test.step('downloads the archive of a detection as a zip file', async () => {
            const row = await overview.rowOf(ownDetection.id);
            const download = await captureDownload(page, () => table.rowAction(row, 'cloud_download').click());
            expect.soft(download.fileName, 'file name').toMatch(/\.zip$/);
            expect.soft(download.size, 'file size').toBeGreaterThan(0);
            await expect.soft(errorDialog(page), 'error dialog').toHaveCount(0);
        });

        await test.step('reloads the detections without an error when sorted by each sortable column', async () => {
            for (const column of [/^id$/i, /^executed at$/i, /^executed by$/i, /^state$/i, /^results$/i]) {
                for (const direction of ['ascending', 'descending'] as const) {
                    await table.sortTo(column, direction);
                    await expect.soft(errorDialog(page), 'error dialog').toHaveCount(0);
                    await expect.soft(await overview.rowOf(ownDetection.id), 'detection row').toHaveCount(1);
                }
            }
        });

        await test.step('opens the detection events of a detection from the results action', async () => {
            const row = await overview.rowOf(ownDetection.id);
            await table.rowAction(row, 'assessment').click();
            await expect(page).toHaveURL(
                new RegExp(`${detectionEventsUrl(shared.trainingInstance.id, ownDetection.id)}$`),
            );
        });

        await test.step('opens the create form from the Create Cheating Detection control', async () => {
            await overview.openShowingEveryDetection();
            await control(page, 'Create Cheating Detection').click();
            await expect(page).toHaveURL(
                new RegExp(`/linear-instance/${shared.trainingInstance.id}/cheating-detection/create$`),
            );
        });
    });

    test('confirms, cancels, reruns and deletes a detection of the shared instance', async ({
        page,
        apiAs,
        shared,
        browserKey,
        checkpoint,
    }) => {
        const api = apiAs('trainingOrganizer');
        const threshold = CHEATING_THRESHOLDS[browserKey].disposable;
        const disposable =
            (await findDetectionByThreshold(api, shared.trainingInstance.id, threshold)) ??
            (await createFinishedDetection(api, shared.trainingInstance.id, threshold));
        await waitForFinishedDetection(api, shared.trainingInstance.id, threshold);
        const overview = new CheatingDetectionOverview(page, shared.trainingInstance.id);
        await overview.openShowingEveryDetection();
        const dialog = new ConfirmationDialog(page, 'Delete Cheating Detection');

        await test.step('asks for confirmation naming the detection before deleting it', async () => {
            const row = await overview.rowOf(disposable.id);
            await overview.table.rowAction(row, 'delete').click();
            await expect.soft(dialog.message, 'confirmation message').toHaveText(
                `Do you want to delete cheating detection "${disposable.id}"?`,
            );
            await expect.soft(dialog.cancelButton, 'cancel button').toHaveText(/Cancel/);
            await expect.soft(dialog.confirmButton, 'confirm button').toHaveText(/Delete/);
            await checkpoint(page, 'delete cheating detection confirmation open');
        });

        await test.step('keeps the detection when the delete confirmation is cancelled', async () => {
            await dialog.cancel();
            await expect(dialog.root).toBeHidden();
            await expect.soft(await overview.rowOf(disposable.id), 'detection row').toHaveCount(1);
            const detections = await detectionsOf(api, shared.trainingInstance.id);
            expect.soft(detections.map((detection) => detection.id), 'listed detections').toContain(disposable.id);
        });

        await test.step('reruns a detection and reports it', async () => {
            const row = await overview.rowOf(disposable.id);
            await overview.table.rowAction(row, 'run_circle').click();
            const notification = await waitForNotification(page, 'Cheating Detection was re-executed.');
            expect.soft(notification.kind, 'notification kind').toBe('success');
        });

        await test.step('waits until the rerun detection finished', async () => {
            await expect
                .poll(() => detectionStateByThreshold(api, shared.trainingInstance.id, threshold), {
                    timeout: RERUN_START_TIMEOUT_MILLISECONDS,
                    intervals: [250, 500],
                })
                .not.toBe('FINISHED')
                .catch(() => undefined);
            await waitForFinishedDetection(api, shared.trainingInstance.id, threshold);
        });

        await test.step('deletes a detection after confirmation, reports it and removes it from the instance', async () => {
            await overview.openShowingEveryDetection();
            const row = await overview.rowOf(disposable.id);
            await overview.table.rowAction(row, 'delete').click();
            await dialog.confirm();
            await expect(
                notificationPopups(page).filter({ hasText: 'Cheating Detection was deleted' }),
            ).toBeVisible();
            await expect.soft(await overview.rowOf(disposable.id), 'detection row').toHaveCount(0);
            await checkpoint(page, 'cheating detection deleted');
            await expect(async () => {
                const detections = await detectionsOf(api, shared.trainingInstance.id);
                expect(detections.map((detection) => detection.id)).not.toContain(disposable.id);
            }).toPass({ timeout: 30_000, intervals: [1_000, 2_000] });
        });
    });
});
