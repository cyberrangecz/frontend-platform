import { ApiError } from '../../support/api/api-client';
import { expect, test } from '../../support/fixtures';
import { AllocateDialog } from '../../support/pages/pool/allocate-dialog';
import { createPool, listAllocationUnits, readPool } from '../../support/pages/pool/pool-data';
import { PoolDetailPage } from '../../support/pages/pool/pool-detail-page';
import { breadcrumbEntries, breadcrumbLink, dialogButton, pageTitle } from '../../support/ui';

test.use({ account: 'sandboxOrganizer' });

const soft = expect.configure({ soft: true });

test.describe('pool.pool-id', () => {
    test('checks the detail page of a pool', async ({ page, apiAs, shared, uniqueName, checkpoint }) => {
        test.setTimeout(180_000);
        const sandbox = apiAs('sandboxOrganizer').sandbox;
        const comment = uniqueName('detail-empty');
        const pool = await createPool(sandbox, shared, { comment, maxSize: 3 });
        const detail = new PoolDetailPage(page);
        const inDialog = async (check: (dialog: AllocateDialog) => Promise<void>): Promise<void> => {
            const dialog = await AllocateDialog.openFrom(page, detail.allocateButton);
            await check(dialog);
            await dialog.cancelButton.click();
            await soft(dialog.root, 'dialog closed again').toBeHidden();
        };
        await detail.open(pool.id);

        await test.step('shows the title, the pool comment and an empty sandbox table for a new pool', async () => {
            await soft(pageTitle(page), 'page title').toHaveText(`Pool ${pool.id}`);
            await soft(page.getByRole('heading', { name: 'Sandbox Instances' }), 'table heading').toBeVisible();
            await soft(page.locator('.pool-comment'), 'pool comment').toHaveText(comment);
            await soft(detail.table.rows, 'no sandbox rows').toHaveCount(0);
            await soft(detail.table.emptyState, 'empty state').toContainText('No sandboxes in this pool yet');
            await checkpoint(page, 'empty pool detail');
        });

        await test.step('lists the sandbox table columns', async () => {
            for (const header of ['name', 'notes and comments', 'lock', 'created', 'created by', 'state', 'stages']) {
                await soft(
                    detail.table.headerCell(new RegExp(`^\\s*${header}\\s*$`, 'i')),
                    `column ${header} visible`,
                ).toBeVisible();
            }
        });

        await test.step('offers Allocate Sandboxes enabled and Delete disabled', async () => {
            await soft(detail.allocateButton, 'allocate control text').toHaveText('Allocate Sandboxes');
            await soft(detail.allocateButton, 'allocate control enabled').toBeEnabled();
            await soft(detail.deleteMenuButton, 'delete control disabled').toBeDisabled();
        });

        await test.step('opens with the remaining pool size and allocates nothing when cancelled', async () => {
            await inDialog(async (dialog) => {
                await soft(dialog.sizeInput, 'remaining size').toHaveValue('3');
                await checkpoint(page, 'allocate dialog on pool detail');
            });
            await soft(detail.table.rows, 'no sandbox rows').toHaveCount(0);
            expect.soft(await listAllocationUnits(sandbox, pool.id), 'no allocation units').toHaveLength(0);
        });

        await test.step('steps the size with the minus and plus icons within 1 and the remaining size', () =>
            inDialog(async (dialog) => {
                await dialog.incrementIcon.click();
                await soft(dialog.sizeInput, 'plus stops at the remaining size').toHaveValue('3');
                await dialog.decrementIcon.click();
                await dialog.decrementIcon.click();
                await dialog.decrementIcon.click();
                await soft(dialog.sizeInput, 'minus stops at 1').toHaveValue('1');
                await dialog.incrementIcon.click();
                await soft(dialog.sizeInput, 'plus raises by one').toHaveValue('2');
            }));

        await test.step('keeps the Allocate and Cancel buttons available', () =>
            inDialog(async (dialog) => {
                await soft(dialogButton(dialog.root, 'Allocate'), 'Allocate enabled').toBeEnabled();
                await soft(dialog.cancelButton, 'Cancel enabled').toBeEnabled();
            }));

        await test.step('shows the pool id as the last breadcrumb and leads back to the overview', async () => {
            await soft(breadcrumbLink(page, 'Pools'), 'Pools breadcrumb').toBeVisible();
            await soft(breadcrumbEntries(page).last(), 'pool id breadcrumb').toContainText(String(pool.id));
            await breadcrumbLink(page, 'Pools').click();
            await expect(page).toHaveURL(/\/pool$/);
        });

        await test.step('shows no comment paragraph for a pool without a comment', async () => {
            const uncommentedPool = await createPool(sandbox, shared, { comment: '' });
            await detail.open(uncommentedPool.id);
            await expect(page.locator('.pool-comment')).toHaveCount(0);
        });

        const singlePool = await createPool(sandbox, shared, { comment: uniqueName('detail-singular'), maxSize: 1 });

        await test.step('names the allocate control in the singular when one sandbox remains', async () => {
            await detail.open(singlePool.id);
            await expect(detail.allocateButton).toHaveText('Allocate Sandbox');
        });

        await test.step('refuses the size 0 for a pool', async () => {
            const rejection = await sandbox.patch(`/pools/${singlePool.id}`, { max_size: 0 }).then(
                () => undefined,
                (error: unknown) => error,
            );
            expect(rejection, 'update to size 0').toBeInstanceOf(ApiError);
            expect((rejection as ApiError).status).toBeGreaterThanOrEqual(400);
            expect((rejection as ApiError).status).toBeLessThan(500);
            expect((await readPool(sandbox, singlePool.id)).max_size).toBe(1);
        });
    });
});
