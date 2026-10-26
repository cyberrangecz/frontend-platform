import { expect, test } from '../support/fixtures';
import { answerConfirmation, blockSandboxChanges, poolConfirmations } from '../support/pages/pool/pool-confirmation';
import { listAllocationUnits, snapshotAllocationUnits } from '../support/pages/pool/pool-data';
import { PoolDetailPage } from '../support/pages/pool/pool-detail-page';
import { locateChainSandbox, type ChainSandbox } from '../support/pages/pool/review-sandbox';
import { expectColumnSortability } from '../support/pages/review/sort-headers';
import { readChainRecord } from '../support/shared-fixture';
import { captureDownload, errorDialog, notificationPopups, pageTitle } from '../support/ui';

test.use({ account: 'sandboxOrganizer' });

test.describe('pool.pool-id (allocated sandboxes)', () => {
    let own: ChainSandbox;
    let detail: PoolDetailPage;

    test.beforeEach(async ({ page, apiAs, shared, browserKey }) => {
        own = await locateChainSandbox(apiAs('sandboxOrganizer').sandbox, shared, readChainRecord(browserKey));
        detail = new PoolDetailPage(page);
        await detail.open(shared.pool.id);
    });

    test('lists the sandboxes of the shared pool with their allocation units', async ({
        apiAs,
        shared,
        checkpoint,
        page,
    }) => {
        const units = await listAllocationUnits(apiAs('sandboxOrganizer').sandbox, shared.pool.id);
        await expect(pageTitle(page)).toHaveText(`Pool ${shared.pool.id}`);
        await expect(detail.table.rows).toHaveCount(units.length);
        await expect(detail.rowOf(own.allocationUnit.id)).toBeVisible();
        await checkpoint(page, 'pool detail with sandboxes');
    });

    test('shows the finished build of the own sandbox with three completed stages', async () => {
        const row = detail.rowOf(own.allocationUnit.id);
        await expect(row).toContainText('build finished');
        await expect(detail.stageIcons(row)).toHaveText(['check', 'check', 'check']);
    });

    test('shows the lock state of the own sandbox as the backend reports it', async ({ apiAs, shared }) => {
        const unit = (await listAllocationUnits(apiAs('sandboxOrganizer').sandbox, shared.pool.id)).find(
            (candidate) => candidate.id === own.allocationUnit.id,
        );
        const row = detail.rowOf(own.allocationUnit.id);
        await expect(await detail.table.cell(row, /^lock$/i)).toHaveText(unit?.locked ? 'locked' : 'unlocked');
    });

    test('enables Allocate only while the pool has free capacity and enables Delete with sandboxes present', async ({
        apiAs,
        shared,
    }) => {
        const units = await listAllocationUnits(apiAs('sandboxOrganizer').sandbox, shared.pool.id);
        if (units.length < shared.pool.maxSize) {
            await expect(detail.allocateButton).toBeEnabled();
        } else {
            await expect(detail.allocateButton).toBeDisabled();
        }
        await expect(detail.deleteMenuButton).toBeEnabled();
    });

    test('opens the delete menu with Delete All, Delete Failed and Delete Unlocked', async ({ page }) => {
        await detail.deleteMenuButton.click();
        for (const label of ['Delete All', 'Delete Failed', 'Delete Unlocked']) {
            await expect(page.getByRole('menuitem', { name: label })).toBeVisible();
        }
        await page.keyboard.press('Escape');
    });

    test('enables Delete Failed only while a sandbox of the pool shows a failed allocation', async ({ page }) => {
        const anyFailed = (await detail.table.rows.filter({ hasText: 'allocation failed' }).count()) > 0;
        await detail.deleteMenuButton.click();
        const entry = page.getByRole('menuitem', { name: 'Delete Failed' });
        if (anyFailed) {
            await expect(entry).toBeEnabled();
        } else {
            await expect(entry).toBeDisabled();
        }
    });

    test('opens the allocation request stages when the name of a sandbox is clicked', async ({ page, shared }) => {
        await detail.rowOf(own.allocationUnit.id).getByRole('link').click();
        await expect(page).toHaveURL(
            new RegExp(`/pool/${shared.pool.id}/sandbox-instance/${own.allocationRequestId}(#.*)?$`),
        );
    });

    test('opens the allocation request stages when a stage icon is clicked', async ({ page, shared }) => {
        const row = detail.rowOf(own.allocationUnit.id);
        await detail.stageIcons(row).nth(1).click();
        await expect(page).toHaveURL(
            new RegExp(`/pool/${shared.pool.id}/sandbox-instance/${own.allocationRequestId}#stage-2$`),
        );
    });

    test('opens the topology of the own sandbox through the topology row action', async ({ page, shared }) => {
        const action = detail.table.rowAction(detail.rowOf(own.allocationUnit.id), 'device_hub');
        await expect(action).toBeEnabled();
        await action.click();
        await expect(page).toHaveURL(
            new RegExp(`/pool/${shared.pool.id}/sandbox-instance/${own.sandboxUuid}/topology$`),
        );
    });

    test('downloads a non-empty user SSH config through the row action', async ({ page }) => {
        const action = detail.table.rowAction(detail.rowOf(own.allocationUnit.id), 'vpn_key');
        await expect(action).toBeEnabled();
        const isSshAccessUrl = (url: string) => url.includes(`/${own.sandboxUuid}/user-ssh-access`);
        const failedRequests: string[] = [];
        const nonSuccessStatuses: number[] = [];
        page.on('requestfailed', (request) => {
            if (isSshAccessUrl(request.url())) {
                failedRequests.push(request.failure()?.errorText ?? 'unknown failure');
            }
        });
        page.on('response', (response) => {
            if (isSshAccessUrl(response.url()) && response.status() !== 200) {
                nonSuccessStatuses.push(response.status());
            }
        });
        const download = await captureDownload(page, () => action.click()).catch((error: unknown) => {
            expect(failedRequests, 'failed or cancelled user SSH access request').toEqual([]);
            throw error;
        });
        expect(nonSuccessStatuses, 'non-200 statuses of the user SSH access request').toEqual([]);
        expect(download.size).toBeGreaterThan(0);
        await expect(errorDialog(page)).toHaveCount(0);
    });

    test('reports the outcome of the copy VPN command row action without an error', async ({ page }) => {
        const action = detail.table.rowAction(detail.rowOf(own.allocationUnit.id), 'vpn_lock');
        await expect(action).toBeEnabled();
        await action.click();
        await expect(notificationPopups(page).first()).toBeVisible();
        await expect(errorDialog(page)).toHaveCount(0);
    });

    test('offers either Lock or Unlock and disables Delete for a locked sandbox', async ({ apiAs, shared }) => {
        const unit = (await listAllocationUnits(apiAs('sandboxOrganizer').sandbox, shared.pool.id)).find(
            (candidate) => candidate.id === own.allocationUnit.id,
        );
        const row = detail.rowOf(own.allocationUnit.id);
        await expect(detail.table.rowAction(row, unit?.locked ? 'lock_open' : 'lock')).toBeEnabled();
        const deleteAction = detail.table.rowAction(row, 'delete');
        if (unit?.locked) {
            await expect(deleteAction).toBeDisabled();
        } else {
            await expect(deleteAction).toBeEnabled();
        }
    });

    test('starts sorted by the sandbox name ascending', async () => {
        await expect(detail.table.headerCell(/^name$/i)).toHaveAttribute('aria-sort', 'ascending');
    });

    test('keeps the sandbox name sortable by its id', async () => {
        await detail.table.sortBy(/^name$/i);
        await expect(detail.table.headerCell(/^name$/i)).toHaveAttribute('aria-sort', 'descending');
        await expect(detail.table.rows.first()).toBeVisible();
    });

    test('offers sorting by the notes and comments and the creator, not by the lock', async () => {
        await expectColumnSortability(
            detail.table,
            [/^name$/i, /^notes and comments$/i, /^created by$/i],
            [/^lock$/i, /^created$/i, /^state$/i, /^stages$/i],
        );
    });

    test.describe('confirmations that are cancelled', () => {
        test.beforeEach(async ({ page }) => {
            await blockSandboxChanges(page);
        });

        test('cancels the unlock confirmation of the own sandbox while it is locked and keeps it locked', async ({
            page,
            apiAs,
            shared,
        }) => {
            const sandbox = apiAs('sandboxOrganizer').sandbox;
            const before = await snapshotAllocationUnits(sandbox, shared.pool.id);
            const row = detail.rowOf(own.allocationUnit.id);
            if (before[own.allocationUnit.id]?.locked) {
                await detail.clickSandboxAction(row, 'Unlock');
                await answerConfirmation(page, poolConfirmations.unlockSandbox(own.allocationUnit.id), 'cancel');
            } else {
                await expect(detail.table.rowAction(row, 'lock_open')).toHaveCount(0);
            }
            expect(await snapshotAllocationUnits(sandbox, shared.pool.id)).toEqual(before);
            await expect(await detail.table.cell(row, /^lock$/i)).toHaveText(
                before[own.allocationUnit.id]?.locked ? 'locked' : 'unlocked',
            );
        });

        test('cancels the Delete All confirmation and keeps every sandbox of the pool', async ({
            page,
            apiAs,
            shared,
        }) => {
            const sandbox = apiAs('sandboxOrganizer').sandbox;
            const before = await snapshotAllocationUnits(sandbox, shared.pool.id);
            await detail.chooseDeleteMenuEntry('Delete All');
            await answerConfirmation(page, poolConfirmations.deleteAllSandboxes(shared.pool.id), 'cancel');
            expect(await snapshotAllocationUnits(sandbox, shared.pool.id)).toEqual(before);
            await expect(detail.rowOf(own.allocationUnit.id)).toBeVisible();
        });

        test('cancels the Delete Unlocked confirmation and keeps every sandbox of the pool', async ({
            page,
            apiAs,
            shared,
        }) => {
            const sandbox = apiAs('sandboxOrganizer').sandbox;
            const before = await snapshotAllocationUnits(sandbox, shared.pool.id);
            await detail.deleteMenuButton.click();
            if (Object.values(before).some((unit) => !unit.locked)) {
                await detail.deleteMenuEntry('Delete Unlocked').click();
                await answerConfirmation(page, poolConfirmations.deleteUnlockedSandboxes(shared.pool.id), 'cancel');
            } else {
                await expect(detail.deleteMenuEntry('Delete Unlocked')).toBeDisabled();
                await page.keyboard.press('Escape');
            }
            expect(await snapshotAllocationUnits(sandbox, shared.pool.id)).toEqual(before);
            await expect(detail.rowOf(own.allocationUnit.id)).toBeVisible();
        });
    });
});
