import { expect, test } from '../../support/fixtures';
import { AGENDAS } from '../../support/pages/common/role-agendas';
import { DefinitionOverviewPage } from '../../support/pages/training-definition/definition-overview.page';
import {
    changeDefinitionState,
    createEmptyDefinition,
    exportDefinition,
    fetchDefinition,
    fetchDefinitionByTitle,
    fetchDefinitionDetailByTitle,
    importDefinitionBody,
    importFullDefinition,
    requireDefinitionByTitle,
} from '../../support/pages/training-definition/training-definition-data';
import { FILTER_SETTLE_TIMEOUT_MILLISECONDS } from '../../support/time';
import {
    SHARED_TRAINING_LEVEL_ORDER,
    trainingImportWithoutAttachments,
} from '../../support/scenario/shared-training-loader';
import {
    captureDownload,
    ConfirmationDialog,
    FileUploadDialog,
    openDialog,
    pageTitle,
    waitForNotification,
} from '../../support/ui';

const CLONE_DIALOG_TITLE = /^Clone /;
const STATE_DIALOG_TITLE = 'Training Definition State Change';
const SORTABLE_COLUMNS = [
    'Title',
    'Estimated Duration',
    'Created At',
    'Last Edit',
    'Last Edit By',
    'State',
] as const;
// Columns whose values differ per row of the test data, so reversing the direction reverses the row order.
const DISTINCT_VALUE_COLUMNS: readonly string[] = [
    'Title',
    'Created At',
    'Last Edit',
];
const SPECIAL_TEXT = 'Žluťoučký kůň <b>x</b>';
const softly = expect.configure({ soft: true });

test.describe('linear-definition', () => {
    test.use({ account: 'trainingDesigner' });

    test('checks the overview table, its filter, sorting and control bar', async ({
        page,
        apiAs,
        uniqueName,
        shared,
        checkpoint,
    }) => {
        test.slow();
        const api = apiAs('trainingDesigner');
        const prefix = uniqueName('overview');
        const titleOf = (suffix: string): string => `${prefix}-${suffix}`;
        const releasedRow = await createEmptyDefinition(api, titleOf('b'));
        await createEmptyDefinition(api, titleOf('c'));
        await createEmptyDefinition(api, titleOf('a'));
        const overview = new DefinitionOverviewPage(page);
        await overview.goto();

        await test.step('shows the page title and every column header', async () => {
            await expect
                .soft(pageTitle(page), 'page title')
                .toHaveText(AGENDAS.trainingDefinition.pageTitle);
            for (const label of SORTABLE_COLUMNS) {
                await expect
                    .soft(overview.column(label), `column ${label}`)
                    .toBeVisible();
            }
            await checkpoint(page, 'overview loaded');
        });

        await test.step('shows the most recently edited definition first on the initial load', async () => {
            await expect
                .soft(overview.column('Last Edit'), 'initial sort direction')
                .toHaveAttribute('aria-sort', 'descending');
            await overview.filterBy(prefix);
            await softly
                .poll(() => overview.rowTitles(), {
                    message: 'rows in initial order',
                    timeout: FILTER_SETTLE_TIMEOUT_MILLISECONDS,
                })
                .toEqual([titleOf('a'), titleOf('c'), titleOf('b')]);
            await changeDefinitionState(api, releasedRow.id, 'RELEASED');
        });

        await test.step('lists the shared released definition with the actions a released definition offers', async () => {
            const row = await overview.findRow(shared.trainingDefinition.title);
            await expect.soft(row, 'shared definition row').toBeVisible();
            await expect
                .soft(
                    row.locator('td[data-cy$="-state"]'),
                    'shared definition state',
                )
                .toContainText(/released/i);
            for (const action of [
                'edit',
                'delete',
                'clone',
                'download',
                'preview',
                'unrelease',
                'archive',
            ] as const) {
                await expect
                    .soft(overview.action(row, action), `action ${action}`)
                    .toBeVisible();
            }
            await expect
                .soft(overview.action(row, 'release'), 'action release')
                .toHaveCount(0);
        });

        await test.step('narrows the rows to the definitions whose title contains the filter text', async () => {
            await overview.filterBy(titleOf('a'));
            await expect
                .soft(overview.table.rows, 'rows matching the filter')
                .toHaveCount(1, {
                    timeout: FILTER_SETTLE_TIMEOUT_MILLISECONDS,
                });
            await expect
                .soft(overview.rowOf(titleOf('a')), 'matching row')
                .toBeVisible({ timeout: FILTER_SETTLE_TIMEOUT_MILLISECONDS });
        });

        await test.step('filters regardless of letter case', async () => {
            await overview.filterBy(titleOf('c').toUpperCase());
            await expect
                .soft(
                    overview.rowOf(titleOf('c')),
                    'row found by an upper case filter',
                )
                .toBeVisible({ timeout: FILTER_SETTLE_TIMEOUT_MILLISECONDS });
        });

        await test.step('shows the empty state when the filter matches nothing', async () => {
            await overview.filterBy(uniqueName('no-such-definition'));
            await expect
                .soft(overview.table.rows, 'rows for a filter matching nothing')
                .toHaveCount(0, {
                    timeout: FILTER_SETTLE_TIMEOUT_MILLISECONDS,
                });
            await expect
                .soft(overview.table.emptyState, 'empty state')
                .toBeVisible({ timeout: FILTER_SETTLE_TIMEOUT_MILLISECONDS });
            await checkpoint(page, 'empty filter result');
        });

        await test.step('restores the full list when the filter is cleared', async () => {
            await overview.filterBy(titleOf('a'));
            await expect
                .soft(overview.table.rows, 'rows matching the filter')
                .toHaveCount(1, {
                    timeout: FILTER_SETTLE_TIMEOUT_MILLISECONDS,
                });
            await overview.filterBy('');
            await softly
                .poll(() => overview.table.rows.count(), {
                    message: 'rows after clearing the filter',
                })
                .toBeGreaterThan(1);
        });

        for (const column of SORTABLE_COLUMNS) {
            await test.step(`sorts by ${column} in both directions`, async () => {
                await overview.filterBy(prefix);
                await expect
                    .soft(overview.table.rows, 'rows of the prefix')
                    .toHaveCount(3);
                const header = overview.column(column);
                await overview.sortBy(column);
                await expect
                    .soft(header, 'first direction')
                    .toHaveAttribute('aria-sort', /^(ascending|descending)$/);
                const firstDirection = (await header.getAttribute(
                    'aria-sort',
                )) as 'ascending' | 'descending';
                const firstOrder = await overview.rowTitles();

                await overview.sortBy(column);
                const secondDirection =
                    firstDirection === 'ascending' ? 'descending' : 'ascending';
                await expect
                    .soft(header, 'reversed direction')
                    .toHaveAttribute('aria-sort', secondDirection);
                if (DISTINCT_VALUE_COLUMNS.includes(column)) {
                    await softly
                        .poll(() => overview.rowTitles(), {
                            message: 'reversed row order',
                        })
                        .toEqual([...firstOrder].reverse());
                }
            });
        }

        await test.step('orders the rows alphabetically when sorting by Title', async () => {
            await overview.filterBy(prefix);
            await expect
                .soft(overview.table.rows, 'rows of the prefix')
                .toHaveCount(3);
            await overview.sortBy('Title');
            const direction = await overview
                .column('Title')
                .getAttribute('aria-sort');
            const ascending = ['a', 'b', 'c'].map(titleOf);
            await softly
                .poll(() => overview.rowTitles(), {
                    message: 'alphabetical row order',
                })
                .toEqual(
                    direction === 'ascending'
                        ? ascending
                        : [...ascending].reverse(),
                );
        });

        await test.step('opens the create page with the Create control', async () => {
            await overview.createButton.click();
            await expect
                .soft(page, 'create page')
                .toHaveURL(/\/linear-definition\/create$/);
        });

        await test.step('opens the MITRE ATT&CK Techniques page from the bottom control', async () => {
            await overview.goto();
            await overview.mitreButton.click();
            await expect
                .soft(page, 'MITRE page')
                .toHaveURL(/\/mitre-techniques$/);
            await expect
                .soft(pageTitle(page), 'MITRE page title')
                .toHaveText('MITRE ATT&CK Techniques');
        });
    });

    test.describe('paging', () => {
        test('lists the page sizes 10, 25 and 50 and no other', async ({
            page,
        }) => {
            const overview = new DefinitionOverviewPage(page);
            await overview.goto();
            await overview.table.pageSizeSelect.focus();
            await page.keyboard.press('Enter');
            for (const size of ['10', '25', '50']) {
                await expect(
                    page.getByRole('option', { name: size, exact: true }),
                ).toBeVisible();
            }
            await expect(
                page.getByRole('option', { name: '100', exact: true }),
            ).toHaveCount(0);
        });

        test('opens the page-size selector with a mouse click', async ({
            page,
        }) => {
            const overview = new DefinitionOverviewPage(page);
            await overview.goto();
            await overview.table.openPageSizeList();
            await expect(
                page.getByRole('option', { name: '10', exact: true }),
            ).toBeVisible();
        });

        test('splits the rows over pages and walks through them with the paginator buttons', async ({
            page,
            apiAs,
            uniqueName,
            checkpoint,
        }) => {
            const api = apiAs('trainingDesigner');
            const prefix = uniqueName('paging');
            for (let index = 0; index < 11; index++) {
                await createEmptyDefinition(api, `${prefix}-${index}`);
            }
            const overview = new DefinitionOverviewPage(page);
            await overview.goto();
            await overview.filterBy(prefix);
            await expect(overview.table.rangeLabel).toHaveText(/of 11\s*$/);

            await overview.table.pageSizeSelect.focus();
            await page.keyboard.press('Enter');
            await page.getByRole('option', { name: '10', exact: true }).click();
            await expect(overview.table.rows).toHaveCount(10);
            await expect(overview.table.rangeLabel).toHaveText(
                /1\s*[–-]\s*10 of 11/,
            );
            await expect(overview.table.previousPageButton).toBeDisabled();
            await checkpoint(page, 'first page of 2');

            await overview.table.nextPageButton.click();
            await expect(overview.table.rows).toHaveCount(1);
            await expect(overview.table.rangeLabel).toHaveText(
                /11\s*[–-]\s*11 of 11/,
            );
            await expect(overview.table.nextPageButton).toBeDisabled();

            await overview.table.firstPageButton.click();
            await expect(overview.table.rows).toHaveCount(10);
            await overview.table.lastPageButton.click();
            await expect(overview.table.rows).toHaveCount(1);
            await overview.table.previousPageButton.click();
            await expect(overview.table.rows).toHaveCount(10);
        });
    });

    test.describe('upload', () => {
        test('opens the upload dialog and cancels it without creating a definition', async ({
            page,
            checkpoint,
        }) => {
            const overview = new DefinitionOverviewPage(page);
            await overview.goto();
            await overview.uploadButton.click();
            const dialog = new FileUploadDialog(page);
            await expect(dialog.title).toHaveText(
                /Upload Training definition/i,
            );
            await expect(dialog.confirmButton).toBeDisabled();
            await checkpoint(page, 'upload dialog open');
            await dialog.cancelButton.click();
            await expect(dialog.root).toBeHidden();
        });

        test('imports a definition file and lists the new definition', async ({
            page,
            apiAs,
            uniqueName,
            checkpoint,
        }) => {
            const title = uniqueName('upload-valid');
            const overview = new DefinitionOverviewPage(page);
            await overview.goto();
            await overview.uploadButton.click();
            const dialog = new FileUploadDialog(page);
            await dialog.chooseFiles({
                name: 'definition.json',
                mimeType: 'application/json',
                buffer: Buffer.from(
                    JSON.stringify(trainingImportWithoutAttachments(title)),
                ),
            });
            await expect(dialog.chosenFiles).toHaveCount(1);
            await expect(dialog.definitionCards).toHaveCount(1);
            await expect(dialog.definitionCards.first()).toContainText(title);
            await expect(dialog.definitionCards.first()).toContainText('JSON');
            await expect(dialog.confirmButton).toBeEnabled();
            await dialog.confirmButton.click();
            expect(
                (
                    await waitForNotification(
                        page,
                        'Training definition was uploaded',
                    )
                ).kind,
            ).toBe('success');
            await checkpoint(page, 'definition uploaded');
            await expect
                .poll(() =>
                    fetchDefinitionByTitle(apiAs('trainingDesigner'), title),
                )
                .toBeDefined();
            await overview.filterBy(title);
            await expect(overview.rowOf(title)).toBeVisible();
        });

        test('rejects an invalid JSON file in the dialog with its reason and uploads nothing', async ({
            page,
            checkpoint,
        }) => {
            const overview = new DefinitionOverviewPage(page);
            await overview.goto();
            await overview.uploadButton.click();
            const dialog = new FileUploadDialog(page);
            await dialog.chooseFiles({
                name: 'broken.json',
                mimeType: 'application/json',
                buffer: Buffer.from('{ this is not json'),
            });
            await expect(dialog.rejections).toHaveText(
                /The file is not well-formed JSON/,
            );
            await expect(dialog.definitionCards).toHaveCount(0);
            await expect(dialog.confirmButton).toBeDisabled();
            await checkpoint(page, 'invalid file rejected');
        });

        test('rejects a definition file without a title in the dialog', async ({
            page,
        }) => {
            const overview = new DefinitionOverviewPage(page);
            await overview.goto();
            await overview.uploadButton.click();
            const dialog = new FileUploadDialog(page);
            await dialog.chooseFiles({
                name: 'untitled.json',
                mimeType: 'application/json',
                buffer: Buffer.from(
                    JSON.stringify({ description: 'no title', levels: [] }),
                ),
            });
            await expect(dialog.rejections).toHaveText(
                /The file has no definition title/,
            );
            await expect(dialog.confirmButton).toBeDisabled();
        });
    });

    test('changes the state of a definition through release, unrelease and archive', async ({
        page,
        apiAs,
        uniqueName,
        checkpoint,
    }) => {
        test.slow();
        const api = apiAs('trainingDesigner');
        const title = uniqueName('state-lifecycle');
        const definition = await createEmptyDefinition(api, title);
        const overview = new DefinitionOverviewPage(page);
        await overview.goto();
        const row = await overview.findRow(title);
        const stateCell = row.locator('td[data-cy$="-state"]');
        const dialog = new ConfirmationDialog(page, STATE_DIALOG_TITLE);
        const expectStored = (state: string) =>
            expect
                .poll(
                    async () =>
                        (await fetchDefinition(api, definition.id)).state,
                    { message: `stored state ${state}` },
                )
                .toBe(state);

        await test.step('offers the release action and no unrelease or archive action on an unreleased definition', async () => {
            await expect
                .soft(overview.action(row, 'release'), 'action release')
                .toBeVisible();
            await expect
                .soft(overview.action(row, 'unrelease'), 'action unrelease')
                .toHaveCount(0);
            await expect
                .soft(overview.action(row, 'archive'), 'action archive')
                .toHaveCount(0);
        });

        await test.step('keeps the state when the release confirmation is cancelled', async () => {
            await overview.action(row, 'release').click();
            await dialog.cancel();
            await expect(stateCell).toContainText(/unreleased/i);
            expect((await fetchDefinition(api, definition.id)).state).toBe(
                'UNRELEASED',
            );
        });

        await test.step('releases an unreleased definition after confirmation', async () => {
            await overview.action(row, 'release').click();
            await expect
                .soft(dialog.message, 'release dialog message')
                .toContainText(/from "Unreleased" to "Released"/i);
            await checkpoint(page, 'release confirmation');
            await dialog.confirm();
            await waitForNotification(
                page,
                /Training definition state was changed to Released/i,
            );
            await expectStored('RELEASED');
            await expect(stateCell).toContainText(/released/i);
        });

        await test.step('keeps the state when the unrelease confirmation is cancelled', async () => {
            await overview.action(row, 'unrelease').click();
            await dialog.cancel();
            expect((await fetchDefinition(api, definition.id)).state).toBe(
                'RELEASED',
            );
        });

        await test.step('unreleases a released definition after confirmation', async () => {
            await overview.action(row, 'unrelease').click();
            await expect
                .soft(dialog.message, 'unrelease dialog message')
                .toContainText(/from "Released" to "Unreleased"/i);
            await dialog.confirm();
            await waitForNotification(
                page,
                /Training definition state was changed to Unrelease/i,
            );
            await expectStored('UNRELEASED');
            await expect(stateCell).toContainText(/unreleased/i);
        });

        await test.step('releases the definition again', async () => {
            await overview.action(row, 'release').click();
            await dialog.confirm();
            await expectStored('RELEASED');
            await expect(overview.action(row, 'archive')).toBeVisible();
        });

        await test.step('keeps the state when the archive confirmation is cancelled', async () => {
            await overview.action(row, 'archive').click();
            await dialog.cancel();
            expect((await fetchDefinition(api, definition.id)).state).toBe(
                'RELEASED',
            );
        });

        await test.step('archives a released definition after confirmation', async () => {
            await overview.action(row, 'archive').click();
            await expect
                .soft(dialog.message, 'archive dialog message')
                .toContainText(/from "Released" to "Archived"/i);
            await dialog.confirm();
            await waitForNotification(
                page,
                /Training definition state was changed to Archived/i,
            );
            await expectStored('ARCHIVED');
        });

        await test.step('offers no state action on an archived definition', async () => {
            await expect
                .soft(stateCell, 'state cell')
                .toContainText(/archived/i);
            for (const action of ['release', 'unrelease', 'archive'] as const) {
                await expect
                    .soft(overview.action(row, action), `action ${action}`)
                    .toHaveCount(0);
            }
        });
    });

    test('clones a definition through the clone dialog', async ({
        page,
        apiAs,
        uniqueName,
        checkpoint,
    }) => {
        test.slow();
        const api = apiAs('trainingDesigner');
        const title = uniqueName('clone-source');
        const cloneTitle = uniqueName('clone-result');
        const specialCloneTitle = `${SPECIAL_TEXT} ${uniqueName('clone-special-result')}`;
        const source = await importFullDefinition(api, title);
        const overview = new DefinitionOverviewPage(page);
        await overview.goto();
        const openCloneDialog = async () => {
            await overview
                .action(await overview.findRow(title), 'clone')
                .click();
            return openDialog(page, CLONE_DIALOG_TITLE);
        };
        const dialog = await openCloneDialog();
        const titleInput = dialog.getByRole('textbox', { name: 'Title' });
        const cloneButton = dialog.getByRole('button', {
            name: 'Clone',
            exact: true,
        });

        await test.step('opens the clone dialog prefilled with a title derived from the original', async () => {
            await expect.soft(dialog, 'clone dialog').toBeVisible();
            await expect
                .soft(titleInput, 'prefilled title')
                .toHaveValue(`Clone of ${title}`);
            await checkpoint(page, 'clone dialog open');
        });

        await test.step('refuses a whitespace-only title', async () => {
            await titleInput.fill('   ');
            await expect(titleInput, 'typed whitespace title').toHaveValue('   ');
            await titleInput.blur();
            await expect
                .soft(dialog.getByText('Title cannot be empty'), 'title error')
                .toBeVisible();
            await expect
                .soft(cloneButton, 'Clone with a whitespace title')
                .toBeDisabled();
        });

        await test.step('refuses an empty title after the clear button', async () => {
            await dialog.getByRole('button', { name: /clear/i }).click();
            await expect.soft(titleInput, 'cleared title').toHaveValue('');
            await expect
                .soft(cloneButton, 'Clone with an empty title')
                .toBeDisabled();
        });

        await test.step('closes the clone dialog with Cancel and creates nothing', async () => {
            await dialog
                .getByRole('button', { name: 'Cancel', exact: true })
                .click();
            await expect.soft(dialog, 'dialog after Cancel').toBeHidden();
            expect(
                await fetchDefinitionByTitle(api, `Clone of ${title}`),
                'definition cloned by a cancelled dialog',
            ).toBeUndefined();
        });

        await test.step('keeps special characters of the clone title as literal text', async () => {
            const reopened = await openCloneDialog();
            await reopened
                .getByRole('textbox', { name: 'Title' })
                .fill(specialCloneTitle);
            await reopened
                .getByRole('button', { name: 'Clone', exact: true })
                .click();
            await waitForNotification(page, 'Training definition was cloned');
            await expect(async () => {
                await overview.goto();
                await overview.filterBy(specialCloneTitle);
                await expect(overview.rowOf(specialCloneTitle)).toBeVisible({
                    timeout: 3_000,
                });
            }).toPass();
            await expect
                .soft(
                    overview.table.rows.first().locator('b'),
                    'no bold element',
                )
                .toHaveCount(0);
        });

        await test.step('clones the definition under the entered title', async () => {
            const reopened = await openCloneDialog();
            await reopened
                .getByRole('textbox', { name: 'Title' })
                .fill(cloneTitle);
            await reopened
                .getByRole('button', { name: 'Clone', exact: true })
                .click();
            expect(
                (
                    await waitForNotification(
                        page,
                        'Training definition was cloned',
                    )
                ).kind,
                'notification kind',
            ).toBe('success');
            await expect
                .poll(() => fetchDefinitionByTitle(api, cloneTitle))
                .toBeDefined();
            const copied = await fetchDefinitionDetailByTitle(api, cloneTitle);
            expect
                .soft(copied.levels, 'cloned levels')
                .toHaveLength(SHARED_TRAINING_LEVEL_ORDER.length);
            await overview.filterBy(cloneTitle);
            await expect
                .soft(overview.rowOf(cloneTitle), 'clone row')
                .toBeVisible();
        });

        await test.step('shows the clone with its own creation date', async () => {
            const clone = await requireDefinitionByTitle(api, cloneTitle);
            const sourceDetail = await api.training.get<{ created_at: string }>(
                `/training-definitions/${source.id}`,
            );
            const cloneDetail = await api.training.get<{ created_at: string }>(
                `/training-definitions/${clone.id}`,
            );
            expect(
                Date.parse(cloneDetail.created_at),
                'clone creation date',
            ).toBeGreaterThan(Date.parse(sourceDetail.created_at));
        });
    });

    test('uses the row actions of a definition and deletes it', async ({
        page,
        apiAs,
        uniqueName,
        checkpoint,
    }) => {
        test.slow();
        const api = apiAs('trainingDesigner');
        const title = uniqueName('row-actions');
        const definition = await importDefinitionBody(
            api,
            trainingImportWithoutAttachments(title),
        );
        const overview = new DefinitionOverviewPage(page);
        await overview.goto();
        const row = await overview.findRow(title);

        await test.step('downloads the definition as a JSON file named after its title', async () => {
            const download = await captureDownload(page, () =>
                overview.action(row, 'download').click(),
            );
            expect
                .soft(download.fileName, 'downloaded file name')
                .toBe(`${title}.json`);
            const content = JSON.parse(download.content) as {
                title: string;
                levels: unknown[];
            };
            expect.soft(content.title, 'downloaded title').toBe(title);
            expect
                .soft(content.levels, 'downloaded levels')
                .toHaveLength(SHARED_TRAINING_LEVEL_ORDER.length);
            const exported = await exportDefinition(api, definition.id);
            expect
                .soft(content.title, 'exported title')
                .toBe(exported['title']);
        });

        await test.step('opens the edit page with the Edit action', async () => {
            await overview.action(row, 'edit').click();
            await expect
                .soft(page, 'edit page')
                .toHaveURL(
                    new RegExp(`/linear-definition/${definition.id}/edit$`),
                );
        });

        await test.step('opens the preview page with the Preview action', async () => {
            await overview.goto();
            await overview
                .action(await overview.findRow(title), 'preview')
                .click();
            await expect
                .soft(page, 'preview page')
                .toHaveURL(
                    new RegExp(`/linear-definition/${definition.id}/preview$`),
                );
        });

        await test.step('opens the detail page from the title link', async () => {
            await overview.goto();
            await (
                await overview.findRow(title)
            )
                .getByRole('link', { name: title, exact: true })
                .click();
            await expect
                .soft(page, 'detail page')
                .toHaveURL(
                    new RegExp(`/linear-definition/${definition.id}/detail$`),
                );
        });

        await overview.goto();
        await overview.findRow(title);

        await test.step('asks for confirmation naming the definition and keeps it on Cancel', async () => {
            await overview.action(row, 'delete').click();
            const dialog = new ConfirmationDialog(
                page,
                'Delete Training Definition',
            );
            await expect
                .soft(dialog.message, 'dialog message')
                .toContainText(title);
            await checkpoint(page, 'delete confirmation');
            await dialog.cancel();
            await expect.soft(dialog.root, 'dialog after Cancel').toBeHidden();
            await expect
                .soft(overview.rowOf(title), 'row after Cancel')
                .toBeVisible();
            expect(
                await fetchDefinitionByTitle(api, title),
                'stored definition after Cancel',
            ).toBeDefined();
        });

        await test.step('removes the definition after confirmation', async () => {
            await overview.action(row, 'delete').click();
            await new ConfirmationDialog(
                page,
                'Delete Training Definition',
            ).confirm();
            expect(
                (
                    await waitForNotification(
                        page,
                        'Training definition was deleted',
                    )
                ).kind,
                'notification kind',
            ).toBe('success');
            await expect
                .soft(overview.rowOf(title), 'row after deletion')
                .toHaveCount(0);
            expect(
                await fetchDefinitionByTitle(api, title),
                'stored definition after deletion',
            ).toBeUndefined();
        });
    });
});
