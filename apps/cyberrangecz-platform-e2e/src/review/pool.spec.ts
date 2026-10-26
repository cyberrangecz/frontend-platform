import { expect, test } from '../support/fixtures';
import { readPool } from '../support/pages/pool/pool-data';
import { PoolOverviewPage } from '../support/pages/pool/pool-overview-page';

test.use({ account: 'sandboxOrganizer' });

const UTILIZATION_HEADER = 'Instances / VCPUs / RAM / ports / network utilization';

test.describe('pool (shared pool with allocated sandboxes)', () => {
    test('shows the used and maximum size of the shared pool as the backend reports them', async ({
        page,
        apiAs,
        shared,
    }) => {
        const pool = await readPool(apiAs('sandboxOrganizer').sandbox, shared.pool.id);
        const overview = new PoolOverviewPage(page);
        await overview.open();
        const row = await overview.showPool(shared.pool.id);
        await expect(await overview.table.cell(row, 'Size')).toHaveText(`${pool.size}/${pool.max_size}`);
    });

    test('shows a non-zero instance utilization once the chains allocated sandboxes', async ({ page, shared }) => {
        const overview = new PoolOverviewPage(page);
        await overview.open();
        const row = await overview.showPool(shared.pool.id);
        const utilization = await overview.table.cell(row, UTILIZATION_HEADER);
        await expect(utilization).not.toHaveText(/^0\.0% \/ 0\.0% \/ 0\.0% \/ 0\.0% \/ 0\.0%$/);
    });

    test('leads from the title of the shared pool to its detail', async ({ page, shared }) => {
        const overview = new PoolOverviewPage(page);
        await overview.open();
        const row = await overview.showPool(shared.pool.id);
        await row.getByRole('link', { name: `Pool ${shared.pool.id}`, exact: true }).click();
        await expect(page).toHaveURL(new RegExp(`/pool/${shared.pool.id}$`));
    });
});
