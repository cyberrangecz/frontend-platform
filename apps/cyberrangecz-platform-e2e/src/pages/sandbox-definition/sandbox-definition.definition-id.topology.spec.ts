import { expect, test } from '../../support/fixtures';
import type { SandboxDefinitionRecord } from '../../support/pages/sandbox-definition/definition-source';
import { ROLES_WITHOUT_ACCESS, SANDBOX_DEFINITION_LINKS } from '../../support/pages/sandbox-definition/roles-without-access';
import { expectRedirectedAway } from '../../support/route-guard';
import { SandboxDefinitionTopologyPage } from '../../support/pages/sandbox-definition/sandbox-definition-topology.page';
import { describeTopology, type TopologyPayload } from '../../support/pages/sandbox-definition/topology-description';
import {
    breadcrumbLink,
    breadcrumbs,
    dismissErrorDialog,
    errorDialog,
    pageTitle,
    waitForPageReady,
} from '../../support/ui';

const UNKNOWN_DEFINITION_ID = 999_999;

test.describe('/sandbox-definition/:definitionId/topology', () => {
    test.use({ account: 'sandboxDesigner' });

    test.describe('sandbox designer', () => {
        test('titles the page with the name of the definition', async ({ page, shared, apiAs }) => {
            const record = await apiAs('sandboxDesigner').sandbox.get<SandboxDefinitionRecord>(
                `/definitions/${shared.sandboxDefinition.id}`,
            );
            const topology = new SandboxDefinitionTopologyPage(page);

            await topology.open(shared.sandboxDefinition.id);

            await expect(pageTitle(page)).toHaveText(`Topology of ${record.name}`);
            await expect(breadcrumbs(page)).toContainText('Sandbox Definitions');
            await expect(breadcrumbs(page)).toContainText('Topology');
        });

        test('loads the topology of the definition from the sandbox service', async ({ page, shared }) => {
            const topology = new SandboxDefinitionTopologyPage(page);
            const response = page.waitForResponse((candidate) =>
                candidate.url().endsWith(`/definitions/${shared.sandboxDefinition.id}/topology`),
            );

            await topology.open(shared.sandboxDefinition.id);

            expect((await response).status()).toBe(200);
        });

        test('draws the topology graph on a canvas', async ({ page, shared, checkpoint, apiAs }) => {
            const topology = new SandboxDefinitionTopologyPage(page);

            await topology.open(shared.sandboxDefinition.id);

            await expect(topology.stabilizedGraph).toBeVisible();
            await expect(topology.canvas).toBeVisible();
            await expect.poll(() => topology.hasDrawnContent()).toBe(true);
            await expect(topology.unavailableMessage).toHaveCount(0);
            const payload = await apiAs('sandboxDesigner').sandbox.get<TopologyPayload>(
                `/definitions/${shared.sandboxDefinition.id}/topology`,
            );
            await checkpoint(page, 'topology graph drawn', describeTopology(payload));
        });

        test('offers only the Topology tab and no console tab', async ({ page, shared }) => {
            const topology = new SandboxDefinitionTopologyPage(page);

            await topology.open(shared.sandboxDefinition.id);

            await expect(topology.tabs).toHaveCount(1);
            await expect(topology.tabs.first()).toHaveText('Topology');
            await expect(topology.tabs.first()).toHaveAttribute('aria-selected', 'true');
        });

        test('offers no sandbox access actions for a definition', async ({ page, shared }) => {
            const topology = new SandboxDefinitionTopologyPage(page);

            await topology.open(shared.sandboxDefinition.id);

            await expect(topology.stabilizedGraph).toBeVisible();
            await expect(page.locator('crczp-sandbox-access-actions')).toHaveCount(0);
            await expect(topology.wrapper.getByRole('button', { name: /ssh|access/i })).toHaveCount(0);
        });

        test('cycling tabs with the keyboard keeps the only tab selected', async ({ page, shared }) => {
            const topology = new SandboxDefinitionTopologyPage(page);
            await topology.open(shared.sandboxDefinition.id);
            await expect(topology.stabilizedGraph).toBeVisible();

            await page.keyboard.press('Control+Alt+ArrowRight');
            await page.keyboard.press('Control+Alt+ArrowLeft');

            await expect(topology.tabs).toHaveCount(1);
            await expect(topology.tabs.first()).toHaveAttribute('aria-selected', 'true');
        });

        test('opens no node menu when the graph is right-clicked', async ({ page, shared }) => {
            const topology = new SandboxDefinitionTopologyPage(page);
            await topology.open(shared.sandboxDefinition.id);
            await expect(topology.stabilizedGraph).toBeVisible();

            await topology.canvas.click({ button: 'right' });

            await expect(page.locator('crczp-context-menu')).toHaveCount(0);
        });

        test('the Sandbox Definitions breadcrumb returns to the overview', async ({ page, shared }) => {
            const topology = new SandboxDefinitionTopologyPage(page);
            await topology.open(shared.sandboxDefinition.id);

            await breadcrumbLink(page, 'Sandbox Definitions').click();

            await expect(page).toHaveURL(/\/sandbox-definition$/);
            await expect(pageTitle(page)).toHaveText('Sandbox Definition Overview');
        });

        test('reports an unknown definition and returns to the overview', async ({ page, checkpoint }) => {
            await page.goto(SandboxDefinitionTopologyPage.pathOf(UNKNOWN_DEFINITION_ID));

            await expect(errorDialog(page)).toBeVisible();
            await checkpoint(page, 'unknown definition reported');
            await dismissErrorDialog(page);
            await expect(page).toHaveURL(/\/sandbox-definition$/);
            await waitForPageReady(page);
        });
    });

    test.describe('accounts without the sandbox designer role', () => {
        for (const role of ROLES_WITHOUT_ACCESS) {
            test(`sends the ${role} account away from /sandbox-definition/:id/topology`, async ({ openAs, shared }) => {
                await expectRedirectedAway(openAs, role, SandboxDefinitionTopologyPage.pathOf(shared.sandboxDefinition.id), {
                    absentLinks: SANDBOX_DEFINITION_LINKS,
                });
            });
        }
    });
});
