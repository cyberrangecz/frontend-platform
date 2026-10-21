import { ApiError } from '../../support/api/api-client';
import { expect, test } from '../../support/fixtures';
import { AllocateDialog } from '../../support/pages/pool/allocate-dialog';
import { POOL_LINKS, ROLES_WITHOUT_POOL_ACCESS } from '../../support/pages/pool/pool-access';
import { expectRedirectedAway } from '../../support/route-guard';
import { createPool, listAllocationUnits, readPool } from '../../support/pages/pool/pool-data';
import { PoolDetailPage } from '../../support/pages/pool/pool-detail-page';
import { breadcrumbEntries, breadcrumbLink, dialogButton, pageTitle } from '../../support/ui';

test.use({ account: 'sandboxOrganizer' });

test.describe('pool.pool-id', () => {
    test('shows the title, the pool comment and an empty sandbox table for a new pool', async ({
        page,
        apiAs,
        shared,
        uniqueName,
        checkpoint,
    }) => {
        const comment = uniqueName('detail-empty');
        const pool = await createPool(apiAs('sandboxOrganizer').sandbox, shared, { comment, maxSize: 3 });
        const detail = new PoolDetailPage(page);
        await detail.open(pool.id);
        await expect(pageTitle(page)).toHaveText(`Pool ${pool.id}`);
        await expect(page.getByRole('heading', { name: 'Sandbox Instances' })).toBeVisible();
        await expect(page.locator('.pool-comment')).toHaveText(comment);
        await expect(detail.table.rows).toHaveCount(0);
        await expect(detail.table.emptyState).toContainText('No sandboxes in this pool yet');
        await checkpoint(page, 'empty pool detail');
    });

    test('shows no comment paragraph for a pool without a comment', async ({ page, apiAs, shared }) => {
        const pool = await createPool(apiAs('sandboxOrganizer').sandbox, shared, { comment: '' });
        const detail = new PoolDetailPage(page);
        await detail.open(pool.id);
        await expect(page.locator('.pool-comment')).toHaveCount(0);
    });

    test('lists the sandbox table columns', async ({ page, apiAs, shared, uniqueName }) => {
        const pool = await createPool(apiAs('sandboxOrganizer').sandbox, shared, {
            comment: uniqueName('detail-columns'),
        });
        const detail = new PoolDetailPage(page);
        await detail.open(pool.id);
        for (const header of ['name', 'notes and comments', 'lock', 'created', 'created by', 'state', 'stages']) {
            await expect(detail.table.headerCell(new RegExp(`^\\s*${header}\\s*$`, 'i'))).toBeVisible();
        }
    });

    test('shows the pool id as the last breadcrumb and leads back to the overview', async ({
        page,
        apiAs,
        shared,
        uniqueName,
    }) => {
        const pool = await createPool(apiAs('sandboxOrganizer').sandbox, shared, {
            comment: uniqueName('detail-breadcrumb'),
        });
        const detail = new PoolDetailPage(page);
        await detail.open(pool.id);
        await expect(breadcrumbLink(page, 'Pools')).toBeVisible();
        await expect(breadcrumbEntries(page).last()).toContainText(String(pool.id));
        await breadcrumbLink(page, 'Pools').click();
        await expect(page).toHaveURL(/\/pool$/);
    });

    test.describe('controls of an empty pool', () => {
        test('offers Allocate Sandboxes enabled and Delete disabled', async ({
            page,
            apiAs,
            shared,
            uniqueName,
        }) => {
            const pool = await createPool(apiAs('sandboxOrganizer').sandbox, shared, {
                comment: uniqueName('detail-controls'),
                maxSize: 3,
            });
            const detail = new PoolDetailPage(page);
            await detail.open(pool.id);
            await expect(detail.allocateButton).toHaveText('Allocate Sandboxes');
            await expect(detail.allocateButton).toBeEnabled();
            await expect(detail.deleteMenuButton).toBeDisabled();
        });

        test('names the allocate control in the singular when one sandbox remains', async ({
            page,
            apiAs,
            shared,
            uniqueName,
        }) => {
            const pool = await createPool(apiAs('sandboxOrganizer').sandbox, shared, {
                comment: uniqueName('detail-singular'),
                maxSize: 1,
            });
            const detail = new PoolDetailPage(page);
            await detail.open(pool.id);
            await expect(detail.allocateButton).toHaveText('Allocate Sandbox');
        });

        test('refuses the size 0 for a pool', async ({ apiAs, shared, uniqueName }) => {
            const sandbox = apiAs('sandboxOrganizer').sandbox;
            const pool = await createPool(sandbox, shared, { comment: uniqueName('detail-zero'), maxSize: 1 });
            const rejection = await sandbox.patch(`/pools/${pool.id}`, { max_size: 0 }).then(
                () => undefined,
                (error: unknown) => error,
            );
            expect(rejection, 'update to size 0').toBeInstanceOf(ApiError);
            expect((rejection as ApiError).status).toBeGreaterThanOrEqual(400);
            expect((rejection as ApiError).status).toBeLessThan(500);
            expect((await readPool(sandbox, pool.id)).max_size).toBe(1);
        });
    });

    test.describe('allocation dialog', () => {
        test('opens with the remaining pool size and allocates nothing when cancelled', async ({
            page,
            apiAs,
            shared,
            uniqueName,
            checkpoint,
        }) => {
            const sandbox = apiAs('sandboxOrganizer').sandbox;
            const pool = await createPool(sandbox, shared, { comment: uniqueName('detail-dialog'), maxSize: 3 });
            const detail = new PoolDetailPage(page);
            await detail.open(pool.id);
            const dialog = await AllocateDialog.openFrom(page, detail.allocateButton);
            await expect(dialog.sizeInput).toHaveValue('3');
            await checkpoint(page, 'allocate dialog on pool detail');
            await dialog.cancelButton.click();
            await expect(dialog.root).toBeHidden();
            await expect(detail.table.rows).toHaveCount(0);
            expect(await listAllocationUnits(sandbox, pool.id)).toHaveLength(0);
        });

        test('steps the size with the minus and plus icons within 1 and the remaining size', async ({
            page,
            apiAs,
            shared,
            uniqueName,
        }) => {
            const pool = await createPool(apiAs('sandboxOrganizer').sandbox, shared, {
                comment: uniqueName('detail-steps'),
                maxSize: 3,
            });
            const detail = new PoolDetailPage(page);
            await detail.open(pool.id);
            const dialog = await AllocateDialog.openFrom(page, detail.allocateButton);
            await dialog.incrementIcon.click();
            await expect(dialog.sizeInput).toHaveValue('3');
            await dialog.decrementIcon.click();
            await dialog.decrementIcon.click();
            await dialog.decrementIcon.click();
            await expect(dialog.sizeInput).toHaveValue('1');
            await dialog.incrementIcon.click();
            await expect(dialog.sizeInput).toHaveValue('2');
        });

        test('keeps the Allocate and Cancel buttons available', async ({ page, apiAs, shared, uniqueName }) => {
            const pool = await createPool(apiAs('sandboxOrganizer').sandbox, shared, {
                comment: uniqueName('detail-dialog-buttons'),
                maxSize: 2,
            });
            const detail = new PoolDetailPage(page);
            await detail.open(pool.id);
            const dialog = await AllocateDialog.openFrom(page, detail.allocateButton);
            await expect(dialogButton(dialog.root, 'Allocate')).toBeEnabled();
            await expect(dialog.cancelButton).toBeEnabled();
        });
    });

    for (const role of ROLES_WITHOUT_POOL_ACCESS) {
        test(`sends the ${role} account away from /pool/:id`, async ({ openAs }) => {
            await expectRedirectedAway(openAs, role, '/pool/1', { absentLinks: POOL_LINKS });
        });
    }
});
