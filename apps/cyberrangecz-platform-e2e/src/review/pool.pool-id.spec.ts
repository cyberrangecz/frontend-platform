import type { Request, Response } from '@playwright/test';
import { expect, test } from '../support/fixtures';
import { answerConfirmation, blockSandboxChanges, poolConfirmations } from '../support/pages/pool/pool-confirmation';
import { listAllocationUnits, snapshotAllocationUnits } from '../support/pages/pool/pool-data';
import { PoolDetailPage } from '../support/pages/pool/pool-detail-page';
import { locateChainSandbox, type ChainSandbox } from '../support/pages/pool/review-sandbox';
import { expectColumnSortability } from '../support/pages/review/sort-headers';
import { readChainRecord } from '../support/shared-fixture';
import { captureDownload, errorDialog, notificationPopups, pageTitle } from '../support/ui';

test.use({ account: 'sandboxOrganizer' });

const REMOVED_DELETE_MENU_ENTRIES = ['Cancel Queued', 'Force Cancel Allocation', 'Force Cleanup'];

test.describe('pool.pool-id (allocated sandboxes)', () => {
    let own: ChainSandbox;
    let detail: PoolDetailPage;

    test.beforeEach(async ({ page, apiAs, shared, browserKey }) => {
        own = await locateChainSandbox(apiAs('sandboxOrganizer').sandbox, shared, readChainRecord(browserKey));
        detail = new PoolDetailPage(page);
        await detail.open(shared.pool.id);
    });

    test('shows the sandboxes of the shared pool with their attributes, menus and sorting', async ({
        apiAs,
        shared,
        checkpoint,
        page,
    }) => {
        test.slow();
        const sandboxClient = apiAs('sandboxOrganizer').sandbox;
        const units = await listAllocationUnits(sandboxClient, shared.pool.id);
        const ownUnit = units.find((candidate) => candidate.id === own.allocationUnit.id);
        const row = detail.rowOf(own.allocationUnit.id);

        await test.step('lists the sandboxes of the shared pool with their allocation units', async () => {
            await expect.soft(pageTitle(page), 'page title names the pool').toHaveText(`Pool ${shared.pool.id}`);
            await expect.soft(detail.table.rows, 'one row per allocation unit').toHaveCount(units.length);
            await expect.soft(row, 'row of the own sandbox').toBeVisible();
            await checkpoint(page, 'pool detail with sandboxes');
        });

        await test.step('shows the finished build of the own sandbox with three completed stages', async () => {
            await expect.soft(row, 'build state').toContainText('build finished');
            await expect.soft(detail.stageIcons(row), 'stage icons').toHaveText(['check', 'check', 'check']);
        });

        await test.step('shows the lock state of the own sandbox as the backend reports it', async () => {
            await expect
                .soft(await detail.table.cell(row, /^lock$/i), 'lock cell')
                .toHaveText(ownUnit?.locked ? 'locked' : 'unlocked');
        });

        await test.step('enables Allocate only while the pool has free capacity and enables Delete with sandboxes present', async () => {
            if (units.length < shared.pool.maxSize) {
                await expect.soft(detail.allocateButton, 'Allocate with free capacity').toBeEnabled();
            } else {
                await expect.soft(detail.allocateButton, 'Allocate without free capacity').toBeDisabled();
            }
            await expect.soft(detail.deleteMenuButton, 'Delete menu').toBeEnabled();
        });

        await test.step('opens the delete menu with Delete All, Delete Failed and Delete Unlocked and none of the removed entries', async () => {
            await detail.deleteMenuButton.click();
            for (const label of ['Delete All', 'Delete Failed', 'Delete Unlocked']) {
                await expect.soft(page.getByRole('menuitem', { name: label }), `${label} entry`).toBeVisible();
            }
            for (const label of REMOVED_DELETE_MENU_ENTRIES) {
                await expect.soft(page.getByRole('menuitem', { name: label }), `${label} entry`).toHaveCount(0);
            }
            await page.keyboard.press('Escape');
        });

        await test.step('enables Delete Failed only while a sandbox of the pool shows a failed allocation', async () => {
            const anyFailed = (await detail.table.rows.filter({ hasText: 'allocation failed' }).count()) > 0;
            await detail.deleteMenuButton.click();
            const entry = page.getByRole('menuitem', { name: 'Delete Failed' });
            if (anyFailed) {
                await expect.soft(entry, 'Delete Failed with a failed allocation').toBeEnabled();
            } else {
                await expect.soft(entry, 'Delete Failed without a failed allocation').toBeDisabled();
            }
            await page.keyboard.press('Escape');
        });

        await test.step('offers either Lock or Unlock and disables Delete for a locked sandbox', async () => {
            await expect
                .soft(detail.table.rowAction(row, ownUnit?.locked ? 'lock_open' : 'lock'), 'lock row action')
                .toBeEnabled();
            const deleteAction = detail.table.rowAction(row, 'delete');
            if (ownUnit?.locked) {
                await expect.soft(deleteAction, 'Delete of a locked sandbox').toBeDisabled();
            } else {
                await expect.soft(deleteAction, 'Delete of an unlocked sandbox').toBeEnabled();
            }
        });

        await test.step('starts sorted by the sandbox name ascending', async () => {
            await expect
                .soft(detail.table.headerCell(/^name$/i), 'initial name sort')
                .toHaveAttribute('aria-sort', 'ascending');
        });

        await test.step('offers sorting by the notes and comments and the creator, not by the lock', async () => {
            await expectColumnSortability(
                detail.table,
                [/^name$/i, /^notes and comments$/i, /^created by$/i],
                [/^lock$/i, /^created$/i, /^state$/i, /^stages$/i],
            );
        });

        await test.step('keeps the sandbox name sortable by its id', async () => {
            const sortedAnswer = page.waitForResponse(
                (response) => /\/pools\/\d+\/sandboxes\?/.test(response.url()) && response.url().includes('sort_by='),
            );
            await detail.table.sortBy(/^name$/i);
            expect.soft((await sortedAnswer).status(), 'sorted request status').toBe(200);
            await expect
                .soft(detail.table.headerCell(/^name$/i), 'name sort after click')
                .toHaveAttribute('aria-sort', 'descending');
            await expect.soft(detail.table.rows.first(), 'first row').toBeVisible();
        });
    });

    test('runs the row actions of the own sandbox and keeps every sandbox when confirmations are cancelled', async ({
        page,
        apiAs,
        shared,
    }) => {
        test.slow();
        const sandboxClient = apiAs('sandboxOrganizer').sandbox;
        const row = detail.rowOf(own.allocationUnit.id);

        await test.step('downloads a non-empty user SSH config through the row action', async () => {
            const action = detail.table.rowAction(row, 'vpn_key');
            await expect(action).toBeEnabled();
            const isSshAccessUrl = (url: string) => url.includes(`/${own.sandboxUuid}/user-ssh-access`);
            const failedRequests: string[] = [];
            const nonSuccessStatuses: number[] = [];
            const recordFailure = (request: Request) => {
                if (isSshAccessUrl(request.url())) {
                    failedRequests.push(request.failure()?.errorText ?? 'unknown failure');
                }
            };
            const recordStatus = (response: Response) => {
                if (isSshAccessUrl(response.url()) && response.status() !== 200) {
                    nonSuccessStatuses.push(response.status());
                }
            };
            page.on('requestfailed', recordFailure);
            page.on('response', recordStatus);
            try {
                const download = await captureDownload(page, () => action.click()).catch((error: unknown) => {
                    expect(failedRequests, 'failed or cancelled user SSH access request').toEqual([]);
                    throw error;
                });
                expect(nonSuccessStatuses, 'non-200 statuses of the user SSH access request').toEqual([]);
                expect(download.size).toBeGreaterThan(0);
                await expect(errorDialog(page)).toHaveCount(0);
            } finally {
                page.off('requestfailed', recordFailure);
                page.off('response', recordStatus);
            }
        });

        await test.step('reports the outcome of the copy VPN command row action without an error', async () => {
            const action = detail.table.rowAction(row, 'vpn_lock');
            await expect(action).toBeEnabled();
            await action.click();
            await expect(notificationPopups(page).first()).toBeVisible();
            await expect(errorDialog(page)).toHaveCount(0);
        });

        await test.step('opens the allocation request stages when the name of a sandbox is clicked', async () => {
            await row.getByRole('link').click();
            await expect(page).toHaveURL(
                new RegExp(`/pool/${shared.pool.id}/sandbox-instance/${own.allocationRequestId}(#.*)?$`),
            );
            await detail.open(shared.pool.id);
        });

        await test.step('opens the allocation request stages when a stage icon is clicked', async () => {
            await detail.stageIcons(row).nth(1).click();
            await expect(page).toHaveURL(
                new RegExp(`/pool/${shared.pool.id}/sandbox-instance/${own.allocationRequestId}#stage-2$`),
            );
            await detail.open(shared.pool.id);
        });

        await test.step('opens the topology of the own sandbox through the topology row action', async () => {
            const action = detail.table.rowAction(row, 'device_hub');
            await expect(action).toBeEnabled();
            await action.click();
            await expect(page).toHaveURL(
                new RegExp(`/pool/${shared.pool.id}/sandbox-instance/${own.sandboxUuid}/topology$`),
            );
            await detail.open(shared.pool.id);
        });

        await blockSandboxChanges(page);

        await test.step('cancels the unlock confirmation of the own sandbox while it is locked and keeps it locked', async () => {
            const before = await snapshotAllocationUnits(sandboxClient, shared.pool.id);
            if (before[own.allocationUnit.id]?.locked) {
                await detail.clickSandboxAction(row, 'Unlock');
                await answerConfirmation(page, poolConfirmations.unlockSandbox(own.allocationUnit.id), 'cancel');
            } else {
                await expect(detail.table.rowAction(row, 'lock_open')).toHaveCount(0);
            }
            expect(await snapshotAllocationUnits(sandboxClient, shared.pool.id)).toEqual(before);
            await expect(await detail.table.cell(row, /^lock$/i)).toHaveText(
                before[own.allocationUnit.id]?.locked ? 'locked' : 'unlocked',
            );
        });

        await test.step('cancels the Delete All confirmation and keeps every sandbox of the pool', async () => {
            const before = await snapshotAllocationUnits(sandboxClient, shared.pool.id);
            await detail.chooseDeleteMenuEntry('Delete All');
            await answerConfirmation(page, poolConfirmations.deleteAllSandboxes(shared.pool.id), 'cancel');
            expect(await snapshotAllocationUnits(sandboxClient, shared.pool.id)).toEqual(before);
            await expect(row).toBeVisible();
        });

        await test.step('cancels the Delete Unlocked confirmation and keeps every sandbox of the pool', async () => {
            const before = await snapshotAllocationUnits(sandboxClient, shared.pool.id);
            await detail.deleteMenuButton.click();
            if (Object.values(before).some((unit) => !unit.locked)) {
                await detail.deleteMenuEntry('Delete Unlocked').click();
                await answerConfirmation(page, poolConfirmations.deleteUnlockedSandboxes(shared.pool.id), 'cancel');
            } else {
                await expect(detail.deleteMenuEntry('Delete Unlocked')).toBeDisabled();
                await page.keyboard.press('Escape');
            }
            expect(await snapshotAllocationUnits(sandboxClient, shared.pool.id)).toEqual(before);
            await expect(row).toBeVisible();
        });
    });
});
