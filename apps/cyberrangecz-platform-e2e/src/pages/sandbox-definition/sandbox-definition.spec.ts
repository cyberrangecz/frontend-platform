import { expect, test } from '../../support/fixtures';
import {
    ensureDefinition,
    definitionSourceFor,
    ensureMoreDefinitionsThan,
    findDefinitions,
    type SandboxDefinitionRecord,
} from '../../support/pages/sandbox-definition/definition-source';
import { ROLES_WITHOUT_ACCESS, SANDBOX_DEFINITION_LINKS } from '../../support/pages/sandbox-definition/roles-without-access';
import { expectRedirectedAway } from '../../support/route-guard';
import { SandboxDefinitionOverviewPage } from '../../support/pages/sandbox-definition/sandbox-definition-overview.page';
import { SandboxDefinitionTopologyPage } from '../../support/pages/sandbox-definition/sandbox-definition-topology.page';
import { describeTopology, type TopologyPayload } from '../../support/pages/sandbox-definition/topology-description';
import {
    breadcrumbs,
    ConfirmationDialog,
    isOrdered,
    navigationLink,
    pageTitle,
    waitForNotification,
    waitForPageReady,
} from '../../support/ui';

const PAGE_SIZES = ['10', '15', '25', '50', '100'];
const SMALL_PAGE_SIZE = 10;

function repositoryAddressOf(gitUrl: string): string {
    return gitUrl.replace(/\.git$/, '');
}

test.describe('/sandbox-definition', () => {
    test.use({ account: 'sandboxDesigner' });

    test.describe('sandbox designer', () => {
        test('shows the page title, the breadcrumb trail and the table columns', async ({ page, checkpoint }) => {
            const overview = new SandboxDefinitionOverviewPage(page);
            await overview.open();

            await expect(pageTitle(page)).toHaveText('Sandbox Definition Overview');
            await expect(breadcrumbs(page)).toContainText('Sandbox Definitions');
            await expect(overview.sortButton('Id')).toBeVisible();
            await expect(overview.sortButton('Title')).toBeVisible();
            await expect(overview.createdByHeader).toBeVisible();
            await expect(page.getByRole('columnheader', { name: 'Actions' })).toBeVisible();
            await expect(overview.createButton).toBeEnabled();
            await checkpoint(page, 'overview loaded');
        });

        test('lists the shared definition with title, revision, creator and repository link', async ({
            page,
            shared,
            apiAs,
        }) => {
            const record = await apiAs('sandboxDesigner').sandbox.get<SandboxDefinitionRecord>(
                `/definitions/${shared.sandboxDefinition.id}`,
            );
            const overview = new SandboxDefinitionOverviewPage(page);
            await overview.open();
            await overview.selectPageSize(100);

            const row = overview.rowOfDefinition(shared.sandboxDefinition.id);
            await expect(overview.titleCell(row)).toHaveText(`${record.name} (${shared.sandboxDefinition.rev})`);
            await expect(overview.createdByCell(row)).not.toBeEmpty();
            await expect(overview.repositoryLink(row)).toHaveAttribute(
                'href',
                repositoryAddressOf(shared.sandboxDefinition.url),
            );
            await expect(overview.repositoryLink(row)).toHaveAttribute('target', '_blank');
            await expect(overview.topologyAction(row)).toBeVisible();
            await expect(overview.deleteAction(row)).toBeVisible();
        });

        test('the Create button opens the create form', async ({ page, checkpoint }) => {
            const overview = new SandboxDefinitionOverviewPage(page);
            await overview.open();

            await overview.createButton.click();

            await expect(page).toHaveURL(/\/sandbox-definition\/create$/);
            await expect(pageTitle(page)).toHaveText('Create Sandbox Definition');
            await checkpoint(page, 'create form opened');
        });

        test('shows the navigation link to sandbox definitions', async ({ page }) => {
            const overview = new SandboxDefinitionOverviewPage(page);
            await overview.open();

            await expect(page.locator('a[href="/sandbox-definition"]').first()).toBeVisible();
            await expect(navigationLink(page, 'Definition').first()).toBeVisible();
        });

        test.describe('sorting', () => {
            test('starts sorted by title ascending', async ({ page }) => {
                const overview = new SandboxDefinitionOverviewPage(page);
                await overview.open();

                await expect(overview.sortHeader('Title')).toHaveAttribute('aria-sort', 'ascending');
                await expect
                    .poll(async () => isOrdered((await overview.displayedTitles()).map((title) => title.toLowerCase()), 'ascending'))
                    .toBe(true);
            });

            test('sorts by id ascending and descending', async ({ page }) => {
                const overview = new SandboxDefinitionOverviewPage(page);
                await overview.open();

                await overview.table.sortTo('Id', 'ascending');
                await expect(overview.sortHeader('Title')).not.toHaveAttribute('aria-sort', /ascending|descending/);
                await expect
                    .poll(async () => isOrdered(await overview.displayedIds(), 'ascending'))
                    .toBe(true);

                await overview.table.sortTo('Id', 'descending');
                await expect
                    .poll(async () => isOrdered(await overview.displayedIds(), 'descending'))
                    .toBe(true);
            });

            test('sorts by title descending and back to ascending', async ({ page, checkpoint }) => {
                const overview = new SandboxDefinitionOverviewPage(page);
                await overview.open();

                await overview.sortButton('Title').click();
                await expect(overview.sortHeader('Title')).toHaveAttribute('aria-sort', 'descending');
                await expect
                    .poll(async () => isOrdered((await overview.displayedTitles()).map((title) => title.toLowerCase()), 'descending'))
                    .toBe(true);
                await checkpoint(page, 'sorted by title descending');

                await overview.sortButton('Title').click();
                await expect(overview.sortHeader('Title')).toHaveAttribute('aria-sort', 'ascending');
                await expect
                    .poll(async () => isOrdered((await overview.displayedTitles()).map((title) => title.toLowerCase()), 'ascending'))
                    .toBe(true);
            });

            test('offers sorting by the creator', async ({ page }) => {
                const overview = new SandboxDefinitionOverviewPage(page);
                await overview.open();

                await expect(overview.createdByHeader.getByRole('button')).toBeVisible();
            });
        });

        test.describe('paging', () => {
            test('offers the page sizes 10, 15, 25, 50 and 100', async ({ page }) => {
                const overview = new SandboxDefinitionOverviewPage(page);
                await overview.open();

                await overview.openPageSizeListByKeyboard();

                await expect(overview.pageSizeOptions).toHaveText(PAGE_SIZES);
            });

            test('opens the page-size list with a mouse click', async ({ page }) => {
                const overview = new SandboxDefinitionOverviewPage(page);
                await overview.open();

                await overview.table.openPageSizeList();

                await expect(overview.pageSizeOptions.first()).toBeVisible();
            });

            test('shows as many rows as the chosen page size', async ({ page, apiAs, checkpoint }) => {
                await ensureMoreDefinitionsThan(apiAs('sandboxDesigner').sandbox, SMALL_PAGE_SIZE);
                const overview = new SandboxDefinitionOverviewPage(page);
                await overview.open();

                await overview.selectPageSize(SMALL_PAGE_SIZE);

                await expect(overview.table.rows).toHaveCount(SMALL_PAGE_SIZE);
                await expect(overview.table.rangeLabel).toHaveText(/^\s*1\s*[–-]\s*10 of \d+\s*$/);
                await checkpoint(page, 'page size 10');
            });

            test('moves between pages with the next, previous, last and first buttons', async ({ page, apiAs }) => {
                await ensureMoreDefinitionsThan(apiAs('sandboxDesigner').sandbox, SMALL_PAGE_SIZE);
                const overview = new SandboxDefinitionOverviewPage(page);
                await overview.open();
                await overview.selectPageSize(SMALL_PAGE_SIZE);
                const firstPageIds = await overview.displayedIds();
                await expect(overview.table.previousPageButton).toBeDisabled();
                await expect(overview.table.firstPageButton).toBeDisabled();

                await overview.table.nextPageButton.click();
                await expect(overview.table.rangeLabel).toHaveText(/^\s*11\s*[–-]\s*\d+ of \d+\s*$/);
                await overview.table.waitUntilLoaded();
                await expect
                    .poll(async () => (await overview.displayedIds()).filter((id) => firstPageIds.includes(id)))
                    .toEqual([]);
                const secondPageIds = await overview.displayedIds();

                await overview.table.previousPageButton.click();
                await expect(overview.table.rangeLabel).toHaveText(/^\s*1\s*[–-]\s*10 of \d+\s*$/);
                await overview.table.waitUntilLoaded();
                await expect(overview.table.rows).toHaveCount(SMALL_PAGE_SIZE);
                await expect
                    .poll(async () => (await overview.displayedIds()).filter((id) => secondPageIds.includes(id)))
                    .toEqual([]);

                await overview.table.lastPageButton.click();
                await expect(overview.table.nextPageButton).toBeDisabled();
                await expect(overview.table.lastPageButton).toBeDisabled();

                await overview.table.firstPageButton.click();
                await expect(overview.table.rangeLabel).toHaveText(/^\s*1\s*[–-]\s*10 of \d+\s*$/);
                await expect(overview.table.previousPageButton).toBeDisabled();
            });

            test('the Show more button appends the remaining rows', async ({ page, apiAs }) => {
                await ensureMoreDefinitionsThan(apiAs('sandboxDesigner').sandbox, SMALL_PAGE_SIZE);
                const overview = new SandboxDefinitionOverviewPage(page);
                await overview.open();
                await overview.selectPageSize(SMALL_PAGE_SIZE);

                await overview.showMoreButton.click();

                await expect.poll(() => overview.table.rows.count()).toBeGreaterThan(SMALL_PAGE_SIZE);
            });
        });

        test.describe('row expansion', () => {
            test('expands a row to show the git URL of its definition and collapses it again', async ({
                page,
                shared,
            }) => {
                const overview = new SandboxDefinitionOverviewPage(page);
                await overview.open();
                await overview.selectPageSize(100);
                const row = overview.rowOfDefinition(shared.sandboxDefinition.id);

                await overview.expandToggle(row).click();
                await expect(overview.expandedDetails).toHaveCount(1);
                await expect(overview.expandedDetails).toContainText(`URL: ${shared.sandboxDefinition.url}`);

                await overview.expandToggle(row).click();
                await expect(overview.expandedDetails).toHaveCount(0);
            });

            test('expanding another row collapses the expanded one', async ({ page, apiAs }) => {
                const definitions = await apiAs('sandboxDesigner').sandbox.getAll<SandboxDefinitionRecord>('/definitions');
                const overview = new SandboxDefinitionOverviewPage(page);
                await overview.open();
                const [firstId, secondId] = await overview.displayedIds();
                const firstDefinition = definitions.find((definition) => definition.id === firstId);
                const secondDefinition = definitions.find((definition) => definition.id === secondId);
                expect(firstDefinition).toBeDefined();
                expect(secondDefinition).toBeDefined();

                await overview.expandToggle(overview.rowOfDefinition(firstId!)).click();
                await expect(overview.expandedDetails).toContainText(`URL: ${firstDefinition!.url}`);
                await overview.expandToggle(overview.rowOfDefinition(secondId!)).click();

                await expect(overview.expandedDetails).toHaveCount(1);
                await expect(overview.expandedDetails).toContainText(`URL: ${secondDefinition!.url}`);
            });
        });

        test('the topology action opens the topology page of the definition', async ({
            page,
            shared,
            checkpoint,
            apiAs,
        }) => {
            const overview = new SandboxDefinitionOverviewPage(page);
            await overview.open();
            await overview.selectPageSize(100);

            await overview.topologyAction(overview.rowOfDefinition(shared.sandboxDefinition.id)).click();

            await expect(page).toHaveURL(new RegExp(`/sandbox-definition/${shared.sandboxDefinition.id}/topology$`));
            await waitForPageReady(page);
            await expect(pageTitle(page)).toContainText('Topology of');
            await expect(new SandboxDefinitionTopologyPage(page).stabilizedGraph).toBeVisible();
            const payload = await apiAs('sandboxDesigner').sandbox.get<TopologyPayload>(
                `/definitions/${shared.sandboxDefinition.id}/topology`,
            );
            await checkpoint(page, 'topology opened', describeTopology(payload));
        });

        test.describe('deleting', () => {
            test('the delete dialog names the definition and cancelling keeps it', async ({
                page,
                apiAs,
                browserKey,
                checkpoint,
            }) => {
                const sandbox = apiAs('sandboxDesigner').sandbox;
                const source = definitionSourceFor(browserKey, 'cancelDelete');
                const created = await ensureDefinition(sandbox, source);
                const overview = new SandboxDefinitionOverviewPage(page);
                await overview.open();
                await overview.selectPageSize(100);
                const row = overview.rowOfDefinition(created.id);

                await overview.deleteAction(row).click();

                const dialog = new ConfirmationDialog(page, 'Delete Sandbox Definition');
                await expect(dialog.title).toHaveText('Delete Sandbox Definition');
                await expect(dialog.message).toHaveText(`Do you want to delete sandbox definition "${created.name}"?`);
                await checkpoint(page, 'delete dialog open');

                await dialog.cancel();

                await expect(dialog.root).toHaveCount(0);
                await expect(row).toHaveCount(1);
                expect(await findDefinitions(sandbox, source)).toHaveLength(1);
            });

            test('confirming deletes the definition and reports it', async ({ page, apiAs, browserKey, checkpoint }) => {
                const sandbox = apiAs('sandboxDesigner').sandbox;
                const source = definitionSourceFor(browserKey, 'delete');
                const created = await ensureDefinition(sandbox, source);
                const overview = new SandboxDefinitionOverviewPage(page);
                await overview.open();
                await overview.selectPageSize(100);
                const row = overview.rowOfDefinition(created.id);
                await expect(row).toHaveCount(1);

                await overview.deleteAction(row).click();
                await new ConfirmationDialog(page, 'Delete Sandbox Definition').confirm();

                const notification = await waitForNotification(page, 'Sandbox definition was successfully deleted');
                expect(notification.kind).toBe('success');
                await expect(row).toHaveCount(0);
                await expect.poll(async () => findDefinitions(sandbox, source)).toEqual([]);
                await checkpoint(page, 'definition deleted');
            });
        });
    });

    test.describe('accounts without the sandbox designer role', () => {
        for (const role of ROLES_WITHOUT_ACCESS) {
            test(`sends the ${role} account away from /sandbox-definition`, async ({ openAs }) => {
                await expectRedirectedAway(openAs, role, SandboxDefinitionOverviewPage.PATH, { absentLinks: SANDBOX_DEFINITION_LINKS });
            });
        }
    });
});
