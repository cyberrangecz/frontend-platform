import { expect, test } from '../support/fixtures';
import { POOL_LINKS, ROLES_WITHOUT_POOL_ACCESS } from '../support/pages/pool/pool-access';
import { expectRedirectedAway } from '../support/route-guard';
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

    test('shows the topology tab with the graph of the own sandbox', async ({ page, checkpoint, apiAs }) => {
        await page.goto(topologyPath());
        await waitForPageReady(page);
        await expect(pageTitle(page)).toHaveText('Sandbox Topology');
        await expect(page.locator('crczp-topology')).toBeVisible();
        await expect(page.getByRole('tab', { name: 'Topology' })).toHaveAttribute('aria-selected', 'true');
        await expect(page.locator('crczp-topology-graph')).toBeVisible();
        await expect(page.getByText('Topology unavailable')).toHaveCount(0);
        await expect(page.locator('crczp-topology-graph .graph-stabilized')).toBeVisible();
        const payload = await apiAs('sandboxOrganizer').sandbox.get<TopologyPayload>(
            `/sandboxes/${own.sandboxUuid}/topology`,
        );
        await checkpoint(page, 'sandbox topology', describeTopology(payload));
    });

    test('shows the pool and topology breadcrumbs', async ({ page }) => {
        await page.goto(topologyPath());
        await waitForPageReady(page);
        await expect(breadcrumbLink(page, 'Pools')).toBeVisible();
        await expect(breadcrumbLink(page, 'Sandbox Topology')).toBeVisible();
    });

    test.describe('access actions', () => {
        test('offers the SSH config and the VPN connection actions', async ({ page }) => {
            await page.goto(topologyPath());
            await waitForPageReady(page);
            const actions = page.locator('crczp-sandbox-access-actions');
            await expect(actions.getByRole('button', { name: 'SSH Config' })).toBeEnabled();
            await expect(actions.getByRole('button', { name: 'VPN connection' })).toBeEnabled();
        });

        test('downloads a non-empty SSH config', async ({ page }) => {
            await page.goto(topologyPath());
            await waitForPageReady(page);
            const download = await captureDownload(page, () =>
                page.getByRole('button', { name: 'SSH Config' }).click(),
            );
            expect(download.size).toBeGreaterThan(0);
            await expect(errorDialog(page)).toHaveCount(0);
        });

        test('opens the VPN panel in place of the SSH action and closes it again', async ({ page, checkpoint }) => {
            await page.goto(topologyPath());
            await waitForPageReady(page);
            await page.getByRole('button', { name: 'VPN connection' }).click();
            const panel = page.locator('crczp-vpn-guidance-panel');
            await expect(panel).toBeVisible();
            await expect(page.getByRole('button', { name: 'SSH Config' })).toHaveCount(0);
            await checkpoint(page, 'vpn panel open');
            await panel.getByRole('button', { name: 'Close' }).click();
            await expect(panel).toHaveCount(0);
            await expect(page.getByRole('button', { name: 'SSH Config' })).toBeVisible();
        });

        test('closes the VPN panel when the page is clicked elsewhere', async ({ page }) => {
            await page.goto(topologyPath());
            await waitForPageReady(page);
            await page.getByRole('button', { name: 'VPN connection' }).click();
            const panel = page.locator('crczp-vpn-guidance-panel');
            await expect(panel).toBeVisible();
            await pageTitle(page).click();
            await expect(panel).toHaveCount(0);
        });
    });

    test('shows that the topology is unavailable for a sandbox that does not exist', async ({ page }) => {
        await page.goto(topologyPath('00000000-0000-4000-8000-000000000000'));
        await expect(page.getByText('Topology unavailable')).toBeVisible();
        await expect(page.locator('crczp-logo-spinner')).toHaveCount(0);
    });

    for (const role of ROLES_WITHOUT_POOL_ACCESS) {
        test(`sends the ${role} account away from /pool/:id/sandbox-instance/:id/topology`, async ({ openAs }) => {
            await expectRedirectedAway(openAs, role, topologyPath(), { absentLinks: POOL_LINKS });
        });
    }
});
