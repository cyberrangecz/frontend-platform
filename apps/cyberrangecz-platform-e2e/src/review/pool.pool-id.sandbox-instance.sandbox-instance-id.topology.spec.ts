import { expect, test } from '../support/fixtures';
import { locateChainSandbox, type ChainSandbox } from '../support/pages/pool/review-sandbox';
import { describeTopology, type TopologyPayload } from '../support/pages/sandbox-definition/topology-description';
import { readChainRecord } from '../support/shared-fixture';
import { breadcrumbLink, captureDownload, errorDialog, pageTitle, waitForPageReady } from '../support/ui';

test.use({ account: 'sandboxOrganizer' });

test.describe('pool.pool-id.sandbox-instance.sandbox-instance-id.topology', () => {
    let own: ChainSandbox;

    test.beforeEach(async ({ apiAs, shared, browserKey }) => {
        own = await locateChainSandbox(apiAs('sandboxOrganizer').sandbox, shared, readChainRecord(browserKey));
    });

    function topologyPath(sandboxUuid = own.sandboxUuid): string {
        return `/pool/${own.poolId}/sandbox-instance/${sandboxUuid}/topology`;
    }

    test('shows the topology of the own sandbox with its breadcrumbs and access actions', async ({
        page,
        checkpoint,
        apiAs,
    }) => {
        test.slow();
        await page.goto(topologyPath());
        await waitForPageReady(page);

        await test.step('shows the topology tab with the graph of the own sandbox', async () => {
            await expect.soft(pageTitle(page), 'page title').toHaveText('Sandbox Topology');
            await expect.soft(page.locator('crczp-topology'), 'topology view').toBeVisible();
            await expect
                .soft(page.getByRole('tab', { name: 'Topology' }), 'Topology tab selected')
                .toHaveAttribute('aria-selected', 'true');
            await expect.soft(page.locator('crczp-topology-graph'), 'graph').toBeVisible();
            await expect.soft(page.getByText('Topology unavailable'), 'no unavailable notice').toHaveCount(0);
            await expect
                .soft(page.locator('crczp-topology-graph .graph-stabilized'), 'graph stabilized')
                .toBeVisible();
            const payload = await apiAs('sandboxOrganizer').sandbox.get<TopologyPayload>(
                `/sandboxes/${own.sandboxUuid}/topology`,
            );
            await checkpoint(page, 'sandbox topology', describeTopology(payload));
        });

        await test.step('shows the pool and topology breadcrumbs', async () => {
            await expect.soft(breadcrumbLink(page, 'Pools'), 'Pools breadcrumb').toBeVisible();
            await expect.soft(breadcrumbLink(page, 'Sandbox Topology'), 'topology breadcrumb').toBeVisible();
        });

        await test.step('offers the SSH config and the VPN connection actions', async () => {
            const actions = page.locator('crczp-sandbox-access-actions');
            await expect.soft(actions.getByRole('button', { name: 'SSH Config' }), 'SSH Config').toBeEnabled();
            await expect
                .soft(actions.getByRole('button', { name: 'VPN connection' }), 'VPN connection')
                .toBeEnabled();
        });

        await test.step('downloads a non-empty SSH config', async () => {
            const download = await captureDownload(page, () =>
                page.getByRole('button', { name: 'SSH Config' }).click(),
            );
            expect.soft(download.size, 'SSH config size in bytes').toBeGreaterThan(0);
            await expect.soft(errorDialog(page), 'no error dialog').toHaveCount(0);
        });

        await test.step('opens the VPN panel in place of the SSH action and closes it again', async () => {
            await page.getByRole('button', { name: 'VPN connection' }).click();
            const panel = page.locator('crczp-vpn-guidance-panel');
            await expect.soft(panel, 'VPN panel open').toBeVisible();
            await expect.soft(page.getByRole('button', { name: 'SSH Config' }), 'SSH action hidden').toHaveCount(0);
            await checkpoint(page, 'vpn panel open');
            await panel.getByRole('button', { name: 'Close' }).click();
            await expect.soft(panel, 'VPN panel closed').toHaveCount(0);
            await expect.soft(page.getByRole('button', { name: 'SSH Config' }), 'SSH action back').toBeVisible();
        });

        await test.step('closes the VPN panel when the page is clicked elsewhere', async () => {
            await page.getByRole('button', { name: 'VPN connection' }).click();
            const panel = page.locator('crczp-vpn-guidance-panel');
            await expect.soft(panel, 'VPN panel open').toBeVisible();
            await pageTitle(page).click();
            await expect.soft(panel, 'VPN panel closed by outside click').toHaveCount(0);
        });

        await test.step('shows that the topology is unavailable for a sandbox that does not exist', async () => {
            await page.goto(topologyPath('00000000-0000-4000-8000-000000000000'));
            await expect.soft(page.getByText('Topology unavailable'), 'unavailable notice').toBeVisible();
            await expect.soft(page.locator('crczp-logo-spinner'), 'no spinner').toHaveCount(0);
        });
    });
});
