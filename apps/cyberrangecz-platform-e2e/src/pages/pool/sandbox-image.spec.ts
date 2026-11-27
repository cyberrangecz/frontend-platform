import { expect, test } from '../../support/fixtures';
import { SandboxImagePage } from '../../support/pages/pool/sandbox-image-page';
import { isOrdered, pageTitle } from '../../support/ui';

test.use({ account: 'sandboxOrganizer' });

const soft = expect.configure({ soft: true });

const UNMATCHED_FILTER = 'no-image-has-this-name-0123456789';

test.describe('sandbox-image', () => {
    test('checks the image table and its sorting', async ({ page, checkpoint }) => {
        test.setTimeout(180_000);
        const images = new SandboxImagePage(page);
        await images.open();

        await test.step('shows the image table with its columns and rows', async () => {
            await soft(pageTitle(page), 'page title').toHaveText('Images Overview');
            for (const header of [/^name$/i, /^default user$/i, /^updated at$/i, /^GUI access$/i, /^size \(GB\)$/i]) {
                await soft(images.table.headerCell(header), `column ${String(header)} visible`).toBeVisible();
            }
            await soft(images.table.rows.first(), 'a row is shown').toBeVisible();
            await soft(images.onlyCustomCheckbox, 'Only custom images off').not.toBeChecked();
            await soft(images.onlyGuiCheckbox, 'Only GUI access off').not.toBeChecked();
            await checkpoint(page, 'image table loaded');
        });

        await test.step('shows yes or no as the GUI access of every image', async () => {
            for (const text of await images.table.columnTexts('GUI access')) {
                expect.soft(['Yes', 'No'], 'GUI access value').toContain(text);
            }
        });

        await test.step('sorts by name ascending first and reverses on a second click', async () => {
            const names = async () => (await images.table.columnTexts('Name')).map((name) => name.toLowerCase());
            await soft(images.table.headerCell(/^name$/i), 'name sorted first').toHaveAttribute('aria-sort', 'ascending');
            await soft.poll(async () => isOrdered(await names(), 'ascending'), { message: 'names ascending' }).toBe(true);
            await images.table.sortBy(/^name$/i);
            await soft(images.table.headerCell(/^name$/i), 'name sorted again').toHaveAttribute('aria-sort', 'descending');
            await soft.poll(async () => isOrdered(await names(), 'descending'), { message: 'names descending' }).toBe(true);
        });

        await test.step('sorts by the update time', async () => {
            await images.table.sortBy(/^updated at$/i);
            await soft(images.table.headerCell(/^updated at$/i), 'update time sorted').toHaveAttribute(
                'aria-sort',
                /ascending|descending/,
            );
            await soft(images.table.rows.first(), 'a row is shown').toBeVisible();
        });

        for (const header of [/^default user$/i, /^size \(GB\)$/i]) {
            await test.step(`sorts by the ${String(header)} column`, async () => {
                await images.table.sortBy(header);
                await soft(images.table.headerCell(header), 'column sorted').toHaveAttribute(
                    'aria-sort',
                    /ascending|descending/,
                );
                await soft(images.table.rows.first(), 'a row is shown').toBeVisible();
            });
        }

        await test.step('offers no sorting on the GUI access column', async () => {
            await images.table.sortBy(/^GUI access$/i);
            await soft(images.table.headerCell(/^GUI access$/i), 'GUI access not sorted').not.toHaveAttribute(
                'aria-sort',
                /ascending|descending/,
            );
        });
    });

    test('checks the name filter of the image table', async ({ page, checkpoint }) => {
        test.setTimeout(180_000);
        const images = new SandboxImagePage(page);
        await images.open();
        const name = (await images.table.columnTexts('Name'))[0]!;
        const clearFilter = async (): Promise<void> => {
            await images.filter.fill('');
            await soft(images.table.rows.first(), 'full table back').toBeVisible();
        };

        await test.step('narrows the table to images whose name contains the text', async () => {
            const fragment = name.slice(0, Math.min(name.length, 4));
            await images.filter.fill(fragment);
            await soft
                .poll(
                    async () =>
                        (await images.table.columnTexts('Name')).every((text) =>
                            text.toLowerCase().includes(fragment.toLowerCase()),
                        ),
                    { message: 'every name contains the text' },
                )
                .toBe(true);
            await soft(images.table.rows.filter({ hasText: name }).first(), 'first image kept').toBeVisible();
            await checkpoint(page, 'image filter applied');
            await clearFilter();
        });

        await test.step('matches the name regardless of letter case', async () => {
            await images.filter.fill(name.toUpperCase() === name ? name.toLowerCase() : name.toUpperCase());
            await soft(images.table.rows.filter({ hasText: name }).first(), 'image matched').toBeVisible();
            await clearFilter();
        });

        await test.step('shows the empty state when no image matches', async () => {
            await images.filter.fill(UNMATCHED_FILTER);
            await soft(images.table.rows, 'no rows').toHaveCount(0);
            await soft(images.table.emptyState, 'empty state').toContainText('No virtual machine images are available');
            await clearFilter();
        });

        await test.step('treats markup and special characters as literal text', async () => {
            await images.filter.fill('<b>x</b> Žluťoučký kůň');
            await soft(images.table.rows, 'no rows').toHaveCount(0);
            await soft(images.table.emptyState, 'empty state').toBeVisible();
            await soft(page.locator('sentinel-table b'), 'no markup rendered').toHaveCount(0);
            await clearFilter();
        });

        await test.step('restores the full table when the filter is cleared', async () => {
            const initialCount = await images.table.rows.count();
            await images.filter.fill(UNMATCHED_FILTER);
            await soft(images.table.rows, 'no rows').toHaveCount(0);
            await images.filter.fill('');
            await soft(images.table.rows, 'full table back').toHaveCount(initialCount);
        });
    });

    test('checks the image checkboxes, paging and row details', async ({ page, apiAs, checkpoint }) => {
        test.setTimeout(180_000);
        const sandbox = apiAs('sandboxOrganizer').sandbox;
        const images = new SandboxImagePage(page);
        await images.open();
        const allShownSupportGui = async (): Promise<boolean> =>
            (await images.table.columnTexts('GUI access')).every((text) => text === 'Yes');

        await test.step('Only GUI access leaves only images with GUI access', async () => {
            await images.onlyGuiCheckbox.check();
            await soft.poll(allShownSupportGui, { message: 'only GUI images shown' }).toBe(true);
            await images.onlyGuiCheckbox.uncheck();
            await soft(images.table.rows.first(), 'a row is shown').toBeVisible();
        });

        await test.step('Only custom images lists the custom images the backend reports', async () => {
            const everyImage = await sandbox.getAll<unknown>('/images');
            const customImages = await sandbox.getAll<unknown>('/images', { onlyCustom: true });
            await soft.poll(() => images.totalImageCount(), { message: 'every image listed' }).toBe(everyImage.length);
            await images.onlyCustomCheckbox.check();
            await soft.poll(() => images.totalImageCount(), { message: 'custom images listed' }).toBe(customImages.length);
            await images.onlyCustomCheckbox.uncheck();
            await soft.poll(() => images.totalImageCount(), { message: 'every image listed again' }).toBe(everyImage.length);
        });

        await test.step('both checkboxes combine', async () => {
            const customGuiImages = await sandbox.getAll<unknown>('/images', { onlyCustom: true, GUI: true });
            await images.onlyCustomCheckbox.check();
            await images.onlyGuiCheckbox.check();
            await soft(images.onlyCustomCheckbox, 'Only custom images on').toBeChecked();
            await soft(images.onlyGuiCheckbox, 'Only GUI access on').toBeChecked();
            await soft.poll(() => images.totalImageCount(), { message: 'custom GUI images listed' }).toBe(customGuiImages.length);
            await soft.poll(allShownSupportGui, { message: 'only GUI images shown' }).toBe(true);
            await images.onlyCustomCheckbox.uncheck();
            await images.onlyGuiCheckbox.uncheck();
            await soft(images.table.rows.first(), 'a row is shown').toBeVisible();
        });

        await test.step('expands a row to show the image details and collapses it again', async () => {
            const row = images.table.rows.first();
            await images.table.expandButton(row).click();
            const details = images.table.expandedDetails.first();
            for (const label of [
                'OS Distro:',
                'OS Type:',
                'Disk Format:',
                'Container Format:',
                'Min Disk:',
                'Min Ram:',
                'Visibility:',
                'Created At:',
                'Tags:',
                'Version:',
            ]) {
                await soft(details, `detail ${label}`).toContainText(label);
            }
            await checkpoint(page, 'image detail expanded');
            await images.table.expandButton(row).click();
            await soft(images.table.expandedDetails, 'details collapsed').toHaveCount(0);
        });

        await test.step('shows a range label and moves forward and back when more than one page exists', async () => {
            await soft(images.table.rangeLabel, 'range label').toBeVisible();
            await images.table.selectPageSize(10);
            await soft(images.table.rows, 'rows of one page').toHaveCount(Math.min(10, await images.totalImageCount()));
            if (await images.table.nextPageButton.isEnabled()) {
                const firstName = (await images.table.columnTexts('Name'))[0];
                await images.table.nextPageButton.click();
                await soft
                    .poll(async () => (await images.table.columnTexts('Name'))[0], { message: 'next page shown' })
                    .not.toBe(firstName);
                await images.table.previousPageButton.click();
                await soft
                    .poll(async () => (await images.table.columnTexts('Name'))[0], { message: 'first page shown again' })
                    .toBe(firstName);
            }
        });
    });
});
