import { ApiError } from '../../support/api/api-client';
import { expect, test } from '../../support/fixtures';
import { AllocateDialog } from '../../support/pages/pool/allocate-dialog';
import {
    createPool,
    ensurePoolCount,
    listAllocationUnits,
    readPool,
} from '../../support/pages/pool/pool-data';
import { PoolOverviewPage } from '../../support/pages/pool/pool-overview-page';
import { describeQuotaCharts, type ResourcesPayload } from '../../support/pages/pool/quota-description';
import {
    ConfirmationDialog,
    isOrdered,
    errorDialog,
    pageTitle,
    toolbarUserName,
    waitForNotification,
} from '../../support/ui';

test.use({ account: 'sandboxOrganizer' });

const soft = expect.configure({ soft: true });

const UTILIZATION_HEADER = 'Instances / VCPUs / RAM / ports / network utilization';
/** The state cell of a locked pool: the lock icon ligature followed by the state text. */
const LOCKED_STATE_TEXT = /^\s*lock\s+locked\s*$/;
const SPECIAL_COMMENT = 'Žluťoučký kůň <b>x</b>';

test.describe('pool', () => {
    test('checks the pool overview, its quotas, row controls and links', async ({
        page,
        apiAs,
        shared,
        uniqueName,
        checkpoint,
    }) => {
        test.setTimeout(180_000);
        const pool = await createPool(apiAs('sandboxOrganizer').sandbox, shared, {
            comment: uniqueName('overview'),
            maxSize: 3,
            sendEmails: true,
        });
        const overview = new PoolOverviewPage(page);
        await overview.open();
        const row = await test.step(
            'shows the pool overview with its columns, quotas and the pool of the account',
            async () => {
                await soft(pageTitle(page), 'page title').toHaveText('Pool Overview');
                for (const header of [
                    'Title',
                    'Created by',
                    'Sandbox definition (revision)',
                    'Notes and comments',
                    'State',
                    'Size',
                    UTILIZATION_HEADER,
                    'Actions',
                ]) {
                    await soft(overview.table.headerCell(header), `column ${header} visible`).toBeVisible();
                }
                const shownRow = await overview.showPool(pool.id);
                await soft(await overview.table.cell(shownRow, 'Created by'), 'creator is the signed-in user').toHaveText(
                    (await toolbarUserName(page).innerText()).trim(),
                );
                await soft(await overview.table.cell(shownRow, 'Size'), 'size of the pool').toHaveText('0/3');
                await soft(await overview.table.cell(shownRow, 'State'), 'pool state').toContainText('unlocked');
                await soft(
                    await overview.table.cell(shownRow, UTILIZATION_HEADER),
                    'utilization of an empty pool',
                ).toHaveText('0.0% / 0.0% / 0.0% / 0.0% / 0.0%');
                await soft(overview.commentOf(shownRow).input, 'comment of the pool').toHaveValue(pool.comment ?? '');
                await checkpoint(page, 'pool overview loaded');
                return shownRow;
            },
        );

        await test.step('shows the sandbox definition and revision of a pool', async () => {
            await soft(
                await overview.table.cell(row, 'Sandbox definition (revision)'),
                'definition and revision of the pool',
            ).toHaveText(`${pool.definition.name} (${pool.definition.rev})`);
        });

        await test.step('shows the resource quota panel with a project name and five quota charts', async () => {
            await soft(overview.quotas.getByRole('heading', { level: 2 }), 'quota project name').not.toHaveText('...');
            await soft(overview.quotas.locator('crczp-quota-pie-chart'), 'five quota charts').toHaveCount(5);
            const resources = await apiAs('sandboxOrganizer').sandbox.get<ResourcesPayload>('/info');
            await checkpoint(page, 'quotas shown', describeQuotaCharts(resources));
        });

        await test.step('offers the row actions edit, allocate all, allocate one, delete, lock and SSH config', async () => {
            for (const icon of ['create', 'subscriptions', 'exposure_plus_1', 'delete', 'lock', 'vpn_key']) {
                await soft(overview.table.rowAction(row, icon), `row action ${icon} visible`).toBeVisible();
            }
        });

        await test.step('enables the allocate row actions on a pool with free capacity', async () => {
            await soft(overview.table.rowAction(row, 'subscriptions'), 'allocate all enabled').toBeEnabled();
            await soft(overview.table.rowAction(row, 'exposure_plus_1'), 'allocate one enabled').toBeEnabled();
        });

        await test.step('expands a row to show the build notification setting and resource utilization', async () => {
            await overview.table.expandButton(row).click();
            const details = overview.table.expandedDetails;
            await soft(details, 'one expanded detail').toHaveCount(1);
            await soft(details, 'build notification setting').toContainText('Build progression notifications: true');
            await soft(details, 'utilization heading').toContainText('Resources utilization:');
            await soft(details, 'no utilization data').toContainText('No data to display');
            await checkpoint(page, 'row expanded');
            await overview.table.expandButton(row).click();
            await soft(details, 'detail collapsed').toHaveCount(0);
        });

        await test.step('opens the pool detail from the title link', async () => {
            await overview.open();
            const titleRow = await overview.showPool(pool.id);
            await titleRow.getByRole('link', { name: `Pool ${pool.id}`, exact: true }).click();
            await expect(page).toHaveURL(new RegExp(`/pool/${pool.id}$`));
        });

        await test.step('opens the pool creation form from the Create control', async () => {
            await overview.open();
            await overview.createButton.click();
            await expect(page).toHaveURL(/\/pool\/create$/);
        });

        await test.step('opens the pool edit form from the edit row action', async () => {
            await overview.open();
            const editRow = await overview.showPool(pool.id);
            await overview.table.rowAction(editRow, 'create').click();
            await expect(page).toHaveURL(new RegExp(`/pool/${pool.id}/edit$`));
        });
    });

    test('checks sorting and paging of the pool table', async ({ page, apiAs, shared, uniqueName }) => {
        test.setTimeout(180_000);
        await ensurePoolCount(apiAs('sandboxOrganizer').sandbox, shared, 12, uniqueName('paging'));
        const overview = new PoolOverviewPage(page);
        await overview.open();

        await test.step('starts sorted by title descending', async () => {
            await soft(overview.table.headerCell('Title'), 'title column sorted').toHaveAttribute(
                'aria-sort',
                'descending',
            );
            await soft
                .poll(async () => isOrdered(await overview.shownPoolIds(), 'descending'), { message: 'ids descending' })
                .toBe(true);
        });

        await test.step('sorts by title in both directions', async () => {
            await overview.table.sortTo('Title', 'ascending');
            await soft
                .poll(async () => isOrdered(await overview.shownPoolIds(), 'ascending'), { message: 'ids ascending' })
                .toBe(true);
            await overview.table.sortTo('Title', 'descending');
            await soft
                .poll(async () => isOrdered(await overview.shownPoolIds(), 'descending'), { message: 'ids descending' })
                .toBe(true);
        });

        await test.step('sorts by size in both directions', async () => {
            await overview.table.sortTo('Size', 'ascending');
            await soft
                .poll(async () => isOrdered(await maximumSizes(overview), 'ascending'), { message: 'sizes ascending' })
                .toBe(true);
            await overview.table.sortTo('Size', 'descending');
            await soft
                .poll(async () => isOrdered(await maximumSizes(overview), 'descending'), { message: 'sizes descending' })
                .toBe(true);
        });

        for (const header of ['Created by', 'Sandbox definition (revision)', 'Notes and comments']) {
            await test.step(`reverses the sort direction of the ${header} column`, async () => {
                const shownTexts = async () =>
                    (await overview.table.columnTexts(header)).map((text) => text.trim().toLowerCase());
                await overview.table.sortTo(header, 'ascending');
                await soft(overview.table.rows.first(), 'a row is shown').toBeVisible();
                await soft
                    .poll(async () => isOrdered(await shownTexts(), 'ascending'), { message: `${header} ascending` })
                    .toBe(true);
                await overview.table.sortTo(header, 'descending');
                await soft
                    .poll(async () => isOrdered(await shownTexts(), 'descending'), { message: `${header} descending` })
                    .toBe(true);
            });
        }

        await test.step('offers no sorting on the state and utilization columns', async () => {
            for (const header of ['State', UTILIZATION_HEADER]) {
                await soft(overview.table.headerCell(header).getByRole('button'), `${header} has no sort button`).toHaveCount(0);
            }
        });

        await test.step('changes the page size and moves between pages', async () => {
            await overview.table.openPageSizeList();
            const sizes = (await page.getByRole('option').allInnerTexts()).map(Number).sort((first, second) => first - second);
            const smallest = sizes[0] ?? 5;
            const firstPageLabel = new RegExp(`^\\s*1 – ${smallest} of \\d+\\s*$`);
            await page.getByRole('option', { name: String(smallest), exact: true }).click();
            await soft(overview.table.rows, 'rows of the smallest page size').toHaveCount(smallest);
            await soft(overview.table.rangeLabel, 'first page range').toHaveText(firstPageLabel);

            await overview.table.nextPageButton.click();
            await soft
                .poll(
                    async () => {
                        const label = await overview.table.rangeLabel.innerText();
                        const [, start, end, total] = /^\s*(\d+) – (\d+) of (\d+)\s*$/.exec(label) ?? [];
                        return start === undefined
                            ? label
                            : Number(start) === smallest + 1 && Number(end) === Math.min(smallest * 2, Number(total));
                    },
                    { message: 'second page range' },
                )
                .toBe(true);
            await overview.table.previousPageButton.click();
            await soft(overview.table.rangeLabel, 'back on the first page').toHaveText(firstPageLabel);
            await overview.table.lastPageButton.click();
            await soft(overview.table.nextPageButton, 'no next page on the last page').toBeDisabled();
            await overview.table.firstPageButton.click();
            await soft(overview.table.previousPageButton, 'no previous page on the first page').toBeDisabled();
            await soft(overview.table.rangeLabel, 'first page range again').toHaveText(firstPageLabel);
        });
    });

    test('edits the comment of a pool inline', async ({ page, apiAs, shared, uniqueName }) => {
        test.setTimeout(180_000);
        const sandbox = apiAs('sandboxOrganizer').sandbox;
        const original = uniqueName('comment-original');
        const pool = await createPool(sandbox, shared, { comment: original });
        const overview = new PoolOverviewPage(page);
        await overview.open();
        const row = await overview.showPool(pool.id);
        const { input, editButton } = overview.commentOf(row);
        const heading = page.getByRole('heading', { name: 'Pool Overview', level: 1 });
        const expectCommentSaved = async (comment: string): Promise<void> => {
            await expect
                .poll(async () => (await readPool(sandbox, pool.id)).comment ?? '', { message: 'stored comment' })
                .toBe(comment);
            await waitForNotification(page, `Pool comment for ${pool.id} was updated`);
            await expect(input).toHaveValue(comment);
        };

        await test.step('reverts an edit abandoned by leaving the field', async () => {
            await editButton.click();
            await input.fill('abandoned edit');
            await heading.click();
            await expect(input).toHaveValue(original);
            await expect(input).not.toBeEditable();
            expect((await readPool(sandbox, pool.id)).comment).toBe(original);
        });

        await test.step('rejects a comment longer than 256 characters', async () => {
            await overview.typeTouchedComment(row, 'x'.repeat(257));
            await expect(row.getByText('At most 256 characters')).toBeVisible();
            await expect(editButton).toBeDisabled();
            await heading.click();
            await expect(input).toHaveValue(original);
        });

        await test.step('saves an edited comment', async () => {
            const newComment = uniqueName('comment-new');
            await expect(input).not.toBeEditable();
            await editButton.click();
            await expect(input).toBeEditable();
            await input.fill(newComment);
            await editButton.click();
            const notification = await waitForNotification(page, `Pool comment for ${pool.id} was updated`);
            expect(notification.kind).toBe('success');
            await expect(input).toHaveValue(newComment);
            expect((await readPool(sandbox, pool.id)).comment).toBe(newComment);
        });

        await test.step('stores special characters as literal text', async () => {
            await editButton.click();
            await input.fill(SPECIAL_COMMENT);
            await editButton.click();
            await expectCommentSaved(SPECIAL_COMMENT);
            await expect(row.locator('b')).toHaveCount(0);
        });

        await test.step('accepts a comment of exactly 256 characters', async () => {
            await editButton.click();
            await input.fill('y'.repeat(256));
            await expect(editButton).toBeEnabled();
            await editButton.click();
            await expectCommentSaved('y'.repeat(256));
        });

        await test.step('accepts an emptied comment', async () => {
            await editButton.click();
            await input.fill('');
            await editButton.click();
            await expectCommentSaved('');
        });
    });

    test('locks, unlocks and deletes a pool', async ({ page, apiAs, shared, uniqueName, checkpoint }) => {
        test.setTimeout(180_000);
        const sandbox = apiAs('sandboxOrganizer').sandbox;
        const pool = await createPool(sandbox, shared, { comment: uniqueName('lifecycle') });
        const overview = new PoolOverviewPage(page);
        await overview.open();
        const row = await overview.showPool(pool.id);

        await test.step('locks a pool at once without confirmation and shows it as locked', async () => {
            await overview.table.rowAction(row, 'lock').click();
            expect((await waitForNotification(page, `Pool ${pool.id} was locked`)).kind).toBe('success');
            await expect(new ConfirmationDialog(page).root).toHaveCount(0);
            await expect(await overview.table.cell(row, 'State')).toHaveText(LOCKED_STATE_TEXT);
            await expect(overview.table.rowAction(row, 'lock_open')).toBeVisible();
            expect((await readPool(sandbox, pool.id)).lock_id).not.toBeNull();
        });

        await test.step('disables deleting a locked pool', async () => {
            await expect(overview.table.rowAction(row, 'delete')).toBeDisabled();
        });

        await test.step('keeps a pool locked when the unlock dialog is cancelled', async () => {
            await overview.table.rowAction(row, 'lock_open').click();
            const dialog = new ConfirmationDialog(page, 'Unlock Pool');
            await expect(dialog.message).toHaveText(`Do you want to unlock pool "${pool.id}"?`);
            await checkpoint(page, 'unlock dialog open');
            await dialog.cancel();
            await expect(dialog.root).toBeHidden();
            await expect(await overview.table.cell(row, 'State')).toHaveText(LOCKED_STATE_TEXT);
            expect((await readPool(sandbox, pool.id)).lock_id).not.toBeNull();
        });

        await test.step('unlocks a pool after confirmation', async () => {
            await overview.table.rowAction(row, 'lock_open').click();
            await new ConfirmationDialog(page, 'Unlock Pool').confirm();
            expect((await waitForNotification(page, `Pool ${pool.id} was unlocked`)).kind).toBe('success');
            await expect(await overview.table.cell(row, 'State')).toContainText('unlocked');
            expect((await readPool(sandbox, pool.id)).lock_id).toBeNull();
        });

        await test.step('keeps the pool when the delete dialog is cancelled', async () => {
            await overview.table.rowAction(row, 'delete').click();
            const dialog = new ConfirmationDialog(page, 'Delete Pool');
            await expect(dialog.message).toHaveText(`Do you want to delete pool "${pool.id}"?`);
            await expect(dialog.confirmButton).toHaveText('Delete');
            await checkpoint(page, 'delete dialog open');
            await dialog.cancel();
            await expect(dialog.root).toBeHidden();
            await expect(row).toBeVisible();
            expect((await readPool(sandbox, pool.id)).id).toBe(pool.id);
        });

        await test.step('deletes a pool without sandboxes after confirmation', async () => {
            await overview.table.rowAction(row, 'delete').click();
            await new ConfirmationDialog(page, 'Delete Pool').confirm();
            expect((await waitForNotification(page, `Pool ${pool.id} was deleted`)).kind).toBe('success');
            await expect(overview.rowOf(pool.id)).toHaveCount(0);
            await expect(errorDialog(page)).toBeHidden();
            const rejection = await readPool(sandbox, pool.id).then(
                () => undefined,
                (error: unknown) => error,
            );
            expect(rejection).toBeInstanceOf(ApiError);
            expect((rejection as ApiError).status).toBe(404);
        });
    });

    test('checks the allocation dialog of a pool', async ({ page, apiAs, shared, uniqueName, checkpoint }) => {
        test.setTimeout(180_000);
        const poolSize = 5;
        const sandbox = apiAs('sandboxOrganizer').sandbox;
        const pool = await createPool(sandbox, shared, { comment: uniqueName('allocate'), maxSize: poolSize });
        const overview = new PoolOverviewPage(page);
        await overview.open();
        const row = await overview.showPool(pool.id);
        const openDialog = (): Promise<AllocateDialog> =>
            AllocateDialog.openFrom(page, overview.table.rowAction(row, 'subscriptions'));
        const inDialog = async (check: (dialog: AllocateDialog) => Promise<void>): Promise<void> => {
            const dialog = await openDialog();
            await check(dialog);
            await dialog.cancelButton.click();
            await soft(dialog.root, 'dialog closed again').toBeHidden();
        };

        await test.step('offers the remaining sandboxes of the pool as the initial size', () =>
            inDialog(async (dialog) => {
                await soft(dialog.sizeInput, 'initial size').toHaveValue(String(poolSize));
                await soft(dialog.slider, 'initial slider').toHaveValue(String(poolSize));
                await soft(dialog.allocateButton, 'Allocate enabled').toBeEnabled();
                await checkpoint(page, 'allocate dialog open');
            }));

        await test.step('steps the size down and up with the minus and plus icons within bounds', () =>
            inDialog(async (dialog) => {
                await dialog.incrementIcon.click();
                await soft(dialog.sizeInput, 'plus stops at the maximum').toHaveValue(String(poolSize));
                await dialog.decrementIcon.click();
                await soft(dialog.sizeInput, 'minus lowers by one').toHaveValue(String(poolSize - 1));
                for (let step = 0; step < poolSize + 2; step++) {
                    await dialog.decrementIcon.click();
                }
                await soft(dialog.sizeInput, 'minus stops at 1').toHaveValue('1');
                await dialog.incrementIcon.click();
                await soft(dialog.sizeInput, 'plus raises by one').toHaveValue('2');
            }));

        await test.step('follows the slider keys in the size field', () =>
            inDialog(async (dialog) => {
                await dialog.slider.press('Home');
                await soft(dialog.sizeInput, 'Home').toHaveValue('1');
                await dialog.slider.press('ArrowRight');
                await soft(dialog.sizeInput, 'ArrowRight').toHaveValue('2');
                await dialog.slider.press('End');
                await soft(dialog.sizeInput, 'End').toHaveValue(String(poolSize));
            }));

        await test.step('corrects a typed size above the maximum to the maximum', () =>
            inDialog(async (dialog) => {
                await dialog.sizeInput.fill('99');
                await soft(dialog.sizeInput, 'size above the maximum').toHaveValue(String(poolSize));
            }));

        await test.step('corrects a negative typed size to the minimum', () =>
            inDialog(async (dialog) => {
                await dialog.sizeInput.fill('-3');
                await soft(dialog.sizeInput, 'negative size').toHaveValue('1');
            }));

        for (const invalidSize of ['0', '', '2.5']) {
            await test.step(`disables Allocate for the size "${invalidSize}"`, () =>
                inDialog(async (dialog) => {
                    await dialog.sizeInput.fill(invalidSize);
                    await soft(dialog.allocateButton, `Allocate disabled for "${invalidSize}"`).toBeDisabled();
                }));
        }

        await test.step('allocates nothing when the dialog is cancelled', async () => {
            const dialog = await openDialog();
            await dialog.cancelButton.click();
            await expect(dialog.root).toBeHidden();
            expect(await listAllocationUnits(sandbox, pool.id)).toHaveLength(0);
            expect((await readPool(sandbox, pool.id)).size).toBe(0);
        });
    });
});

async function maximumSizes(overview: PoolOverviewPage): Promise<number[]> {
    const cells = await overview.table.rows.locator('td[data-cy$="-usedAndMaxSize"]').allInnerTexts();
    return cells.map((text) => Number(text.split('/')[1]));
}
