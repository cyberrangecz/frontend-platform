import { expect, test } from '../../support/fixtures';
import { expectRedirectedAway } from '../../support/route-guard';
import { AGENDAS } from '../../support/pages/common/role-agendas';
import { DefinitionOverviewPage } from '../../support/pages/training-definition/definition-overview.page';
import {
    changeDefinitionState,
    createEmptyDefinition,
    exportDefinition,
    fetchDefinition,
    fetchDefinitionByTitle,
    fetchDefinitionDetailByTitle,
    importFullDefinition,
    requireDefinitionByTitle,
} from '../../support/pages/training-definition/training-definition-data';
import { FILTER_SETTLE_TIMEOUT_MILLISECONDS } from '../../support/time';
import { SHARED_TRAINING_LEVEL_ORDER, sharedTrainingImport } from '../../support/scenario/shared-training-loader';
import {
    captureDownload,
    ConfirmationDialog,
    dismissErrorDialog,
    errorDialog,
    FileUploadDialog,
    openDialog,
    pageTitle,
    waitForNotification,
} from '../../support/ui';

const CLONE_DIALOG_TITLE = /^Clone /;
const SORTABLE_COLUMNS = ['Title', 'Estimated Duration', 'Created At', 'Last Edit', 'Last Edit By', 'State'] as const;
// Columns whose values differ per row of the test data, so reversing the direction reverses the row order.
const DISTINCT_VALUE_COLUMNS: readonly string[] = ['Title', 'Created At', 'Last Edit'];

test.describe('linear-definition', () => {
    test.use({ account: 'trainingDesigner' });

    test.describe('table', () => {
        test('shows the page title and every column header', async ({ page, checkpoint }) => {
            const overview = new DefinitionOverviewPage(page);
            await overview.goto();
            await expect(pageTitle(page)).toHaveText(AGENDAS.trainingDefinition.pageTitle);
            for (const label of SORTABLE_COLUMNS) {
                await expect(overview.column(label)).toBeVisible();
            }
            await checkpoint(page, 'overview loaded');
        });

        test('lists the shared released definition with the actions a released definition offers', async ({
            page,
            shared,
        }) => {
            const overview = new DefinitionOverviewPage(page);
            await overview.goto();
            const row = await overview.findRow(shared.trainingDefinition.title);
            await expect(row).toBeVisible();
            await expect(row.locator('td[data-cy$="-state"]')).toContainText(/released/i);
            for (const action of ['edit', 'delete', 'clone', 'download', 'preview', 'unrelease', 'archive'] as const) {
                await expect(overview.action(row, action), action).toBeVisible();
            }
            await expect(overview.action(row, 'release')).toHaveCount(0);
        });

        test('offers the release action and no unrelease or archive action on an unreleased definition', async ({
            page,
            apiAs,
            uniqueName,
        }) => {
            const title = uniqueName('actions-unreleased');
            await createEmptyDefinition(apiAs('trainingDesigner'), title);
            const overview = new DefinitionOverviewPage(page);
            await overview.goto();
            const row = await overview.findRow(title);
            await expect(overview.action(row, 'release')).toBeVisible();
            await expect(overview.action(row, 'unrelease')).toHaveCount(0);
            await expect(overview.action(row, 'archive')).toHaveCount(0);
        });

        test('offers no state action on an archived definition', async ({ page, apiAs, uniqueName }) => {
            const api = apiAs('trainingDesigner');
            const title = uniqueName('actions-archived');
            const definition = await createEmptyDefinition(api, title);
            await changeDefinitionState(api, definition.id, 'RELEASED');
            await changeDefinitionState(api, definition.id, 'ARCHIVED');
            const overview = new DefinitionOverviewPage(page);
            await overview.goto();
            const row = await overview.findRow(title);
            await expect(row.locator('td[data-cy$="-state"]')).toContainText(/archived/i);
            for (const action of ['release', 'unrelease', 'archive'] as const) {
                await expect(overview.action(row, action), action).toHaveCount(0);
            }
        });

        test('shows the most recently edited definition first on the initial load', async ({
            page,
            apiAs,
            uniqueName,
        }) => {
            const api = apiAs('trainingDesigner');
            const common = uniqueName('order');
            const older = `${common}-older`;
            const newest = `${common}-newest`;
            await createEmptyDefinition(api, older);
            await createEmptyDefinition(api, newest);
            const overview = new DefinitionOverviewPage(page);
            await overview.goto();
            await expect(overview.column('Last Edit')).toHaveAttribute('aria-sort', 'descending');
            await overview.filterBy(common);
            await expect
                .poll(() => overview.rowTitles(), { timeout: FILTER_SETTLE_TIMEOUT_MILLISECONDS })
                .toEqual([newest, older]);
        });

        test('shows the empty state when the filter matches nothing', async ({ page, uniqueName, checkpoint }) => {
            const overview = new DefinitionOverviewPage(page);
            await overview.goto();
            await overview.filterBy(uniqueName('no-such-definition'));
            await expect(overview.table.rows).toHaveCount(0, { timeout: FILTER_SETTLE_TIMEOUT_MILLISECONDS });
            await expect(overview.table.emptyState).toBeVisible({ timeout: FILTER_SETTLE_TIMEOUT_MILLISECONDS });
            await checkpoint(page, 'empty filter result');
        });

        test('narrows the rows to the definitions whose title contains the filter text', async ({
            page,
            apiAs,
            uniqueName,
        }) => {
            const api = apiAs('trainingDesigner');
            const kept = uniqueName('filter-kept');
            await createEmptyDefinition(api, kept);
            await createEmptyDefinition(api, uniqueName('filter-other'));
            const overview = new DefinitionOverviewPage(page);
            await overview.goto();
            await overview.filterBy(kept);
            await expect(overview.table.rows).toHaveCount(1, { timeout: FILTER_SETTLE_TIMEOUT_MILLISECONDS });
            await expect(overview.rowOf(kept)).toBeVisible({ timeout: FILTER_SETTLE_TIMEOUT_MILLISECONDS });
        });

        test('filters regardless of letter case', async ({ page, apiAs, uniqueName }) => {
            const title = uniqueName('filter-case');
            await createEmptyDefinition(apiAs('trainingDesigner'), title);
            const overview = new DefinitionOverviewPage(page);
            await overview.goto();
            await overview.filterBy(title.toUpperCase());
            await expect(overview.rowOf(title)).toBeVisible({ timeout: FILTER_SETTLE_TIMEOUT_MILLISECONDS });
        });

        test('restores the full list when the filter is cleared', async ({ page, apiAs, uniqueName }) => {
            const api = apiAs('trainingDesigner');
            await createEmptyDefinition(api, uniqueName('clear-first'));
            await createEmptyDefinition(api, uniqueName('clear-second'));
            const overview = new DefinitionOverviewPage(page);
            await overview.goto();
            await overview.filterBy(uniqueName('clear-first'));
            await expect(overview.table.rows).toHaveCount(1, { timeout: FILTER_SETTLE_TIMEOUT_MILLISECONDS });
            await overview.filterBy('');
            await expect.poll(() => overview.table.rows.count()).toBeGreaterThan(1);
        });

        for (const column of SORTABLE_COLUMNS) {
            test(`sorts by ${column} in both directions`, async ({ page, apiAs, uniqueName }) => {
                const api = apiAs('trainingDesigner');
                const prefix = uniqueName(`sort-${column.toLowerCase().replace(/\s+/g, '-')}`);
                const first = await createEmptyDefinition(api, `${prefix}-b`);
                await createEmptyDefinition(api, `${prefix}-c`);
                await createEmptyDefinition(api, `${prefix}-a`);
                await changeDefinitionState(api, first.id, 'RELEASED');
                const overview = new DefinitionOverviewPage(page);
                await overview.goto();
                await overview.filterBy(prefix);
                await expect(overview.table.rows).toHaveCount(3);

                const header = overview.column(column);
                await overview.sortBy(column);
                await expect(header).toHaveAttribute('aria-sort', /^(ascending|descending)$/);
                const firstDirection = (await header.getAttribute('aria-sort')) as 'ascending' | 'descending';
                const firstOrder = await overview.rowTitles();

                await overview.sortBy(column);
                const secondDirection = firstDirection === 'ascending' ? 'descending' : 'ascending';
                await expect(header).toHaveAttribute('aria-sort', secondDirection);
                if (DISTINCT_VALUE_COLUMNS.includes(column)) {
                    await expect.poll(() => overview.rowTitles()).toEqual([...firstOrder].reverse());
                }
            });
        }

        test('orders the rows alphabetically when sorting by Title', async ({ page, apiAs, uniqueName }) => {
            const api = apiAs('trainingDesigner');
            const prefix = uniqueName('sort-title-order');
            for (const suffix of ['b', 'c', 'a']) {
                await createEmptyDefinition(api, `${prefix}-${suffix}`);
            }
            const overview = new DefinitionOverviewPage(page);
            await overview.goto();
            await overview.filterBy(prefix);
            await expect(overview.table.rows).toHaveCount(3);
            await overview.sortBy('Title');
            const header = overview.column('Title');
            const direction = await header.getAttribute('aria-sort');
            const ascending = [`${prefix}-a`, `${prefix}-b`, `${prefix}-c`];
            await expect
                .poll(() => overview.rowTitles())
                .toEqual(direction === 'ascending' ? ascending : [...ascending].reverse());
        });

        test.describe('paging', () => {
            test('lists the page sizes 10, 25 and 50 and no other', async ({ page }) => {
                const overview = new DefinitionOverviewPage(page);
                await overview.goto();
                await overview.table.pageSizeSelect.focus();
                await page.keyboard.press('Enter');
                for (const size of ['10', '25', '50']) {
                    await expect(page.getByRole('option', { name: size, exact: true })).toBeVisible();
                }
                await expect(page.getByRole('option', { name: '100', exact: true })).toHaveCount(0);
            });

            test('opens the page-size selector with a mouse click', async ({ page }) => {
                const overview = new DefinitionOverviewPage(page);
                await overview.goto();
                await overview.table.openPageSizeList();
                await expect(page.getByRole('option', { name: '10', exact: true })).toBeVisible();
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
                await expect(overview.table.rangeLabel).toHaveText(/1\s*[–-]\s*10 of 11/);
                await expect(overview.table.previousPageButton).toBeDisabled();
                await checkpoint(page, 'first page of 2');

                await overview.table.nextPageButton.click();
                await expect(overview.table.rows).toHaveCount(1);
                await expect(overview.table.rangeLabel).toHaveText(/11\s*[–-]\s*11 of 11/);
                await expect(overview.table.nextPageButton).toBeDisabled();

                await overview.table.firstPageButton.click();
                await expect(overview.table.rows).toHaveCount(10);
                await overview.table.lastPageButton.click();
                await expect(overview.table.rows).toHaveCount(1);
                await overview.table.previousPageButton.click();
                await expect(overview.table.rows).toHaveCount(10);
            });
        });
    });

    test.describe('control bar', () => {
        test('opens the create page with the Create control', async ({ page }) => {
            const overview = new DefinitionOverviewPage(page);
            await overview.goto();
            await overview.createButton.click();
            await expect(page).toHaveURL(/\/linear-definition\/create$/);
        });

        test('opens the MITRE ATT&CK Techniques page from the bottom control', async ({ page }) => {
            const overview = new DefinitionOverviewPage(page);
            await overview.goto();
            await overview.mitreButton.click();
            await expect(page).toHaveURL(/\/mitre-techniques$/);
        });
    });

    test.describe('upload', () => {
        test('opens the upload dialog and cancels it without creating a definition', async ({ page, checkpoint }) => {
            const overview = new DefinitionOverviewPage(page);
            await overview.goto();
            await overview.uploadButton.click();
            const dialog = new FileUploadDialog(page);
            await expect(dialog.title).toHaveText(/Upload Training definition/i);
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
                buffer: Buffer.from(JSON.stringify(sharedTrainingImport(title))),
            });
            await expect(dialog.chosenFiles).toHaveCount(1);
            await expect(dialog.confirmButton).toBeEnabled();
            await dialog.confirmButton.click();
            expect((await waitForNotification(page, 'Training definition was uploaded')).kind).toBe('success');
            await checkpoint(page, 'definition uploaded');
            await expect.poll(() => fetchDefinitionByTitle(apiAs('trainingDesigner'), title)).toBeDefined();
            await overview.filterBy(title);
            await expect(overview.rowOf(title)).toBeVisible();
        });

        test('reports an invalid JSON file with a meaningful message and creates nothing', async ({
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
            await dialog.confirmButton.click();
            await expect(errorDialog(page)).toBeVisible();
            await checkpoint(page, 'invalid file error');
            await expect(errorDialog(page)).not.toContainText(/Unknown error|Unexpected token|JSON\.parse/i);
            await dismissErrorDialog(page);
        });

        test('rejects a definition file without a title', async ({ page }) => {
            const overview = new DefinitionOverviewPage(page);
            await overview.goto();
            await overview.uploadButton.click();
            const dialog = new FileUploadDialog(page);
            await dialog.chooseFiles({
                name: 'untitled.json',
                mimeType: 'application/json',
                buffer: Buffer.from(JSON.stringify({ description: 'no title', levels: [] })),
            });
            await dialog.confirmButton.click();
            await expect(errorDialog(page)).toBeVisible();
            await dismissErrorDialog(page);
        });
    });

    test.describe('clone', () => {
        test('opens the clone dialog prefilled with a title derived from the original', async ({
            page,
            apiAs,
            uniqueName,
            checkpoint,
        }) => {
            const title = uniqueName('clone-open');
            await createEmptyDefinition(apiAs('trainingDesigner'), title);
            const overview = new DefinitionOverviewPage(page);
            await overview.goto();
            const row = await overview.findRow(title);
            await overview.action(row, 'clone').click();
            const dialog = openDialog(page, CLONE_DIALOG_TITLE);
            await expect(dialog).toBeVisible();
            await expect(dialog.getByRole('textbox', { name: 'Title' })).toHaveValue(`Clone of ${title}`);
            await checkpoint(page, 'clone dialog open');
        });

        test('clones the definition under the entered title', async ({ page, apiAs, uniqueName }) => {
            const api = apiAs('trainingDesigner');
            const title = uniqueName('clone-source');
            const cloneTitle = uniqueName('clone-result');
            await importFullDefinition(api, title);
            const overview = new DefinitionOverviewPage(page);
            await overview.goto();
            const row = await overview.findRow(title);
            await overview.action(row, 'clone').click();
            const dialog = openDialog(page, CLONE_DIALOG_TITLE);
            await dialog.getByRole('textbox', { name: 'Title' }).fill(cloneTitle);
            await dialog.getByRole('button', { name: 'Clone', exact: true }).click();
            expect((await waitForNotification(page, 'Training definition was cloned')).kind).toBe('success');
            await expect.poll(() => fetchDefinitionByTitle(api, cloneTitle)).toBeDefined();
            const copied = await fetchDefinitionDetailByTitle(api, cloneTitle);
            expect(copied.levels).toHaveLength(SHARED_TRAINING_LEVEL_ORDER.length);
            await overview.filterBy(cloneTitle);
            await expect(overview.rowOf(cloneTitle)).toBeVisible();
        });

        test('shows the clone with its own creation date', async ({ page, apiAs, uniqueName }) => {
            const api = apiAs('trainingDesigner');
            const title = uniqueName('clone-date-source');
            const cloneTitle = uniqueName('clone-date-result');
            const source = await createEmptyDefinition(api, title);
            const overview = new DefinitionOverviewPage(page);
            await overview.goto();
            const row = await overview.findRow(title);
            await overview.action(row, 'clone').click();
            const dialog = openDialog(page, CLONE_DIALOG_TITLE);
            await dialog.getByRole('textbox', { name: 'Title' }).fill(cloneTitle);
            await dialog.getByRole('button', { name: 'Clone', exact: true }).click();
            await waitForNotification(page, 'Training definition was cloned');
            await expect.poll(() => fetchDefinitionByTitle(api, cloneTitle)).toBeDefined();
            const clone = await requireDefinitionByTitle(api, cloneTitle);
            const sourceDetail = await api.training.get<{ created_at: string }>(`/training-definitions/${source.id}`);
            const cloneDetail = await api.training.get<{ created_at: string }>(`/training-definitions/${clone.id}`);
            expect(Date.parse(cloneDetail.created_at)).toBeGreaterThan(Date.parse(sourceDetail.created_at));
        });

        test('refuses a whitespace-only title', async ({ page, apiAs, uniqueName }) => {
            const title = uniqueName('clone-blank');
            await createEmptyDefinition(apiAs('trainingDesigner'), title);
            const overview = new DefinitionOverviewPage(page);
            await overview.goto();
            const row = await overview.findRow(title);
            await overview.action(row, 'clone').click();
            const dialog = openDialog(page, CLONE_DIALOG_TITLE);
            const cloneTitleInput = dialog.getByRole('textbox', { name: 'Title' });
            await cloneTitleInput.fill('   ');
            await cloneTitleInput.blur();
            await expect(dialog.getByText('Title cannot be empty')).toBeVisible();
            await expect(dialog.getByRole('button', { name: 'Clone', exact: true })).toBeDisabled();
        });

        test('refuses an empty title after the clear button', async ({ page, apiAs, uniqueName }) => {
            const title = uniqueName('clone-clear');
            await createEmptyDefinition(apiAs('trainingDesigner'), title);
            const overview = new DefinitionOverviewPage(page);
            await overview.goto();
            const row = await overview.findRow(title);
            await overview.action(row, 'clone').click();
            const dialog = openDialog(page, CLONE_DIALOG_TITLE);
            await dialog.getByRole('button', { name: /clear/i }).click();
            await expect(dialog.getByRole('textbox', { name: 'Title' })).toHaveValue('');
            await expect(dialog.getByRole('button', { name: 'Clone', exact: true })).toBeDisabled();
        });

        test('keeps special characters of the clone title as literal text', async ({ page, apiAs, uniqueName }) => {
            const api = apiAs('trainingDesigner');
            const title = uniqueName('clone-special');
            const cloneTitle = `Žluťoučký kůň <b>x</b> ${uniqueName('clone-special-result')}`;
            await createEmptyDefinition(api, title);
            const overview = new DefinitionOverviewPage(page);
            await overview.goto();
            const row = await overview.findRow(title);
            await overview.action(row, 'clone').click();
            const dialog = openDialog(page, CLONE_DIALOG_TITLE);
            await dialog.getByRole('textbox', { name: 'Title' }).fill(cloneTitle);
            await dialog.getByRole('button', { name: 'Clone', exact: true }).click();
            await waitForNotification(page, 'Training definition was cloned');
            await overview.filterBy(cloneTitle);
            await expect(overview.rowOf(cloneTitle)).toBeVisible();
            await expect(overview.table.rows.first().locator('b')).toHaveCount(0);
        });

        test('closes the clone dialog with Cancel and creates nothing', async ({ page, apiAs, uniqueName }) => {
            const api = apiAs('trainingDesigner');
            const title = uniqueName('clone-cancel');
            await createEmptyDefinition(api, title);
            const overview = new DefinitionOverviewPage(page);
            await overview.goto();
            const row = await overview.findRow(title);
            await overview.action(row, 'clone').click();
            const dialog = openDialog(page, CLONE_DIALOG_TITLE);
            await dialog.getByRole('button', { name: 'Cancel', exact: true }).click();
            await expect(dialog).toBeHidden();
            expect(await fetchDefinitionByTitle(api, `Clone of ${title}`)).toBeUndefined();
        });
    });

    test.describe('download', () => {
        test('downloads the definition as a JSON file named after its title', async ({
            page,
            apiAs,
            uniqueName,
        }) => {
            const api = apiAs('trainingDesigner');
            const title = uniqueName('download');
            const definition = await importFullDefinition(api, title);
            const overview = new DefinitionOverviewPage(page);
            await overview.goto();
            const row = await overview.findRow(title);
            const download = await captureDownload(page, () => overview.action(row, 'download').click());
            expect(download.fileName).toBe(`${title}.json`);
            const content = JSON.parse(download.content) as { title: string; levels: unknown[] };
            expect(content.title).toBe(title);
            expect(content.levels).toHaveLength(SHARED_TRAINING_LEVEL_ORDER.length);
            const exported = await exportDefinition(api, definition.id);
            expect(content.title).toBe(exported['title']);
        });
    });

    test.describe('delete', () => {
        test('asks for confirmation naming the definition and keeps it on Cancel', async ({
            page,
            apiAs,
            uniqueName,
            checkpoint,
        }) => {
            const api = apiAs('trainingDesigner');
            const title = uniqueName('delete-cancel');
            await createEmptyDefinition(api, title);
            const overview = new DefinitionOverviewPage(page);
            await overview.goto();
            const row = await overview.findRow(title);
            await overview.action(row, 'delete').click();
            const dialog = new ConfirmationDialog(page, 'Delete Training Definition');
            await expect(dialog.message).toContainText(title);
            await checkpoint(page, 'delete confirmation');
            await dialog.cancel();
            await expect(dialog.root).toBeHidden();
            await expect(overview.rowOf(title)).toBeVisible();
            expect(await fetchDefinitionByTitle(api, title)).toBeDefined();
        });

        test('removes the definition after confirmation', async ({ page, apiAs, uniqueName }) => {
            const api = apiAs('trainingDesigner');
            const title = uniqueName('delete-confirm');
            await createEmptyDefinition(api, title);
            const overview = new DefinitionOverviewPage(page);
            await overview.goto();
            const row = await overview.findRow(title);
            await overview.action(row, 'delete').click();
            await new ConfirmationDialog(page, 'Delete Training Definition').confirm();
            expect((await waitForNotification(page, 'Training definition was deleted')).kind).toBe('success');
            await expect(overview.rowOf(title)).toHaveCount(0);
            expect(await fetchDefinitionByTitle(api, title)).toBeUndefined();
        });
    });

    test.describe('state changes', () => {
        const STATE_DIALOG_TITLE = 'Training Definition State Change';

        test('releases an unreleased definition after confirmation', async ({
            page,
            apiAs,
            uniqueName,
            checkpoint,
        }) => {
            const api = apiAs('trainingDesigner');
            const title = uniqueName('state-release');
            const definition = await createEmptyDefinition(api, title);
            const overview = new DefinitionOverviewPage(page);
            await overview.goto();
            const row = await overview.findRow(title);
            await overview.action(row, 'release').click();
            const dialog = new ConfirmationDialog(page, STATE_DIALOG_TITLE);
            await expect(dialog.message).toContainText(/from "Unreleased" to "Released"/i);
            await checkpoint(page, 'release confirmation');
            await dialog.confirm();
            await waitForNotification(page, /Training definition state was changed to Released/i);
            await expect.poll(async () => (await fetchDefinition(api, definition.id)).state).toBe('RELEASED');
            await expect(row.locator('td[data-cy$="-state"]')).toContainText(/released/i);
        });

        test('keeps the state when the release confirmation is cancelled', async ({
            page,
            apiAs,
            uniqueName,
        }) => {
            const api = apiAs('trainingDesigner');
            const title = uniqueName('state-release-cancel');
            const definition = await createEmptyDefinition(api, title);
            const overview = new DefinitionOverviewPage(page);
            await overview.goto();
            const row = await overview.findRow(title);
            await overview.action(row, 'release').click();
            await new ConfirmationDialog(page, STATE_DIALOG_TITLE).cancel();
            await expect(row.locator('td[data-cy$="-state"]')).toContainText(/unreleased/i);
            expect((await fetchDefinition(api, definition.id)).state).toBe('UNRELEASED');
        });

        test('unreleases a released definition after confirmation', async ({ page, apiAs, uniqueName }) => {
            const api = apiAs('trainingDesigner');
            const title = uniqueName('state-unrelease');
            const definition = await createEmptyDefinition(api, title);
            await changeDefinitionState(api, definition.id, 'RELEASED');
            const overview = new DefinitionOverviewPage(page);
            await overview.goto();
            const row = await overview.findRow(title);
            await overview.action(row, 'unrelease').click();
            const dialog = new ConfirmationDialog(page, STATE_DIALOG_TITLE);
            await expect(dialog.message).toContainText(/from "Released" to "Unreleased"/i);
            await dialog.confirm();
            await waitForNotification(page, /Training definition state was changed to Unrelease/i);
            await expect.poll(async () => (await fetchDefinition(api, definition.id)).state).toBe('UNRELEASED');
        });

        test('keeps the state when the unrelease confirmation is cancelled', async ({
            page,
            apiAs,
            uniqueName,
        }) => {
            const api = apiAs('trainingDesigner');
            const title = uniqueName('state-unrelease-cancel');
            const definition = await createEmptyDefinition(api, title);
            await changeDefinitionState(api, definition.id, 'RELEASED');
            const overview = new DefinitionOverviewPage(page);
            await overview.goto();
            const row = await overview.findRow(title);
            await overview.action(row, 'unrelease').click();
            await new ConfirmationDialog(page, STATE_DIALOG_TITLE).cancel();
            expect((await fetchDefinition(api, definition.id)).state).toBe('RELEASED');
        });

        test('archives a released definition after confirmation', async ({ page, apiAs, uniqueName }) => {
            const api = apiAs('trainingDesigner');
            const title = uniqueName('state-archive');
            const definition = await createEmptyDefinition(api, title);
            await changeDefinitionState(api, definition.id, 'RELEASED');
            const overview = new DefinitionOverviewPage(page);
            await overview.goto();
            const row = await overview.findRow(title);
            await overview.action(row, 'archive').click();
            const dialog = new ConfirmationDialog(page, STATE_DIALOG_TITLE);
            await expect(dialog.message).toContainText(/from "Released" to "Archived"/i);
            await dialog.confirm();
            await waitForNotification(page, /Training definition state was changed to Archived/i);
            await expect.poll(async () => (await fetchDefinition(api, definition.id)).state).toBe('ARCHIVED');
        });

        test('keeps the state when the archive confirmation is cancelled', async ({
            page,
            apiAs,
            uniqueName,
        }) => {
            const api = apiAs('trainingDesigner');
            const title = uniqueName('state-archive-cancel');
            const definition = await createEmptyDefinition(api, title);
            await changeDefinitionState(api, definition.id, 'RELEASED');
            const overview = new DefinitionOverviewPage(page);
            await overview.goto();
            const row = await overview.findRow(title);
            await overview.action(row, 'archive').click();
            await new ConfirmationDialog(page, STATE_DIALOG_TITLE).cancel();
            expect((await fetchDefinition(api, definition.id)).state).toBe('RELEASED');
        });
    });

    test.describe('navigation from a row', () => {
        test('opens the edit page with the Edit action', async ({ page, apiAs, uniqueName }) => {
            const title = uniqueName('nav-edit');
            const definition = await createEmptyDefinition(apiAs('trainingDesigner'), title);
            const overview = new DefinitionOverviewPage(page);
            await overview.goto();
            const row = await overview.findRow(title);
            await overview.action(row, 'edit').click();
            await expect(page).toHaveURL(new RegExp(`/linear-definition/${definition.id}/edit$`));
        });

        test('opens the preview page with the Preview action', async ({ page, apiAs, uniqueName }) => {
            const title = uniqueName('nav-preview');
            const definition = await createEmptyDefinition(apiAs('trainingDesigner'), title);
            const overview = new DefinitionOverviewPage(page);
            await overview.goto();
            const row = await overview.findRow(title);
            await overview.action(row, 'preview').click();
            await expect(page).toHaveURL(new RegExp(`/linear-definition/${definition.id}/preview$`));
        });

        test('opens the detail page from the title link', async ({ page, apiAs, uniqueName }) => {
            const title = uniqueName('nav-detail');
            const definition = await createEmptyDefinition(apiAs('trainingDesigner'), title);
            const overview = new DefinitionOverviewPage(page);
            await overview.goto();
            const row = await overview.findRow(title);
            await row.getByRole('link', { name: title, exact: true }).click();
            await expect(page).toHaveURL(new RegExp(`/linear-definition/${definition.id}/detail$`));
        });
    });

    test.describe('access by role', () => {
        for (const role of ['trainingOrganizer', 'trainee'] as const) {
            test(`sends the ${role} account away from /linear-definition`, async ({ openAs }) => {
                await expectRedirectedAway(openAs, role, '/linear-definition');
            });
        }
    });
});
