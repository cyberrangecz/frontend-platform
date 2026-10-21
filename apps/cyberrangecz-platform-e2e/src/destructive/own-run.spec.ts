import { ApiError, type Api } from '../support/api/api-client';
import { expect, test } from '../support/fixtures';
import type { AllocationUnitRecord } from '../support/pages/pool/pool-data';
import { findChainRecordOfPool } from '../support/shared-fixture';
import {
    ConfirmationDialog,
    errorDialog,
    notificationPopups,
    SentinelTable,
} from '../support/ui';

interface OwnRunPayload {
    id: number;
    state: string;
    participant_ref: { full_name: string };
}

const BACKEND_STATE_TIMEOUT_MILLISECONDS = 40_000;
const BACKEND_STATE_INTERVALS = [1_000, 2_000, 4_000];

test.describe('own run of the browser (destructive)', () => {
    test.use({ account: 'trainingOrganizer' });
    test.describe.configure({ mode: 'serial', retries: 0 });

    let runId: number;
    let runAllocationUnitId: number | undefined;

    test.beforeEach(({ browserKey, shared }) => {
        const record = findChainRecordOfPool(browserKey, shared.pool.id);
        expect(record, `chain record of the ${browserKey} browser for this suite run`).toBeDefined();
        expect(record?.trainingRunId, 'training run the browser played').toBeDefined();
        runId = record?.trainingRunId as number;
        runAllocationUnitId = record?.trainingRunAllocationUnitId;
    });

    async function readOwnRun(api: Api, instanceId: number): Promise<OwnRunPayload | undefined> {
        const runs = await api.training.getAll<OwnRunPayload>(`/training-instances/${instanceId}/training-runs`);
        return runs.find((run) => run.id === runId);
    }

    async function statusOfRun(api: Api): Promise<number> {
        try {
            await api.training.get(`/training-runs/${runId}`);
            return 200;
        } catch (error) {
            return error instanceof ApiError ? error.status : -1;
        }
    }

    /** A sandbox whose removal has started has a cleanup request, or is already gone. */
    async function sandboxRemovalStarted(api: Api, allocationUnitId: number): Promise<boolean> {
        try {
            const unit = await api.sandbox.get<AllocationUnitRecord>(`/sandbox-allocation-units/${allocationUnitId}`);
            return unit.cleanup_request !== null;
        } catch (error) {
            if (error instanceof ApiError && error.status === 404) {
                return true;
            }
            throw error;
        }
    }

    test('archives the run and shows it as archived on the runs page', async ({ page, apiAs, shared, checkpoint }) => {
        const api = apiAs('trainingOrganizer');
        await api.training.patch(`/training-runs/${runId}/archive`);
        const run = await readOwnRun(api, shared.trainingInstance.id);
        expect(run?.state).toBe('ARCHIVED');
        await page.goto(`/linear-instance/${shared.trainingInstance.id}/runs`);
        const table = SentinelTable.in(page);
        await table.waitUntilLoaded();
        const row = table.rowByText(run?.participant_ref.full_name ?? '');
        await expect(await table.cell(row, /^run state$/i)).toHaveText(/archived/i);
        await checkpoint(page, 'own run archived');
    });

    test('deletes the archived run with its sandbox through the runs page', async ({
        page,
        apiAs,
        shared,
        checkpoint,
    }) => {
        const api = apiAs('trainingOrganizer');
        const run = await readOwnRun(api, shared.trainingInstance.id);
        expect(run, 'archived run still listed before the delete').toBeDefined();
        expect(runAllocationUnitId, 'sandbox the platform assigned to the run').toBeDefined();
        const playerName = run?.participant_ref.full_name ?? '';
        await page.goto(`/linear-instance/${shared.trainingInstance.id}/runs`);
        const table = SentinelTable.in(page);
        await table.waitUntilLoaded();
        await table.rowAction(table.rowByText(playerName), 'delete').click();
        const dialog = new ConfirmationDialog(page, 'Delete Sandbox Instance');
        await expect(dialog.message).toHaveText(
            `Delete the archived training run of player "${playerName}" and its previous sandbox instance? Archiving the run kept the sandbox instance; this deletes it.`,
        );
        await dialog.confirm();
        await expect(
            notificationPopups(page).filter({ hasText: 'Deleting of sandbox instance started' }),
        ).toBeVisible();
        await expect(errorDialog(page)).toHaveCount(0);
        await expect(table.rowByText(playerName)).toHaveCount(0);
        await checkpoint(page, 'own run deleted');

        await expect(async () => {
            expect(await readOwnRun(api, shared.trainingInstance.id)).toBeUndefined();
        }).toPass({ timeout: BACKEND_STATE_TIMEOUT_MILLISECONDS, intervals: BACKEND_STATE_INTERVALS });
        await expect
            .poll(() => statusOfRun(api), {
                timeout: BACKEND_STATE_TIMEOUT_MILLISECONDS,
                intervals: BACKEND_STATE_INTERVALS,
            })
            .toBe(404);
        await expect(async () => {
            const removalStarted = await sandboxRemovalStarted(
                apiAs('sandboxOrganizer'),
                runAllocationUnitId as number,
            );
            expect(removalStarted, 'sandbox of the deleted run is being removed').toBe(true);
        }).toPass({ timeout: BACKEND_STATE_TIMEOUT_MILLISECONDS, intervals: BACKEND_STATE_INTERVALS });
    });
});
