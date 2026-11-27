import { expect, test } from '../../support/fixtures';
import {
    definitionSourceFor,
    ensureDefinition,
    ensureMoreDefinitionsThan,
    findDefinitions,
    type SandboxDefinitionRecord,
} from '../../support/pages/sandbox-definition/definition-source';
import { SandboxDefinitionOverviewPage } from '../../support/pages/sandbox-definition/sandbox-definition-overview.page';
import { SandboxDefinitionTopologyPage } from '../../support/pages/sandbox-definition/sandbox-definition-topology.page';
import {
    describeTopology,
    type TopologyPayload,
} from '../../support/pages/sandbox-definition/topology-description';
import {
    breadcrumbs,
    ConfirmationDialog,
    isOrdered,
    navigationLink,
    pageTitle,
    waitForNotification,
    waitForPageReady,
} from '../../support/ui';

const PAGE_SIZES = ['10', '25', '50', '100'];
const SMALL_PAGE_SIZE = 10;

const softly = expect.configure({ soft: true });

function repositoryAddressOf(gitUrl: string): string {
    return gitUrl.replace(/\.git$/, '');
}

test.describe('/sandbox-definition', () => {
    test.use({ account: 'sandboxDesigner' });

    test.describe('sandbox designer', () => {
        test('checks the overview table, its sorting, paging and row actions', async ({
            page,
            shared,
            apiAs,
            checkpoint,
        }) => {
            test.slow();
            const sandbox = apiAs('sandboxDesigner').sandbox;
            const overview = new SandboxDefinitionOverviewPage(page);
            const displayedTitlesLowerCase = async () =>
                (await overview.displayedTitles()).map((title) =>
                    title.toLowerCase(),
                );

            await test.step('shows the page title, the breadcrumb trail and the table columns', async () => {
                await overview.open();

                await expect
                    .soft(pageTitle(page), 'page title')
                    .toHaveText('Sandbox Definition Overview');
                await expect
                    .soft(breadcrumbs(page), 'breadcrumbs')
                    .toContainText('Sandbox Definitions');
                await expect
                    .soft(overview.sortButton('Id'), 'Id sort button')
                    .toBeVisible();
                await expect
                    .soft(overview.sortButton('Title'), 'Title sort button')
                    .toBeVisible();
                await expect
                    .soft(overview.createdByHeader, 'Created By header')
                    .toBeVisible();
                await expect
                    .soft(
                        page.getByRole('columnheader', { name: 'Actions' }),
                        'Actions header',
                    )
                    .toBeVisible();
                await expect
                    .soft(overview.createButton, 'Create button')
                    .toBeEnabled();
                await checkpoint(page, 'overview loaded');
            });

            await test.step('starts sorted by title ascending', async () => {
                await expect
                    .soft(overview.sortHeader('Title'), 'Title sort direction')
                    .toHaveAttribute('aria-sort', 'ascending');
                await softly
                    .poll(
                        async () =>
                            isOrdered(
                                await displayedTitlesLowerCase(),
                                'ascending',
                            ),
                        {
                            message: 'titles ascending',
                        },
                    )
                    .toBe(true);
            });

            await test.step('lists the shared definition with title, revision, creator and repository link', async () => {
                const record = await sandbox.get<SandboxDefinitionRecord>(
                    `/definitions/${shared.sandboxDefinition.id}`,
                );
                await overview.selectPageSize(100);

                const row = overview.rowOfDefinition(
                    shared.sandboxDefinition.id,
                );
                await expect
                    .soft(overview.titleCell(row), 'title with revision')
                    .toHaveText(
                        `${record.name} (${shared.sandboxDefinition.rev})`,
                    );
                await expect
                    .soft(overview.createdByCell(row), 'creator')
                    .not.toBeEmpty();
                await expect
                    .soft(
                        overview.repositoryLink(row),
                        'repository link address',
                    )
                    .toHaveAttribute(
                        'href',
                        repositoryAddressOf(shared.sandboxDefinition.url),
                    );
                await expect
                    .soft(
                        overview.repositoryLink(row),
                        'repository link target',
                    )
                    .toHaveAttribute('target', '_blank');
                await expect
                    .soft(overview.topologyAction(row), 'topology action')
                    .toBeVisible();
                await expect
                    .soft(overview.deleteAction(row), 'delete action')
                    .toBeVisible();
            });

            await test.step('shows the navigation link to sandbox definitions', async () => {
                await expect
                    .soft(
                        page.locator('a[href="/sandbox-definition"]').first(),
                        'link to the overview',
                    )
                    .toBeVisible();
                await expect
                    .soft(
                        navigationLink(page, 'Definition').first(),
                        'navigation entry',
                    )
                    .toBeVisible();
            });

            await test.step('sorts by title descending and back to ascending', async () => {
                await overview.sortButton('Title').click();
                await expect
                    .soft(overview.sortHeader('Title'), 'Title sort direction')
                    .toHaveAttribute('aria-sort', 'descending');
                await softly
                    .poll(
                        async () =>
                            isOrdered(
                                await displayedTitlesLowerCase(),
                                'descending',
                            ),
                        {
                            message: 'titles descending',
                        },
                    )
                    .toBe(true);
                await checkpoint(page, 'sorted by title descending');

                await overview.sortButton('Title').click();
                await expect
                    .soft(overview.sortHeader('Title'), 'Title sort direction')
                    .toHaveAttribute('aria-sort', 'ascending');
                await softly
                    .poll(
                        async () =>
                            isOrdered(
                                await displayedTitlesLowerCase(),
                                'ascending',
                            ),
                        {
                            message: 'titles ascending again',
                        },
                    )
                    .toBe(true);
            });

            await test.step('sorts by id ascending and descending', async () => {
                await overview.table.sortTo('Id', 'ascending');
                await expect
                    .soft(overview.sortHeader('Title'), 'Title sort direction')
                    .not.toHaveAttribute('aria-sort', /ascending|descending/);
                await softly
                    .poll(
                        async () =>
                            isOrdered(
                                await overview.displayedIds(),
                                'ascending',
                            ),
                        {
                            message: 'ids ascending',
                        },
                    )
                    .toBe(true);

                await overview.table.sortTo('Id', 'descending');
                await softly
                    .poll(
                        async () =>
                            isOrdered(
                                await overview.displayedIds(),
                                'descending',
                            ),
                        {
                            message: 'ids descending',
                        },
                    )
                    .toBe(true);
            });

            await test.step('offers sorting by the creator', async () => {
                await expect
                    .soft(
                        overview.createdByHeader.getByRole('button'),
                        'Created By sort button',
                    )
                    .toBeVisible();
            });

            await test.step('offers the page sizes 10, 25, 50 and 100', async () => {
                await overview.openPageSizeListByKeyboard();

                await expect
                    .soft(overview.pageSizeOptions, 'page size options')
                    .toHaveText(PAGE_SIZES);
                await page.keyboard.press('Escape');
                await expect(overview.pageSizeOptions).toHaveCount(0);
            });

            await test.step('opens the page-size list with a mouse click', async () => {
                await overview.table.openPageSizeList();

                await expect
                    .soft(
                        overview.pageSizeOptions.first(),
                        'first page size option',
                    )
                    .toBeVisible();
                await page.keyboard.press('Escape');
                await expect(overview.pageSizeOptions).toHaveCount(0);
            });

            await test.step('shows as many rows as the chosen page size', async () => {
                await ensureMoreDefinitionsThan(sandbox, SMALL_PAGE_SIZE);
                await overview.selectPageSize(SMALL_PAGE_SIZE);

                await expect
                    .soft(overview.table.rows, 'row count')
                    .toHaveCount(SMALL_PAGE_SIZE);
                await expect
                    .soft(overview.table.rangeLabel, 'range label')
                    .toHaveText(/^\s*1\s*[–-]\s*10 of \d+\s*$/);
                await checkpoint(page, 'page size 10');
            });

            await test.step('moves between pages with the next, previous, last and first buttons', async () => {
                const firstPageIds = await overview.displayedIds();
                await expect
                    .soft(
                        overview.table.previousPageButton,
                        'previous page button',
                    )
                    .toBeDisabled();
                await expect
                    .soft(overview.table.firstPageButton, 'first page button')
                    .toBeDisabled();

                await overview.table.nextPageButton.click();
                await expect
                    .soft(overview.table.rangeLabel, 'second page range label')
                    .toHaveText(/^\s*11\s*[–-]\s*\d+ of \d+\s*$/);
                await overview.table.waitUntilLoaded();
                await softly
                    .poll(
                        async () =>
                            (await overview.displayedIds()).filter((id) =>
                                firstPageIds.includes(id),
                            ),
                        {
                            message: 'ids shared with the first page',
                        },
                    )
                    .toEqual([]);
                const secondPageIds = await overview.displayedIds();

                await overview.table.previousPageButton.click();
                await expect
                    .soft(overview.table.rangeLabel, 'first page range label')
                    .toHaveText(/^\s*1\s*[–-]\s*10 of \d+\s*$/);
                await overview.table.waitUntilLoaded();
                await expect
                    .soft(overview.table.rows, 'first page row count')
                    .toHaveCount(SMALL_PAGE_SIZE);
                await softly
                    .poll(
                        async () =>
                            (await overview.displayedIds()).filter((id) =>
                                secondPageIds.includes(id),
                            ),
                        {
                            message: 'ids shared with the second page',
                        },
                    )
                    .toEqual([]);

                await overview.table.lastPageButton.click();
                await expect
                    .soft(
                        overview.table.nextPageButton,
                        'next page button on the last page',
                    )
                    .toBeDisabled();
                await expect
                    .soft(
                        overview.table.lastPageButton,
                        'last page button on the last page',
                    )
                    .toBeDisabled();

                await overview.table.firstPageButton.click();
                await expect
                    .soft(
                        overview.table.rangeLabel,
                        'range label back on the first page',
                    )
                    .toHaveText(/^\s*1\s*[–-]\s*10 of \d+\s*$/);
                await expect
                    .soft(
                        overview.table.previousPageButton,
                        'previous page button on the first page',
                    )
                    .toBeDisabled();
            });

            await test.step('the Show more button appends the remaining rows', async () => {
                await overview.showMoreButton.click();

                await softly
                    .poll(() => overview.table.rows.count(), {
                        message: 'row count after Show more',
                    })
                    .toBeGreaterThan(SMALL_PAGE_SIZE);
            });

            await test.step('expands a row to show the git URL of its definition and collapses it again', async () => {
                await overview.open();
                await overview.selectPageSize(100);
                const row = overview.rowOfDefinition(
                    shared.sandboxDefinition.id,
                );

                await overview.expandToggle(row).click();
                await expect
                    .soft(overview.expandedDetails, 'expanded details')
                    .toHaveCount(1);
                await expect
                    .soft(overview.expandedDetails, 'git URL')
                    .toContainText(`URL: ${shared.sandboxDefinition.url}`);

                await overview.expandToggle(row).click();
                await expect
                    .soft(
                        overview.expandedDetails,
                        'expanded details after collapsing',
                    )
                    .toHaveCount(0);
            });

            await test.step('expanding another row collapses the expanded one', async () => {
                const definitions =
                    await sandbox.getAll<SandboxDefinitionRecord>(
                        '/definitions',
                    );
                const [firstId, secondId] = await overview.displayedIds();
                const firstDefinition = definitions.find(
                    (definition) => definition.id === firstId,
                );
                const secondDefinition = definitions.find(
                    (definition) => definition.id === secondId,
                );
                expect(firstDefinition).toBeDefined();
                expect(secondDefinition).toBeDefined();

                await overview
                    .expandToggle(overview.rowOfDefinition(firstId!))
                    .click();
                await expect
                    .soft(overview.expandedDetails, 'git URL of the first row')
                    .toContainText(`URL: ${firstDefinition!.url}`);
                await overview
                    .expandToggle(overview.rowOfDefinition(secondId!))
                    .click();

                await expect
                    .soft(overview.expandedDetails, 'expanded details')
                    .toHaveCount(1);
                await expect
                    .soft(overview.expandedDetails, 'git URL of the second row')
                    .toContainText(`URL: ${secondDefinition!.url}`);
            });

            await test.step('the Create button opens the create form', async () => {
                await overview.open();

                await overview.createButton.click();

                await expect
                    .soft(page, 'page URL')
                    .toHaveURL(/\/sandbox-definition\/create$/);
                await expect
                    .soft(pageTitle(page), 'page title')
                    .toHaveText('Create Sandbox Definition');
                await checkpoint(page, 'create form opened');
            });

            await test.step('the topology action opens the topology page of the definition', async () => {
                await overview.open();
                await overview.selectPageSize(100);

                await overview
                    .topologyAction(
                        overview.rowOfDefinition(shared.sandboxDefinition.id),
                    )
                    .click();

                await expect(page).toHaveURL(
                    new RegExp(
                        `/sandbox-definition/${shared.sandboxDefinition.id}/topology$`,
                    ),
                );
                await waitForPageReady(page);
                await expect
                    .soft(pageTitle(page), 'page title')
                    .toContainText('Topology of');
                await expect
                    .soft(
                        new SandboxDefinitionTopologyPage(page).stabilizedGraph,
                        'topology graph',
                    )
                    .toBeVisible();
                const payload = await sandbox.get<TopologyPayload>(
                    `/definitions/${shared.sandboxDefinition.id}/topology`,
                );
                await checkpoint(
                    page,
                    'topology opened',
                    describeTopology(payload),
                );
            });
        });

        test('deletes a definition after cancelling the confirmation once', async ({
            page,
            apiAs,
            browserKey,
            checkpoint,
        }) => {
            const sandbox = apiAs('sandboxDesigner').sandbox;
            const source = definitionSourceFor(browserKey, 'delete');
            const created = await ensureDefinition(sandbox, source);
            const overview = new SandboxDefinitionOverviewPage(page);
            await overview.open();
            await overview.selectPageSize(100);
            const row = overview.rowOfDefinition(created.id);
            const dialog = new ConfirmationDialog(
                page,
                'Delete Sandbox Definition',
            );

            await test.step('the delete dialog names the definition and cancelling keeps it', async () => {
                await overview.deleteAction(row).click();

                await expect
                    .soft(dialog.title, 'dialog title')
                    .toHaveText('Delete Sandbox Definition');
                await expect
                    .soft(dialog.message, 'dialog message')
                    .toHaveText(
                        `Do you want to delete sandbox definition "${created.name}"?`,
                    );
                await checkpoint(page, 'delete dialog open');

                await dialog.cancel();

                await expect(dialog.root).toHaveCount(0);
                await expect(row).toHaveCount(1);
                expect(await findDefinitions(sandbox, source)).toHaveLength(1);
            });

            await test.step('confirming deletes the definition and reports it', async () => {
                await overview.deleteAction(row).click();
                await dialog.confirm();

                const notification = await waitForNotification(
                    page,
                    'Sandbox definition was successfully deleted',
                );
                expect(notification.kind).toBe('success');
                await expect(row).toHaveCount(0);
                await expect
                    .poll(async () => findDefinitions(sandbox, source))
                    .toEqual([]);
                await checkpoint(page, 'definition deleted');
            });
        });
    });
});
