import { expect, test } from '../support/fixtures';
import { readPool } from '../support/pages/pool/pool-data';
import { PoolOverviewPage } from '../support/pages/pool/pool-overview-page';

test.use({ account: 'sandboxOrganizer' });

const UTILIZATION_HEADER = 'Instances / VCPUs / RAM / ports / network utilization';
const MERGED_TEST_TIMEOUT_MILLISECONDS = 180_000;

test.describe('pool (shared pool with allocated sandboxes)', () => {
    test('shows the shared pool with its size, utilization and detail link', async ({ page, apiAs, shared }) => {
        test.setTimeout(MERGED_TEST_TIMEOUT_MILLISECONDS);
        const pool = await readPool(apiAs('sandboxOrganizer').sandbox, shared.pool.id);
        const overview = new PoolOverviewPage(page);
        await overview.open();
        const row = await overview.showPool(shared.pool.id);

        await test.step('shows the used and maximum size of the shared pool as the backend reports them', async () => {
            await expect
                .soft(await overview.table.cell(row, 'Size'), 'size cell reads used/maximum size of the pool')
                .toHaveText(`${pool.size}/${pool.max_size}`);
        });

        await test.step('shows a non-zero instance utilization once the chains allocated sandboxes', async () => {
            const utilization = await overview.table.cell(row, UTILIZATION_HEADER);
            await expect
                .soft(utilization, 'utilization is not all zeros')
                .not.toHaveText(/^0\.0% \/ 0\.0% \/ 0\.0% \/ 0\.0% \/ 0\.0%$/);
        });

        await test.step('leads from the title of the shared pool to its detail', async () => {
            await row.getByRole('link', { name: `Pool ${shared.pool.id}`, exact: true }).click();
            await expect(page).toHaveURL(new RegExp(`/pool/${shared.pool.id}$`));
        });
    });
});
