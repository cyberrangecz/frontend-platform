import { expect, Page, test } from '@playwright/test';
import { poolTest } from '../support/pool-fixture';
import {
    ADMIN_REQUIREMENT,
    allocateUnits,
    hasUnfinishedAllocation,
    isBuilding,
    isQueued,
    isReady,
    listUnits,
    ORGANIZER_REQUIREMENT,
    sandboxRepairEnvironment,
    waitForPoolToDrain,
    waitForUnits,
} from '../support/sandbox-repair-support';

/**
 * Cancel all allocations of the pool detail against a deployed platform.
 *
 * Required environment (the F07_* name is read when the F09_* name is unset):
 *   F09_PLATFORM_ORIGIN         origin of the deployed frontend (F07_PLATFORM_ORIGIN)
 *   F09_ADMIN_USERNAME          account holding the sandbox administrator role (F07_ADMIN_USERNAME)
 *   F09_ADMIN_PASSWORD          password of that account (F07_ADMIN_PASSWORD)
 *   F09_SANDBOX_DEFINITION_ID   id of the sandbox definition the test pools are built from (F07_SANDBOX_DEFINITION_ID)
 * Optional environment:
 *   F09_ORGANIZER_USERNAME      account holding the sandbox organizer role; the organizer tests are skipped without it
 *   F09_ORGANIZER_PASSWORD      password of that account
 *   F09_BUILD_TIMEOUT_MS        longest wait for a build or a cleanup (F07_BUILD_TIMEOUT_MS)
 *
 * The cloud project must have room for 4 sandboxes. The tests create pools commented
 * `F09-cancel-allocations-*` and remove them again. Run the F-09 specs with one worker.
 */
const { origin, adminAccount, organizerAccount } = sandboxRepairEnvironment;
const POOL_COMMENT = 'F09-cancel-allocations-';
const QUEUED_UNIT_COUNT = 4;
const CANCEL_REQUEST_SETTLE_MS = 2_000;

test.skip(adminAccount === undefined, ADMIN_REQUIREMENT);
test.use({ baseURL: origin });
test.describe.configure({ mode: 'serial' });

const cancelControl = (page: Page) => page.getByRole('button', { name: 'Cancel all allocations' });
const confirmDialog = (page: Page) => page.getByRole('dialog');
const cancellationToast = (page: Page) => page.getByText(/\d+ allocations? cancelled|\d+ stop pending|\d+ already finished|\d+ failed|No allocation to cancel/).first();

/** Counts the Cancel all allocations requests the page sends from now on. */
function countCancelRequests(page: Page): () => number {
    let sent = 0;
    page.on('request', (request) => {
        if (request.method() === 'POST' && /\/pools\/\d+\/cancel-allocations/.test(request.url())) {
            sent++;
        }
    });
    return () => sent;
}

/** Opens the pool detail and the confirmation of Cancel all allocations. */
async function openCancelConfirmation(page: Page, poolId: number): Promise<void> {
    await page.goto(`/pool/${poolId}`);
    await expect(cancelControl(page)).toBeEnabled();
    await cancelControl(page).click();
    await expect(confirmDialog(page)).toBeVisible();
}

test.describe('Cancel all allocations as administrator', () => {
    poolTest.use({ poolAccount: adminAccount, poolSize: 2, poolComment: POOL_COMMENT });

    poolTest('the confirmation names the whole pool, the shown counts and the consequences', async ({ page, poolId }) => {
        await allocateUnits(page, poolId, 1);

        await openCancelConfirmation(page, poolId);

        const dialog = confirmDialog(page);
        await expect(dialog).toContainText(`Cancel all allocations of pool ${poolId}?`);
        await expect(dialog).toContainText(/This page shows 1 queued and 0 running\.|This page shows 0 queued and 1 running\./);
        await expect(dialog).toContainText(`Every queued allocation of pool ${poolId} is removed`);
        await expect(dialog).toContainText('Ready sandboxes stay.');
        await expect(dialog.getByRole('button')).toHaveText(['Keep allocations', 'Cancel allocations']);
    });

    poolTest('Keep allocations changes nothing', async ({ page, poolId }) => {
        await allocateUnits(page, poolId, 2);
        const before = (await listUnits(page, poolId)).map(unit => unit.id).sort((first, second) => first - second);
        await openCancelConfirmation(page, poolId);
        const cancelRequestsSent = countCancelRequests(page);

        await confirmDialog(page).getByRole('button', { name: 'Keep allocations' }).click();

        await expect(confirmDialog(page)).toBeHidden();
        await page.waitForTimeout(CANCEL_REQUEST_SETTLE_MS);
        expect(cancelRequestsSent()).toBe(0);
        await expect(cancellationToast(page)).toBeHidden();
        const after = (await listUnits(page, poolId)).map(unit => unit.id).sort((first, second) => first - second);
        expect(after).toEqual(before);
        expect((await listUnits(page, poolId)).some(unit => unit.cleanup_request !== null)).toBe(false);
    });

    poolTest('confirming leaves the pool with no running allocation and no sandbox', async ({ page, poolId }) => {
        await allocateUnits(page, poolId, 2);
        await openCancelConfirmation(page, poolId);

        await confirmDialog(page).getByRole('button', { name: 'Cancel allocations' }).click();

        await expect(cancellationToast(page)).toBeVisible();
        await waitForUnits(page, poolId, units => !units.some(hasUnfinishedAllocation));
        await waitForPoolToDrain(page, poolId);
    });

    poolTest('a ready sandbox stays while the unfinished allocation goes', async ({ page, poolId }) => {
        await allocateUnits(page, poolId, 1);
        await waitForUnits(page, poolId, units => units.length === 1 && units.every(isReady));
        const readyId = (await listUnits(page, poolId))[0]?.id;
        await allocateUnits(page, poolId, 1);
        await expect.poll(async () => (await listUnits(page, poolId)).length).toBe(2);
        await openCancelConfirmation(page, poolId);
        await expect(confirmDialog(page)).toContainText('Ready sandboxes stay.');

        await confirmDialog(page).getByRole('button', { name: 'Cancel allocations' }).click();

        await expect(cancellationToast(page)).toBeVisible();
        await waitForUnits(page, poolId, units => units.length === 1);
        const remaining = (await listUnits(page, poolId))[0];
        expect(remaining?.id).toBe(readyId);
        expect(remaining !== undefined && isReady(remaining)).toBe(true);
    });
});

test.describe('Cancel all allocations with queued units', () => {
    poolTest.use({ poolAccount: adminAccount, poolSize: QUEUED_UNIT_COUNT, poolComment: POOL_COMMENT });

    poolTest('queued units are removed and running builds are cleaned up', async ({ page, poolId }) => {
        await allocateUnits(page, poolId, QUEUED_UNIT_COUNT);
        const units = await listUnits(page, poolId);
        const queuedIds = units.filter(isQueued).map(unit => unit.id);
        const buildingIds = units.filter(isBuilding).map(unit => unit.id);
        test.skip(queuedIds.length === 0, 'no unit stayed queued: the build workers took every unit at once');
        await openCancelConfirmation(page, poolId);

        await confirmDialog(page).getByRole('button', { name: 'Cancel allocations' }).click();

        await expect(cancellationToast(page)).toBeVisible();
        await waitForUnits(page, poolId, current => current.every(unit => !queuedIds.includes(unit.id)));
        await waitForUnits(page, poolId, current =>
            current.filter(unit => buildingIds.includes(unit.id)).every(unit => unit.cleanup_request !== null)
        );
        await waitForPoolToDrain(page, poolId);
    });
});

test.describe('Cancel all allocations as organizer', () => {
    test.skip(organizerAccount === undefined, ORGANIZER_REQUIREMENT);
    poolTest.use({ poolAccount: organizerAccount, poolSize: 1, poolComment: POOL_COMMENT });

    poolTest('an organizer sees Cancel all allocations and can cancel', async ({ page, poolId }) => {
        await allocateUnits(page, poolId, 1);

        await openCancelConfirmation(page, poolId);
        await confirmDialog(page).getByRole('button', { name: 'Keep allocations' }).click();
        await cancelControl(page).click();
        await confirmDialog(page).getByRole('button', { name: 'Cancel allocations' }).click();

        await expect(cancellationToast(page)).toBeVisible();
        await waitForUnits(page, poolId, units => !units.some(hasUnfinishedAllocation));
    });
});
