import { ApiError } from '../../support/api/api-client';
import { expect, test } from '../../support/fixtures';
import { AllocateDialog } from '../../support/pages/pool/allocate-dialog';
import { POOL_LINKS, ROLES_WITHOUT_POOL_ACCESS } from '../../support/pages/pool/pool-access';
import { expectRedirectedAway } from '../../support/route-guard';
import {
    createPool,
    ensurePoolCount,
    listAllocationUnits,
    lockPool,
    readPool,
} from '../../support/pages/pool/pool-data';
import { PoolOverviewPage } from '../../support/pages/pool/pool-overview-page';
import { describeQuotaCharts, type ResourcesPayload } from '../../support/pages/pool/quota-description';
import {
    ConfirmationDialog,
    isOrdered,
    errorDialog,
    pageTitle,
    toolbarUserName,
    waitForNotification,
} from '../../support/ui';

test.use({ account: 'sandboxOrganizer' });

test.describe('pool', () => {
    test('shows the pool overview with its columns, quotas and the pool of the account', async ({
        page,
        apiAs,
        shared,
        uniqueName,
        checkpoint,
    }) => {
        const pool = await createPool(apiAs('sandboxOrganizer').sandbox, shared, {
            comment: uniqueName('overview'),
            maxSize: 3,
        });
        const overview = new PoolOverviewPage(page);
        await overview.open();
        await expect(pageTitle(page)).toHaveText('Pool Overview');
        for (const header of [
            'Title',
            'Created by',
            'Sandbox definition (revision)',
            'Notes and comments',
            'State',
            'Size',
            'Instances / VCPUs / RAM / ports / network utilization',
            'Actions',
        ]) {
            await expect(overview.table.headerCell(header)).toBeVisible();
        }
        const row = await overview.showPool(pool.id);
        await expect(await overview.table.cell(row, 'Created by')).toHaveText(
            (await toolbarUserName(page).innerText()).trim(),
        );
        await expect(await overview.table.cell(row, 'Size')).toHaveText('0/3');
        await expect(await overview.table.cell(row, 'State')).toContainText('unlocked');
        await expect(await overview.table.cell(row, 'Instances / VCPUs / RAM / ports / network utilization')).toHaveText(
            '0.0% / 0.0% / 0.0% / 0.0% / 0.0%',
        );
        await expect(overview.commentOf(row).input).toHaveValue(pool.comment ?? '');
        await checkpoint(page, 'pool overview loaded');
    });

    test('shows the sandbox definition and revision of a pool', async ({
        page,
        apiAs,
        shared,
        uniqueName,
    }) => {
        const pool = await createPool(apiAs('sandboxOrganizer').sandbox, shared, {
            comment: uniqueName('definition'),
        });
        const definition = pool.definition;
        const overview = new PoolOverviewPage(page);
        await overview.open();
        const row = await overview.showPool(pool.id);
        await expect(await overview.table.cell(row, 'Sandbox definition (revision)')).toHaveText(
            `${definition.name} (${definition.rev})`,
        );
    });

    test('shows the resource quota panel with a project name and five quota charts', async ({
        page,
        checkpoint,
        apiAs,
    }) => {
        const overview = new PoolOverviewPage(page);
        await overview.open();
        await expect(overview.quotas.getByRole('heading', { level: 2 })).not.toHaveText('...');
        await expect(overview.quotas.locator('crczp-quota-pie-chart')).toHaveCount(5);
        const resources = await apiAs('sandboxOrganizer').sandbox.get<ResourcesPayload>('/info');
        await checkpoint(page, 'quotas shown', describeQuotaCharts(resources));
    });

    test('opens the pool detail from the title link', async ({
        page,
        apiAs,
        shared,
        uniqueName,
    }) => {
        const pool = await createPool(apiAs('sandboxOrganizer').sandbox, shared, {
            comment: uniqueName('title-link'),
        });
        const overview = new PoolOverviewPage(page);
        await overview.open();
        const row = await overview.showPool(pool.id);
        await row.getByRole('link', { name: `Pool ${pool.id}`, exact: true }).click();
        await expect(page).toHaveURL(new RegExp(`/pool/${pool.id}$`));
    });

    test('opens the pool creation form from the Create control', async ({ page }) => {
        const overview = new PoolOverviewPage(page);
        await overview.open();
        await overview.createButton.click();
        await expect(page).toHaveURL(/\/pool\/create$/);
    });

    test('opens the pool edit form from the edit row action', async ({
        page,
        apiAs,
        shared,
        uniqueName,
    }) => {
        const pool = await createPool(apiAs('sandboxOrganizer').sandbox, shared, {
            comment: uniqueName('edit-action'),
        });
        const overview = new PoolOverviewPage(page);
        await overview.open();
        const row = await overview.showPool(pool.id);
        await overview.table.rowAction(row, 'create').click();
        await expect(page).toHaveURL(new RegExp(`/pool/${pool.id}/edit$`));
    });

    test.describe('sorting and paging', () => {
        test.beforeEach(async ({ apiAs, shared, uniqueName }) => {
            await ensurePoolCount(apiAs('sandboxOrganizer').sandbox, shared, 12, uniqueName('paging'));
        });

        test('starts sorted by title descending', async ({ page }) => {
            const overview = new PoolOverviewPage(page);
            await overview.open();
            await expect(overview.table.headerCell('Title')).toHaveAttribute('aria-sort', 'descending');
            await expect.poll(async () => isOrdered(await overview.shownPoolIds(), 'descending')).toBe(true);
        });

        test('sorts by title in both directions', async ({ page }) => {
            const overview = new PoolOverviewPage(page);
            await overview.open();
            await overview.table.sortTo('Title', 'ascending');
            await expect.poll(async () => isOrdered(await overview.shownPoolIds(), 'ascending')).toBe(true);
            await overview.table.sortTo('Title', 'descending');
            await expect.poll(async () => isOrdered(await overview.shownPoolIds(), 'descending')).toBe(true);
        });

        test('sorts by size in both directions', async ({ page }) => {
            const overview = new PoolOverviewPage(page);
            await overview.open();
            await overview.table.sortTo('Size', 'ascending');
            await expect.poll(async () => isOrdered(await maximumSizes(overview), 'ascending')).toBe(true);
            await overview.table.sortTo('Size', 'descending');
            await expect.poll(async () => isOrdered(await maximumSizes(overview), 'descending')).toBe(true);
        });

        for (const header of ['Created by', 'Sandbox definition (revision)', 'Notes and comments']) {
            test(`reverses the sort direction of the ${header} column`, async ({ page }) => {
                const overview = new PoolOverviewPage(page);
                await overview.open();
                const shownTexts = async () =>
                    (await overview.table.columnTexts(header)).map((text) => text.trim().toLowerCase());
                await overview.table.sortTo(header, 'ascending');
                await expect(overview.table.rows.first()).toBeVisible();
                await expect.poll(async () => isOrdered(await shownTexts(), 'ascending')).toBe(true);
                await overview.table.sortTo(header, 'descending');
                await expect.poll(async () => isOrdered(await shownTexts(), 'descending')).toBe(true);
            });
        }

        test('offers no sorting on the state and utilization columns', async ({ page }) => {
            const overview = new PoolOverviewPage(page);
            await overview.open();
            for (const header of [
                'State',
                'Instances / VCPUs / RAM / ports / network utilization',
            ]) {
                await expect(overview.table.headerCell(header).getByRole('button')).toHaveCount(0);
            }
        });

        test('changes the page size and moves between pages', async ({ page }) => {
            const overview = new PoolOverviewPage(page);
            await overview.open();
            await overview.table.openPageSizeList();
            const sizes = (await page.getByRole('option').allInnerTexts()).map(Number).sort((first, second) => first - second);
            const smallest = sizes[0] ?? 5;
            await page.getByRole('option', { name: String(smallest), exact: true }).click();
            await expect(overview.table.rows).toHaveCount(smallest);
            await expect(overview.table.rangeLabel).toHaveText(new RegExp(`^\\s*1 – ${smallest} of \\d+\\s*$`));

            await overview.table.nextPageButton.click();
            await expect(overview.table.rangeLabel).toHaveText(
                new RegExp(`^\\s*${smallest + 1} – ${smallest * 2} of \\d+\\s*$`),
            );
            await overview.table.previousPageButton.click();
            await expect(overview.table.rangeLabel).toHaveText(new RegExp(`^\\s*1 – ${smallest} of \\d+\\s*$`));
            await overview.table.lastPageButton.click();
            await expect(overview.table.nextPageButton).toBeDisabled();
            await overview.table.firstPageButton.click();
            await expect(overview.table.previousPageButton).toBeDisabled();
            await expect(overview.table.rangeLabel).toHaveText(new RegExp(`^\\s*1 – ${smallest} of \\d+\\s*$`));
        });
    });

    test('expands a row to show the build notification setting and resource utilization', async ({
        page,
        apiAs,
        shared,
        uniqueName,
        checkpoint,
    }) => {
        const pool = await createPool(apiAs('sandboxOrganizer').sandbox, shared, {
            comment: uniqueName('expand'),
            sendEmails: true,
        });
        const overview = new PoolOverviewPage(page);
        await overview.open();
        const row = await overview.showPool(pool.id);
        await overview.table.expandButton(row).click();
        const details = overview.table.expandedDetails;
        await expect(details).toHaveCount(1);
        await expect(details).toContainText('Build progression notifications: true');
        await expect(details).toContainText('Resources utilization:');
        await expect(details).toContainText('No data to display');
        await checkpoint(page, 'row expanded');
        await overview.table.expandButton(row).click();
        await expect(details).toHaveCount(0);
    });

    test.describe('inline comment', () => {
        test('saves an edited comment', async ({ page, apiAs, shared, uniqueName }) => {
            const sandbox = apiAs('sandboxOrganizer').sandbox;
            const pool = await createPool(sandbox, shared, { comment: uniqueName('comment-old') });
            const newComment = uniqueName('comment-new');
            const overview = new PoolOverviewPage(page);
            await overview.open();
            const row = await overview.showPool(pool.id);
            const { input, editButton } = overview.commentOf(row);
            await expect(input).not.toBeEditable();
            await editButton.click();
            await expect(input).toBeEditable();
            await input.fill(newComment);
            await editButton.click();
            expect((await waitForNotification(page, `Pool comment for ${pool.id} was updated`)).kind).toBe('success');
            await expect(input).toHaveValue(newComment);
            expect((await readPool(sandbox, pool.id)).comment).toBe(newComment);
        });

        test('stores special characters as literal text', async ({ page, apiAs, shared, uniqueName }) => {
            const sandbox = apiAs('sandboxOrganizer').sandbox;
            const pool = await createPool(sandbox, shared, { comment: uniqueName('comment-special') });
            const special = 'Žluťoučký kůň <b>x</b>';
            const overview = new PoolOverviewPage(page);
            await overview.open();
            const row = await overview.showPool(pool.id);
            const { input, editButton } = overview.commentOf(row);
            await editButton.click();
            await input.fill(special);
            await editButton.click();
            await waitForNotification(page, `Pool comment for ${pool.id} was updated`);
            await expect(input).toHaveValue(special);
            await expect(row.locator('b')).toHaveCount(0);
            expect((await readPool(sandbox, pool.id)).comment).toBe(special);
        });

        test('rejects a comment longer than 256 characters', async ({ page, apiAs, shared, uniqueName }) => {
            const sandbox = apiAs('sandboxOrganizer').sandbox;
            const pool = await createPool(sandbox, shared, { comment: uniqueName('comment-long') });
            const overview = new PoolOverviewPage(page);
            await overview.open();
            const row = await overview.showPool(pool.id);
            const { editButton } = overview.commentOf(row);
            await overview.typeTouchedComment(row, 'x'.repeat(257));
            await expect(row.getByText('At most 256 characters')).toBeVisible();
            await expect(editButton).toBeDisabled();
        });

        test('accepts a comment of exactly 256 characters', async ({ page, apiAs, shared, uniqueName }) => {
            const sandbox = apiAs('sandboxOrganizer').sandbox;
            const pool = await createPool(sandbox, shared, { comment: uniqueName('comment-limit') });
            const overview = new PoolOverviewPage(page);
            await overview.open();
            const row = await overview.showPool(pool.id);
            const { input, editButton } = overview.commentOf(row);
            await editButton.click();
            await input.fill('y'.repeat(256));
            await expect(editButton).toBeEnabled();
            await editButton.click();
            await waitForNotification(page, `Pool comment for ${pool.id} was updated`);
            expect((await readPool(sandbox, pool.id)).comment).toBe('y'.repeat(256));
        });

        test('accepts an emptied comment', async ({ page, apiAs, shared, uniqueName }) => {
            const sandbox = apiAs('sandboxOrganizer').sandbox;
            const pool = await createPool(sandbox, shared, { comment: uniqueName('comment-empty') });
            const overview = new PoolOverviewPage(page);
            await overview.open();
            const row = await overview.showPool(pool.id);
            const { input, editButton } = overview.commentOf(row);
            await editButton.click();
            await input.fill('');
            await editButton.click();
            await waitForNotification(page, `Pool comment for ${pool.id} was updated`);
            expect((await readPool(sandbox, pool.id)).comment ?? '').toBe('');
        });

        test('reverts an edit abandoned by leaving the field', async ({ page, apiAs, shared, uniqueName }) => {
            const sandbox = apiAs('sandboxOrganizer').sandbox;
            const original = uniqueName('comment-revert');
            const pool = await createPool(sandbox, shared, { comment: original });
            const overview = new PoolOverviewPage(page);
            await overview.open();
            const row = await overview.showPool(pool.id);
            const { input, editButton } = overview.commentOf(row);
            await editButton.click();
            await input.fill('abandoned edit');
            await page.getByRole('heading', { name: 'Pool Overview', level: 1 }).click();
            await expect(input).toHaveValue(original);
            await expect(input).not.toBeEditable();
            expect((await readPool(sandbox, pool.id)).comment).toBe(original);
        });
    });

    test.describe('lock and unlock', () => {
        test('locks a pool at once without confirmation and shows it as locked', async ({ page, apiAs, shared, uniqueName }) => {
            const sandbox = apiAs('sandboxOrganizer').sandbox;
            const pool = await createPool(sandbox, shared, { comment: uniqueName('lock') });
            const overview = new PoolOverviewPage(page);
            await overview.open();
            const row = await overview.showPool(pool.id);
            await overview.table.rowAction(row, 'lock').click();
            await expect(new ConfirmationDialog(page).root).toHaveCount(0);
            expect((await waitForNotification(page, `Pool ${pool.id} was locked`)).kind).toBe('success');
            await expect(await overview.table.cell(row, 'State')).toContainText('locked');
            await expect(overview.table.rowAction(row, 'lock_open')).toBeVisible();
            expect((await readPool(sandbox, pool.id)).lock_id).not.toBeNull();
        });

        test('disables deleting a locked pool', async ({ page, apiAs, shared, uniqueName }) => {
            const sandbox = apiAs('sandboxOrganizer').sandbox;
            const pool = await createPool(sandbox, shared, { comment: uniqueName('lock-delete') });
            await lockPool(sandbox, pool.id);
            const overview = new PoolOverviewPage(page);
            await overview.open();
            const row = await overview.showPool(pool.id);
            await expect(overview.table.rowAction(row, 'delete')).toBeDisabled();
        });

        test('keeps a pool locked when the unlock dialog is cancelled', async ({
            page,
            apiAs,
            shared,
            uniqueName,
            checkpoint,
        }) => {
            const sandbox = apiAs('sandboxOrganizer').sandbox;
            const pool = await createPool(sandbox, shared, { comment: uniqueName('unlock-cancel') });
            await lockPool(sandbox, pool.id);
            const overview = new PoolOverviewPage(page);
            await overview.open();
            const row = await overview.showPool(pool.id);
            await overview.table.rowAction(row, 'lock_open').click();
            const dialog = new ConfirmationDialog(page, 'Unlock Pool');
            await expect(dialog.message).toHaveText(`Do you want to unlock pool "${pool.id}"?`);
            await checkpoint(page, 'unlock dialog open');
            await dialog.cancel();
            await expect(dialog.root).toBeHidden();
            await expect(await overview.table.cell(row, 'State')).toContainText('locked');
            expect((await readPool(sandbox, pool.id)).lock_id).not.toBeNull();
        });

        test('unlocks a pool after confirmation', async ({ page, apiAs, shared, uniqueName }) => {
            const sandbox = apiAs('sandboxOrganizer').sandbox;
            const pool = await createPool(sandbox, shared, { comment: uniqueName('unlock') });
            await lockPool(sandbox, pool.id);
            const overview = new PoolOverviewPage(page);
            await overview.open();
            const row = await overview.showPool(pool.id);
            await overview.table.rowAction(row, 'lock_open').click();
            await new ConfirmationDialog(page, 'Unlock Pool').confirm();
            expect((await waitForNotification(page, `Pool ${pool.id} was unlocked`)).kind).toBe('success');
            await expect(await overview.table.cell(row, 'State')).toContainText('unlocked');
            expect((await readPool(sandbox, pool.id)).lock_id).toBeNull();
        });
    });

    test.describe('delete', () => {
        test('keeps the pool when the delete dialog is cancelled', async ({
            page,
            apiAs,
            shared,
            uniqueName,
            checkpoint,
        }) => {
            const sandbox = apiAs('sandboxOrganizer').sandbox;
            const pool = await createPool(sandbox, shared, { comment: uniqueName('delete-cancel') });
            const overview = new PoolOverviewPage(page);
            await overview.open();
            const row = await overview.showPool(pool.id);
            await overview.table.rowAction(row, 'delete').click();
            const dialog = new ConfirmationDialog(page, 'Delete Pool');
            await expect(dialog.message).toHaveText(`Do you want to delete pool "${pool.id}"?`);
            await expect(dialog.confirmButton).toHaveText('Delete');
            await checkpoint(page, 'delete dialog open');
            await dialog.cancel();
            await expect(dialog.root).toBeHidden();
            await expect(row).toBeVisible();
            expect((await readPool(sandbox, pool.id)).id).toBe(pool.id);
        });

        test('deletes a pool without sandboxes after confirmation', async ({
            page,
            apiAs,
            shared,
            uniqueName,
        }) => {
            const sandbox = apiAs('sandboxOrganizer').sandbox;
            const pool = await createPool(sandbox, shared, { comment: uniqueName('delete') });
            const overview = new PoolOverviewPage(page);
            await overview.open();
            const row = await overview.showPool(pool.id);
            await overview.table.rowAction(row, 'delete').click();
            await new ConfirmationDialog(page, 'Delete Pool').confirm();
            expect((await waitForNotification(page, `Pool ${pool.id} was deleted`)).kind).toBe('success');
            await expect(overview.rowOf(pool.id)).toHaveCount(0);
            await expect(errorDialog(page)).toBeHidden();
            const rejection = await readPool(sandbox, pool.id).then(
                () => undefined,
                (error: unknown) => error,
            );
            expect(rejection).toBeInstanceOf(ApiError);
            expect((rejection as ApiError).status).toBe(404);
        });
    });

    test.describe('allocation dialog', () => {
        const POOL_SIZE = 5;

        async function openAllocateDialog(
            overview: PoolOverviewPage,
            poolId: number,
        ): Promise<AllocateDialog> {
            const row = await overview.showPool(poolId);
            return AllocateDialog.openFrom(overview.page, overview.table.rowAction(row, 'subscriptions'));
        }

        test('offers the remaining sandboxes of the pool as the initial size', async ({
            page,
            apiAs,
            shared,
            uniqueName,
            checkpoint,
        }) => {
            const pool = await createPool(apiAs('sandboxOrganizer').sandbox, shared, {
                comment: uniqueName('allocate-initial'),
                maxSize: POOL_SIZE,
            });
            const overview = new PoolOverviewPage(page);
            await overview.open();
            const dialog = await openAllocateDialog(overview, pool.id);
            await expect(dialog.sizeInput).toHaveValue(String(POOL_SIZE));
            await expect(dialog.slider).toHaveValue(String(POOL_SIZE));
            await expect(dialog.allocateButton).toBeEnabled();
            await checkpoint(page, 'allocate dialog open');
        });

        test('steps the size down and up with the minus and plus icons within bounds', async ({
            page,
            apiAs,
            shared,
            uniqueName,
        }) => {
            const pool = await createPool(apiAs('sandboxOrganizer').sandbox, shared, {
                comment: uniqueName('allocate-steps'),
                maxSize: POOL_SIZE,
            });
            const overview = new PoolOverviewPage(page);
            await overview.open();
            const dialog = await openAllocateDialog(overview, pool.id);
            await dialog.incrementIcon.click();
            await expect(dialog.sizeInput).toHaveValue(String(POOL_SIZE));
            await dialog.decrementIcon.click();
            await expect(dialog.sizeInput).toHaveValue(String(POOL_SIZE - 1));
            for (let step = 0; step < POOL_SIZE + 2; step++) {
                await dialog.decrementIcon.click();
            }
            await expect(dialog.sizeInput).toHaveValue('1');
            await dialog.incrementIcon.click();
            await expect(dialog.sizeInput).toHaveValue('2');
        });

        test('follows the slider keys in the size field', async ({ page, apiAs, shared, uniqueName }) => {
            const pool = await createPool(apiAs('sandboxOrganizer').sandbox, shared, {
                comment: uniqueName('allocate-slider'),
                maxSize: POOL_SIZE,
            });
            const overview = new PoolOverviewPage(page);
            await overview.open();
            const dialog = await openAllocateDialog(overview, pool.id);
            await dialog.slider.press('Home');
            await expect(dialog.sizeInput).toHaveValue('1');
            await dialog.slider.press('ArrowRight');
            await expect(dialog.sizeInput).toHaveValue('2');
            await dialog.slider.press('End');
            await expect(dialog.sizeInput).toHaveValue(String(POOL_SIZE));
        });

        test('corrects a typed size above the maximum to the maximum', async ({
            page,
            apiAs,
            shared,
            uniqueName,
        }) => {
            const pool = await createPool(apiAs('sandboxOrganizer').sandbox, shared, {
                comment: uniqueName('allocate-over'),
                maxSize: POOL_SIZE,
            });
            const overview = new PoolOverviewPage(page);
            await overview.open();
            const dialog = await openAllocateDialog(overview, pool.id);
            await dialog.sizeInput.fill('99');
            await expect(dialog.sizeInput).toHaveValue(String(POOL_SIZE));
        });

        test('corrects a negative typed size to the minimum', async ({ page, apiAs, shared, uniqueName }) => {
            const pool = await createPool(apiAs('sandboxOrganizer').sandbox, shared, {
                comment: uniqueName('allocate-negative'),
                maxSize: POOL_SIZE,
            });
            const overview = new PoolOverviewPage(page);
            await overview.open();
            const dialog = await openAllocateDialog(overview, pool.id);
            await dialog.sizeInput.fill('-3');
            await expect(dialog.sizeInput).toHaveValue('1');
        });

        for (const invalidSize of ['0', '', '2.5']) {
            test(`disables Allocate for the size "${invalidSize}"`, async ({
                page,
                apiAs,
                shared,
                uniqueName,
            }) => {
                const pool = await createPool(apiAs('sandboxOrganizer').sandbox, shared, {
                    comment: uniqueName('allocate-invalid'),
                    maxSize: POOL_SIZE,
                });
                const overview = new PoolOverviewPage(page);
                await overview.open();
                const dialog = await openAllocateDialog(overview, pool.id);
                await dialog.sizeInput.fill(invalidSize);
                await expect(dialog.allocateButton).toBeDisabled();
            });
        }

        test('allocates nothing when the dialog is cancelled', async ({ page, apiAs, shared, uniqueName }) => {
            const sandbox = apiAs('sandboxOrganizer').sandbox;
            const pool = await createPool(sandbox, shared, {
                comment: uniqueName('allocate-cancel'),
                maxSize: POOL_SIZE,
            });
            const overview = new PoolOverviewPage(page);
            await overview.open();
            const dialog = await openAllocateDialog(overview, pool.id);
            await dialog.cancelButton.click();
            await expect(dialog.root).toBeHidden();
            expect(await listAllocationUnits(sandbox, pool.id)).toHaveLength(0);
            expect((await readPool(sandbox, pool.id)).size).toBe(0);
        });

        test('enables the allocate row actions on a pool with free capacity', async ({
            page,
            apiAs,
            shared,
            uniqueName,
        }) => {
            const pool = await createPool(apiAs('sandboxOrganizer').sandbox, shared, {
                comment: uniqueName('allocate-enabled'),
                maxSize: POOL_SIZE,
            });
            const overview = new PoolOverviewPage(page);
            await overview.open();
            const row = await overview.showPool(pool.id);
            await expect(overview.table.rowAction(row, 'subscriptions')).toBeEnabled();
            await expect(overview.table.rowAction(row, 'exposure_plus_1')).toBeEnabled();
        });
    });

    test('offers the row actions edit, allocate all, allocate one, delete, lock and SSH config', async ({
        page,
        apiAs,
        shared,
        uniqueName,
    }) => {
        const pool = await createPool(apiAs('sandboxOrganizer').sandbox, shared, {
            comment: uniqueName('row-actions'),
        });
        const overview = new PoolOverviewPage(page);
        await overview.open();
        const row = await overview.showPool(pool.id);
        for (const icon of ['create', 'subscriptions', 'exposure_plus_1', 'delete', 'lock', 'vpn_key']) {
            await expect(overview.table.rowAction(row, icon)).toBeVisible();
        }
    });

    for (const role of ROLES_WITHOUT_POOL_ACCESS) {
        test(`sends the ${role} account away from /pool`, async ({ openAs }) => {
            await expectRedirectedAway(openAs, role, '/pool', { absentLinks: POOL_LINKS });
        });
    }
});

async function maximumSizes(overview: PoolOverviewPage): Promise<number[]> {
    const cells = await overview.table.rows.locator('td[data-cy$="-usedAndMaxSize"]').allInnerTexts();
    return cells.map((text) => Number(text.split('/')[1]));
}
