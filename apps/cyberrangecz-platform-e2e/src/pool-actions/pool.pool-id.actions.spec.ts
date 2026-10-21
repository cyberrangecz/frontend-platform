import type { Page } from '@playwright/test';
import type { ApiClient } from '../support/api/api-client';
import { expect, test } from '../support/fixtures';
import { AllocateDialog } from '../support/pages/pool/allocate-dialog';
import { answerConfirmation, expectNoConfirmation, poolConfirmations } from '../support/pages/pool/pool-confirmation';
import {
    createPoolOnDefinition,
    findAllocationUnit,
    isBuildFinished,
    listAllocationUnits,
    listSandboxes,
    poolExists,
    type PoolRecord,
} from '../support/pages/pool/pool-data';
import { PoolDetailPage } from '../support/pages/pool/pool-detail-page';
import { PoolOverviewPage } from '../support/pages/pool/pool-overview-page';

test.use({ account: 'sandboxOrganizer' });

const POOL_SIZE = 2;
const TEST_TIMEOUT_MILLISECONDS = 20 * 60_000;
const BACKEND_WAIT_MILLISECONDS = 15 * 60_000;
const POLL_INTERVAL_MILLISECONDS = 10_000;

async function waitUntil(
    description: string,
    condition: () => Promise<boolean>,
    timeout = BACKEND_WAIT_MILLISECONDS,
): Promise<void> {
    await expect
        .poll(condition, { message: description, timeout, intervals: [POLL_INTERVAL_MILLISECONDS] })
        .toBe(true);
}

/** Waits until the pool holds exactly two sandboxes whose builds finished and returns their unit ids, ascending. */
async function waitForBuiltPair(sandbox: ApiClient, poolId: number): Promise<[number, number]> {
    await waitUntil('both sandbox builds finished', async () => {
        const units = await listAllocationUnits(sandbox, poolId);
        const sandboxes = await listSandboxes(sandbox, poolId);
        return units.length === POOL_SIZE && units.every(isBuildFinished) && sandboxes.length === POOL_SIZE;
    });
    const [first, second] = (await listAllocationUnits(sandbox, poolId)).map((unit) => unit.id).sort((a, b) => a - b);
    if (first === undefined || second === undefined) {
        throw new Error(`Pool ${poolId} lacks its two allocation units`);
    }
    return [first, second];
}

async function waitForUnitRemoval(sandbox: ApiClient, poolId: number, allocationUnitId: number): Promise<void> {
    await waitUntil(`sandbox ${allocationUnitId} removed`, async () => {
        return (await findAllocationUnit(sandbox, poolId, allocationUnitId)) === undefined;
    });
}

/** Allocates the whole pool through the allocate dialog and fails naming the status when the allocation request is refused. */
async function allocateThroughDialog(page: Page, detail: PoolDetailPage, poolId: number): Promise<void> {
    const dialog = await AllocateDialog.openFrom(page, detail.allocateButton);
    await expect(dialog.sizeInput).toHaveValue(String(POOL_SIZE));
    const allocation = await dialog.allocate(poolId);
    expect(allocation.status(), 'status of the allocation request').toBe(200);
    await expect(dialog.root).toBeHidden();
}

test.describe.configure({ mode: 'serial', timeout: TEST_TIMEOUT_MILLISECONDS });

test.describe('pool.pool-id (sandbox actions on an own pool of 2)', () => {
    let pool: PoolRecord;
    let detail: PoolDetailPage;
    let firstUnitId: number;
    let secondUnitId: number;

    test.beforeEach(async ({ page }) => {
        detail = new PoolDetailPage(page);
        if (pool) {
            await detail.open(pool.id);
        }
    });

    test('allocates 2 sandboxes through the allocate dialog and waits for both builds', async ({
        page,
        apiAs,
        shared,
        uniqueName,
        attemptLedger,
        checkpoint,
    }) => {
        const sandbox = apiAs('sandboxOrganizer').sandbox;
        pool = await createPoolOnDefinition(sandbox, shared.sandboxDefinition.id, {
            maxSize: POOL_SIZE,
            comment: uniqueName('pool-actions'),
        });
        attemptLedger.recordPool(pool.id);
        await detail.open(pool.id);
        await expect(detail.allocateButton).toHaveText(/Allocate Sandboxes/);
        await allocateThroughDialog(page, detail, pool.id);
        await expect(detail.table.rows).toHaveCount(POOL_SIZE);
        [firstUnitId, secondUnitId] = await waitForBuiltPair(sandbox, pool.id);
        await expect(detail.rowOf(firstUnitId)).toContainText('build finished');
        await expect(detail.rowOf(secondUnitId)).toContainText('build finished');
        await expect(detail.allocateButton).toBeDisabled();
        await checkpoint(page, 'two sandboxes built');
    });

    test('offers nothing to delete under Delete Failed while no sandbox failed', async ({ page, apiAs }) => {
        const units = await listAllocationUnits(apiAs('sandboxOrganizer').sandbox, pool.id);
        expect(units.some((unit) => unit.allocation_request.stages.includes('FAILED'))).toBe(false);
        await expect(detail.deleteMenuButton).toBeEnabled();
        await detail.deleteMenuButton.click();
        await expect(detail.deleteMenuEntry('Delete Failed')).toBeDisabled();
        await expect(detail.deleteMenuEntry('Delete All')).toBeEnabled();
        await expect(detail.deleteMenuEntry('Delete Unlocked')).toBeEnabled();
        await page.keyboard.press('Escape');
    });

    test('locks a sandbox directly from its row action and shows it locked in the table and the API', async ({
        page,
        apiAs,
        checkpoint,
    }) => {
        const sandbox = apiAs('sandboxOrganizer').sandbox;
        const row = detail.rowOf(firstUnitId);
        await detail.clickSandboxAction(row, 'Lock');
        await expectNoConfirmation(page);
        await expect(await detail.table.cell(row, /^lock$/i)).toHaveText('locked');
        await expect
            .poll(async () => (await findAllocationUnit(sandbox, pool.id, firstUnitId))?.locked)
            .toBe(true);
        await expect(detail.table.rowAction(row, 'lock_open')).toBeEnabled();
        await expect(detail.table.rowAction(row, 'delete')).toBeDisabled();
        await checkpoint(page, 'first sandbox locked');
    });

    test('keeps the sandbox locked when its unlock confirmation is cancelled', async ({ page, apiAs }) => {
        const sandbox = apiAs('sandboxOrganizer').sandbox;
        const row = detail.rowOf(firstUnitId);
        await detail.clickSandboxAction(row, 'Unlock');
        await answerConfirmation(page, poolConfirmations.unlockSandbox(firstUnitId), 'cancel');
        await expect(await detail.table.cell(row, /^lock$/i)).toHaveText('locked');
        expect((await findAllocationUnit(sandbox, pool.id, firstUnitId))?.locked).toBe(true);
    });

    test('unlocks the sandbox after its confirmation and shows it unlocked in the table and the API', async ({
        page,
        apiAs,
    }) => {
        const sandbox = apiAs('sandboxOrganizer').sandbox;
        const row = detail.rowOf(firstUnitId);
        await detail.clickSandboxAction(row, 'Unlock');
        await answerConfirmation(page, poolConfirmations.unlockSandbox(firstUnitId), 'confirm');
        await expect(await detail.table.cell(row, /^lock$/i)).toHaveText('unlocked');
        await expect
            .poll(async () => (await findAllocationUnit(sandbox, pool.id, firstUnitId))?.locked)
            .toBe(false);
        await expect(detail.table.rowAction(row, 'delete')).toBeEnabled();
    });

    test('deletes one sandbox directly from its row action and removes it from the table and the API', async ({
        page,
        apiAs,
    }) => {
        const sandbox = apiAs('sandboxOrganizer').sandbox;
        await detail.clickSandboxAction(detail.rowOf(firstUnitId), 'Delete');
        await expectNoConfirmation(page);
        await waitForUnitRemoval(sandbox, pool.id, firstUnitId);
        await expect(detail.rowOf(firstUnitId)).toHaveCount(0);
        await expect(detail.rowOf(secondUnitId)).toBeVisible();
        expect(await findAllocationUnit(sandbox, pool.id, secondUnitId)).toBeDefined();
    });

    test('deletes every remaining sandbox through Delete All after its confirmation', async ({ page, apiAs }) => {
        const sandbox = apiAs('sandboxOrganizer').sandbox;
        await detail.chooseDeleteMenuEntry('Delete All');
        await answerConfirmation(page, poolConfirmations.deleteAllSandboxes(pool.id), 'confirm');
        await waitForUnitRemoval(sandbox, pool.id, secondUnitId);
        await expect(detail.table.rows).toHaveCount(0);
        await expect(detail.allocateButton).toBeEnabled();
    });

    test('allocates 2 sandboxes again through the allocate dialog and waits for both builds', async ({
        page,
        apiAs,
    }) => {
        await allocateThroughDialog(page, detail, pool.id);
        [firstUnitId, secondUnitId] = await waitForBuiltPair(apiAs('sandboxOrganizer').sandbox, pool.id);
        await expect(detail.rowOf(firstUnitId)).toContainText('build finished');
        await expect(detail.rowOf(secondUnitId)).toContainText('build finished');
    });

    test('deletes only the unlocked sandbox through Delete Unlocked and keeps the locked one', async ({
        page,
        apiAs,
    }) => {
        const sandbox = apiAs('sandboxOrganizer').sandbox;
        await detail.clickSandboxAction(detail.rowOf(firstUnitId), 'Lock');
        await expectNoConfirmation(page);
        await expect
            .poll(async () => (await findAllocationUnit(sandbox, pool.id, firstUnitId))?.locked)
            .toBe(true);
        await detail.chooseDeleteMenuEntry('Delete Unlocked');
        await answerConfirmation(page, poolConfirmations.deleteUnlockedSandboxes(pool.id), 'confirm');
        await waitForUnitRemoval(sandbox, pool.id, secondUnitId);
        await expect(detail.rowOf(secondUnitId)).toHaveCount(0);
        await expect(detail.rowOf(firstUnitId)).toBeVisible();
        expect((await findAllocationUnit(sandbox, pool.id, firstUnitId))?.locked).toBe(true);
    });

    test('deletes the pool together with its allocation after its confirmation', async ({ page, apiAs }) => {
        const sandbox = apiAs('sandboxOrganizer').sandbox;
        await detail.clickSandboxAction(detail.rowOf(firstUnitId), 'Unlock');
        await answerConfirmation(page, poolConfirmations.unlockSandbox(firstUnitId), 'confirm');
        await expect
            .poll(async () => (await findAllocationUnit(sandbox, pool.id, firstUnitId))?.locked)
            .toBe(false);
        expect(await listAllocationUnits(sandbox, pool.id)).not.toHaveLength(0);

        const overview = new PoolOverviewPage(page);
        await overview.open();
        const row = await overview.showPool(pool.id);
        await overview.table.clickRowAction(row, { icon: 'delete', label: 'Delete' });
        await answerConfirmation(page, poolConfirmations.deletePoolWithAllocations(pool.id), 'confirm');

        await waitUntil(`pool ${pool.id} removed`, async () => !(await poolExists(sandbox, pool.id)));
        await expect(overview.rowOf(pool.id)).toHaveCount(0);
    });
});
