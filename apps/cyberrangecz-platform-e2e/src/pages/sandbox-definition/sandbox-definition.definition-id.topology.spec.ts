import { expect, test } from '../../support/fixtures';
import type { SandboxDefinitionRecord } from '../../support/pages/sandbox-definition/definition-source';
import { SandboxDefinitionTopologyPage } from '../../support/pages/sandbox-definition/sandbox-definition-topology.page';
import {
    describeTopology,
    type TopologyPayload,
} from '../../support/pages/sandbox-definition/topology-description';
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
        test('checks the topology page of a definition', async ({
            page,
            shared,
            apiAs,
            checkpoint,
        }) => {
            test.slow();
            const topology = new SandboxDefinitionTopologyPage(page);
            const topologyResponse = page.waitForResponse((candidate) =>
                candidate
                    .url()
                    .endsWith(
                        `/definitions/${shared.sandboxDefinition.id}/topology`,
                    ),
            );
            await topology.open(shared.sandboxDefinition.id);

            await test.step('titles the page with the name of the definition', async () => {
                const record = await apiAs(
                    'sandboxDesigner',
                ).sandbox.get<SandboxDefinitionRecord>(
                    `/definitions/${shared.sandboxDefinition.id}`,
                );

                await expect
                    .soft(pageTitle(page), 'page title')
                    .toHaveText(`Topology of ${record.name}`);
                await expect
                    .soft(breadcrumbs(page), 'breadcrumbs')
                    .toContainText('Sandbox Definitions');
                await expect
                    .soft(breadcrumbs(page), 'breadcrumbs')
                    .toContainText('Topology');
            });

            await test.step('loads the topology of the definition from the sandbox service', async () => {
                expect
                    .soft(
                        (await topologyResponse).status(),
                        'topology response status',
                    )
                    .toBe(200);
            });

            await test.step('draws the topology graph on a canvas', async () => {
                await expect
                    .soft(topology.stabilizedGraph, 'stabilized graph')
                    .toBeVisible();
                await expect.soft(topology.canvas, 'canvas').toBeVisible();
                await expect
                    .configure({ soft: true })
                    .poll(() => topology.hasDrawnContent(), {
                        message: 'canvas content',
                    })
                    .toBe(true);
                await expect
                    .soft(topology.unavailableMessage, 'unavailable message')
                    .toHaveCount(0);
                const payload = await apiAs(
                    'sandboxDesigner',
                ).sandbox.get<TopologyPayload>(
                    `/definitions/${shared.sandboxDefinition.id}/topology`,
                );
                await checkpoint(
                    page,
                    'topology graph drawn',
                    describeTopology(payload),
                );
            });

            await test.step('offers only the Topology tab and no console tab', async () => {
                await expect.soft(topology.tabs, 'tabs').toHaveCount(1);
                await expect
                    .soft(topology.tabs.first(), 'tab label')
                    .toHaveText('Topology');
                await expect
                    .soft(topology.tabs.first(), 'tab selection')
                    .toHaveAttribute('aria-selected', 'true');
            });

            await test.step('offers no sandbox access actions for a definition', async () => {
                await expect
                    .soft(topology.stabilizedGraph, 'stabilized graph')
                    .toBeVisible();
                await expect
                    .soft(
                        page.locator('crczp-sandbox-access-actions'),
                        'access actions',
                    )
                    .toHaveCount(0);
                await expect
                    .soft(
                        topology.wrapper.getByRole('button', {
                            name: /ssh|access/i,
                        }),
                        'access buttons',
                    )
                    .toHaveCount(0);
            });

            await test.step('cycling tabs with the keyboard keeps the only tab selected', async () => {
                await page.keyboard.press('Control+Alt+ArrowRight');
                await page.keyboard.press('Control+Alt+ArrowLeft');

                await expect.soft(topology.tabs, 'tabs').toHaveCount(1);
                await expect
                    .soft(topology.tabs.first(), 'tab selection')
                    .toHaveAttribute('aria-selected', 'true');
            });

            await test.step('opens no node menu when the graph is right-clicked', async () => {
                await topology.canvas.click({ button: 'right' });

                await expect
                    .soft(page.locator('crczp-context-menu'), 'node menu')
                    .toHaveCount(0);
            });

            await test.step('the Sandbox Definitions breadcrumb returns to the overview', async () => {
                await breadcrumbLink(page, 'Sandbox Definitions').click();

                await expect
                    .soft(page, 'page URL')
                    .toHaveURL(/\/sandbox-definition$/);
                await expect
                    .soft(pageTitle(page), 'page title')
                    .toHaveText('Sandbox Definition Overview');
            });

            await test.step('reports an unknown definition and returns to the overview', async () => {
                await page.goto(
                    SandboxDefinitionTopologyPage.pathOf(UNKNOWN_DEFINITION_ID),
                );

                await expect(errorDialog(page)).toBeVisible();
                await checkpoint(page, 'unknown definition reported');
                await dismissErrorDialog(page);
                await expect(page).toHaveURL(/\/sandbox-definition$/);
                await waitForPageReady(page);
            });
        });
    });
});
