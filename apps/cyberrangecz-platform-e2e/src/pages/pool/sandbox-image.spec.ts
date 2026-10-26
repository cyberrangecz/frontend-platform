import { expect, test } from '../../support/fixtures';
import { POOL_LINKS, ROLES_WITHOUT_POOL_ACCESS } from '../../support/pages/pool/pool-access';
import { expectRedirectedAway } from '../../support/route-guard';
import { SandboxImagePage } from '../../support/pages/pool/sandbox-image-page';
import { isOrdered, pageTitle } from '../../support/ui';

test.use({ account: 'sandboxOrganizer' });

test.describe('sandbox-image', () => {
    test('shows the image table with its columns and rows', async ({ page, checkpoint }) => {
        const images = new SandboxImagePage(page);
        await images.open();
        await expect(pageTitle(page)).toHaveText('Images Overview');
        for (const header of [/^name$/i, /^default user$/i, /^updated at$/i, /^GUI access$/i, /^size \(GB\)$/i]) {
            await expect(images.table.headerCell(header)).toBeVisible();
        }
        await expect(images.table.rows.first()).toBeVisible();
        await expect(images.onlyCustomCheckbox).not.toBeChecked();
        await expect(images.onlyGuiCheckbox).not.toBeChecked();
        await checkpoint(page, 'image table loaded');
    });

    test('shows yes or no as the GUI access of every image', async ({ page }) => {
        const images = new SandboxImagePage(page);
        await images.open();
        for (const text of await images.table.columnTexts('GUI access')) {
            expect(['Yes', 'No']).toContain(text);
        }
    });

    test.describe('sorting', () => {
        test('sorts by name ascending first and reverses on a second click', async ({ page }) => {
            const images = new SandboxImagePage(page);
            await images.open();
            await expect(images.table.headerCell(/^name$/i)).toHaveAttribute('aria-sort', 'ascending');
            await expect
                .poll(async () => isOrdered((await images.table.columnTexts('Name')).map((name) => name.toLowerCase()), 'ascending'))
                .toBe(true);
            await images.table.sortBy(/^name$/i);
            await expect(images.table.headerCell(/^name$/i)).toHaveAttribute('aria-sort', 'descending');
            await expect
                .poll(async () => isOrdered((await images.table.columnTexts('Name')).map((name) => name.toLowerCase()), 'descending'))
                .toBe(true);
        });

        test('sorts by the update time', async ({ page }) => {
            const images = new SandboxImagePage(page);
            await images.open();
            await images.table.sortBy(/^updated at$/i);
            await expect(images.table.headerCell(/^updated at$/i)).toHaveAttribute('aria-sort', /ascending|descending/);
            await expect(images.table.rows.first()).toBeVisible();
        });

        for (const header of [/^default user$/i, /^size \(GB\)$/i]) {
            test(`sorts by the ${String(header)} column`, async ({ page }) => {
                const images = new SandboxImagePage(page);
                await images.open();
                await images.table.sortBy(header);
                await expect(images.table.headerCell(header)).toHaveAttribute('aria-sort', /ascending|descending/);
                await expect(images.table.rows.first()).toBeVisible();
            });
        }

        test('offers no sorting on the GUI access column', async ({ page }) => {
            const images = new SandboxImagePage(page);
            await images.open();
            await images.table.sortBy(/^GUI access$/i);
            await expect(images.table.headerCell(/^GUI access$/i)).not.toHaveAttribute('aria-sort', /ascending|descending/);
        });
    });

    test.describe('name filter', () => {
        test('narrows the table to images whose name contains the text', async ({ page, checkpoint }) => {
            const images = new SandboxImagePage(page);
            await images.open();
            const name = (await images.table.columnTexts('Name'))[0]!;
            const fragment = name.slice(0, Math.min(name.length, 4));
            await images.filter.fill(fragment);
            await expect
                .poll(async () =>
                    (await images.table.columnTexts('Name')).every((text) =>
                        text.toLowerCase().includes(fragment.toLowerCase()),
                    ),
                )
                .toBe(true);
            await expect(images.table.rows.filter({ hasText: name }).first()).toBeVisible();
            await checkpoint(page, 'image filter applied');
        });

        test('matches the name regardless of letter case', async ({ page }) => {
            const images = new SandboxImagePage(page);
            await images.open();
            const name = (await images.table.columnTexts('Name'))[0]!;
            await images.filter.fill(name.toUpperCase() === name ? name.toLowerCase() : name.toUpperCase());
            await expect(images.table.rows.filter({ hasText: name }).first()).toBeVisible();
        });

        test('shows the empty state when no image matches', async ({ page }) => {
            const images = new SandboxImagePage(page);
            await images.open();
            await images.filter.fill('no-image-has-this-name-0123456789');
            await expect(images.table.rows).toHaveCount(0);
            await expect(images.table.emptyState).toContainText('No virtual machine images are available');
        });

        test('treats markup and special characters as literal text', async ({ page }) => {
            const images = new SandboxImagePage(page);
            await images.open();
            await images.filter.fill('<b>x</b> Žluťoučký kůň');
            await expect(images.table.rows).toHaveCount(0);
            await expect(images.table.emptyState).toBeVisible();
            await expect(page.locator('sentinel-table b')).toHaveCount(0);
        });

        test('restores the full table when the filter is cleared', async ({ page }) => {
            const images = new SandboxImagePage(page);
            await images.open();
            const initialCount = await images.table.rows.count();
            await images.filter.fill('no-image-has-this-name-0123456789');
            await expect(images.table.rows).toHaveCount(0);
            await images.filter.fill('');
            await expect(images.table.rows).toHaveCount(initialCount);
        });
    });

    test.describe('checkboxes', () => {
        test('Only GUI access leaves only images with GUI access', async ({ page }) => {
            const images = new SandboxImagePage(page);
            await images.open();
            await images.onlyGuiCheckbox.check();
            await expect
                .poll(async () =>
                    (await images.table.columnTexts('GUI access')).every((text) => text === 'Yes'),
                )
                .toBe(true);
            await images.onlyGuiCheckbox.uncheck();
            await expect(images.table.rows.first()).toBeVisible();
        });

        test('Only custom images lists the custom images the backend reports', async ({ page, apiAs }) => {
            const sandbox = apiAs('sandboxOrganizer').sandbox;
            const everyImage = await sandbox.getAll<unknown>('/images');
            const customImages = await sandbox.getAll<unknown>('/images', { onlyCustom: true });
            const images = new SandboxImagePage(page);
            await images.open();
            await expect.poll(() => images.totalImageCount()).toBe(everyImage.length);
            await images.onlyCustomCheckbox.check();
            await expect.poll(() => images.totalImageCount()).toBe(customImages.length);
            await images.onlyCustomCheckbox.uncheck();
            await expect.poll(() => images.totalImageCount()).toBe(everyImage.length);
        });

        test('both checkboxes combine', async ({ page, apiAs }) => {
            const sandbox = apiAs('sandboxOrganizer').sandbox;
            const customGuiImages = await sandbox.getAll<unknown>('/images', { onlyCustom: true, GUI: true });
            const images = new SandboxImagePage(page);
            await images.open();
            await images.onlyCustomCheckbox.check();
            await images.onlyGuiCheckbox.check();
            await expect(images.onlyCustomCheckbox).toBeChecked();
            await expect(images.onlyGuiCheckbox).toBeChecked();
            await expect.poll(() => images.totalImageCount()).toBe(customGuiImages.length);
            await expect
                .poll(async () =>
                    (await images.table.columnTexts('GUI access')).every((text) => text === 'Yes'),
                )
                .toBe(true);
        });
    });

    test.describe('paging', () => {
        test('shows a range label and moves forward and back when more than one page exists', async ({ page }) => {
            const images = new SandboxImagePage(page);
            await images.open();
            await expect(images.table.rangeLabel).toBeVisible();
            await images.table.selectPageSize(10);
            await expect(images.table.rows).toHaveCount(Math.min(10, await images.totalImageCount()));
            if (await images.table.nextPageButton.isEnabled()) {
                const firstName = (await images.table.columnTexts('Name'))[0];
                await images.table.nextPageButton.click();
                await expect.poll(async () => (await images.table.columnTexts('Name'))[0]).not.toBe(firstName);
                await images.table.previousPageButton.click();
                await expect.poll(async () => (await images.table.columnTexts('Name'))[0]).toBe(firstName);
            }
        });
    });

    test.describe('row details', () => {
        test('expands a row to show the image details and collapses it again', async ({ page, checkpoint }) => {
            const images = new SandboxImagePage(page);
            await images.open();
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
                await expect(details).toContainText(label);
            }
            await checkpoint(page, 'image detail expanded');
            await images.table.expandButton(row).click();
            await expect(images.table.expandedDetails).toHaveCount(0);
        });
    });

    for (const role of ROLES_WITHOUT_POOL_ACCESS) {
        test(`sends the ${role} account away from /sandbox-image`, async ({ openAs }) => {
            await expectRedirectedAway(openAs, role, '/sandbox-image', { absentLinks: POOL_LINKS });
        });
    }
});
