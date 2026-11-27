import { FILTER_SETTLE_TIMEOUT_MILLISECONDS, HOUR_MILLISECONDS } from '../../support/time';
import { ApiError } from '../../support/api/api-client';
import { expect, test } from '../../support/pages/training-instance/training-instance-test';
import { formatOverviewDate } from '../../support/pages/training-instance/instance-data';
import { InstanceOverviewPage } from '../../support/pages/training-instance/instance-overview.page';
import {
    ConfirmationDialog,
    captureDownload,
    errorDialog,
    expectNoErrorDialog,
    hoverTooltipTrigger,
    pageTitle,
    visibleTooltip,
    waitForNotification,
    expectUrlWhileLoading,
} from '../../support/ui';

test.use({ account: 'trainingOrganizer' });

const MERGED_TEST_TIMEOUT_MILLISECONDS = 240_000;

const OVERVIEW_HEADERS = [
    'Title',
    'Start Time',
    'End Time',
    'Expires In',
    'Training Definition',
    'Last Edit By',
    'Pool',
    'Pool Size',
    'Access Token',
    'Actions',
];

const SORTABLE_COLUMNS = [
    { header: 'Title', ascendingFirst: 'title' },
    { header: 'Start Time', ascendingFirst: 'earlier' },
    { header: 'End Time', ascendingFirst: 'earlier' },
    { header: 'Pool', ascendingFirst: 'earlier' },
    { header: 'Access Token', ascendingFirst: 'earlier' },
] as const;

const UNSORTABLE_HEADERS = ['Expires In', 'Training Definition', 'Pool Size'];

test.describe('linear-instance', () => {
    test('checks sorting and filtering of the table on two instances', async ({
        page,
        createInstance,
        checkpoint,
    }, testInfo) => {
        test.setTimeout(MERGED_TEST_TIMEOUT_MILLISECONDS);
        const purpose = `tablecheck-attempt${testInfo.retry}`;
        const earlier = await createInstance({
            purpose,
            startsInMilliseconds: HOUR_MILLISECONDS,
            accessTokenPrefix: 'e2e-sort-a',
        });
        const later = await createInstance({
            purpose,
            startsInMilliseconds: 3 * HOUR_MILLISECONDS,
            accessTokenPrefix: 'e2e-sort-b',
        });
        const sharedTitlePrefix = earlier.title.slice(0, earlier.title.lastIndexOf('-'));
        const overview = new InstanceOverviewPage(page);
        await overview.open();

        await test.step('starts sorted by start time, newest first', async () => {
            await expect
                .soft(overview.table.headerCell('Start Time'), 'start time header sort')
                .toHaveAttribute('aria-sort', 'descending');
            await overview.filterByTitle(sharedTitlePrefix);
            await expect
                .poll(() => overview.titlesInOrder(), { message: 'both instances, later start first' })
                .toEqual([later.title, earlier.title]);
        });

        for (const header of UNSORTABLE_HEADERS) {
            await test.step(`does not sort by ${header}`, async () => {
                await overview.table.sortBy(header);
                await expect
                    .soft(overview.table.headerCell(header), `${header} header sort`)
                    .not.toHaveAttribute('aria-sort', /ascending|descending/);
                await expect
                    .soft(overview.table.headerCell('Start Time'), 'start time header sort')
                    .toHaveAttribute('aria-sort', 'descending');
            });
        }

        await test.step('narrows the table to the instances whose title matches', async () => {
            await overview.showOnly(earlier.title);
            await expect.soft(overview.table.rows, 'rows shown').toHaveCount(1);
            await expect.soft(overview.rowOf(later.title), 'row of the other instance').toHaveCount(0);
            await checkpoint(page, 'filtered by title');
        });

        await test.step('shows the empty state when no title matches and recovers after clearing', async () => {
            await overview.filterByTitle(`${earlier.title}-no-such-instance`);
            await expect
                .soft(overview.table.emptyState, 'empty state')
                .toBeVisible({ timeout: FILTER_SETTLE_TIMEOUT_MILLISECONDS });
            await expect.soft(overview.table.rows, 'rows shown').toHaveCount(0);
            await checkpoint(page, 'empty state');
            await overview.filterByTitle('');
            await expect.soft(overview.filterInput, 'filter after clearing').toHaveValue('');
            await expect.soft(overview.table.rows.first(), 'first row after clearing').toBeVisible();
            await expect.soft(overview.table.emptyState, 'empty state after clearing').toHaveCount(0);
        });

        await test.step('treats special characters in the filter as literal text', async () => {
            await overview.filterByTitle('<b>x</b> Žluťoučký kůň');
            await expect
                .soft(overview.table.emptyState, 'empty state')
                .toBeVisible({ timeout: FILTER_SETTLE_TIMEOUT_MILLISECONDS });
            await expect.soft(overview.filterInput, 'filter text').toHaveValue('<b>x</b> Žluťoučký kůň');
        });

        for (const { header, ascendingFirst } of SORTABLE_COLUMNS) {
            await test.step(`sorts by ${header} ascending, then descending`, async () => {
                const expectedAscending =
                    ascendingFirst === 'title' ? [earlier.title, later.title].sort() : [earlier.title, later.title];
                await overview.filterByTitle(sharedTitlePrefix);
                await expect.poll(() => overview.titlesInOrder()).toHaveLength(2);
                await overview.table.sortTo(header, 'ascending');
                await expect
                    .poll(() => overview.titlesInOrder(), { message: `titles ascending by ${header}` })
                    .toEqual(expectedAscending);
                await overview.table.sortTo(header, 'descending');
                await expect
                    .poll(() => overview.titlesInOrder(), { message: `titles descending by ${header}` })
                    .toEqual([...expectedAscending].reverse());
            });
        }

        await test.step('sorts by Last Edit By ascending, then descending', async () => {
            await overview.table.sortTo('Last Edit By', 'ascending');
            await overview.table.sortTo('Last Edit By', 'descending');
        });
    });

    test('pages through the instances', async ({ page, apiAs, createInstance, checkpoint }) => {
        test.setTimeout(MERGED_TEST_TIMEOUT_MILLISECONDS);
        const training = apiAs('trainingOrganizer').training;
        const smallestPageSize = 10;
        const largestPageSize = 50;
        for (let created = 0; created < smallestPageSize + 1; created++) {
            const firstPage = await training.get<{ pagination: { total_pages: number } }>('/training-instances', {
                size: smallestPageSize,
            });
            if (firstPage.pagination.total_pages > 1) {
                break;
            }
            await createInstance({ purpose: 'paging' });
        }
        const overview = new InstanceOverviewPage(page);
        await overview.open();

        await test.step('offers the page sizes and pages through the instances', async () => {
            await overview.table.selectPageSize(smallestPageSize);
            await expect.soft(overview.table.rows, 'rows on the first page').toHaveCount(smallestPageSize);
            await expect
                .soft(overview.table.rangeLabel, 'range of the first page')
                .toHaveText(new RegExp(`^\\s*1 – ${smallestPageSize} of \\d+\\s*$`));
            await expect.soft(overview.table.previousPageButton, 'previous page button').toBeDisabled();
            await overview.table.nextPageButton.click();
            await expect
                .soft(overview.table.rangeLabel, 'range of the second page')
                .toHaveText(new RegExp(`^\\s*${smallestPageSize + 1} – `));
            await checkpoint(page, 'second page');
            await overview.table.previousPageButton.click();
            await expect
                .soft(overview.table.rangeLabel, 'range after paging back')
                .toHaveText(new RegExp(`^\\s*1 – ${smallestPageSize} of `));
        });

        await test.step('shows a full page at the largest page size, 50', async () => {
            await overview.table.selectPageSize(largestPageSize);
            await expect
                .poll(
                    async () => {
                        const rangeLabel = (await overview.table.rangeLabel.textContent()) ?? '';
                        const [, shownEnd, totalElements] = /^\s*1 – (\d+) of (\d+)\s*$/.exec(rangeLabel) ?? [];
                        if (totalElements === undefined) {
                            return false;
                        }
                        const expectedShown = Math.min(Number(totalElements), largestPageSize);
                        return (
                            Number(shownEnd) === expectedShown &&
                            (await overview.table.rows.count()) === expectedShown &&
                            (await overview.table.nextPageButton.isEnabled()) ===
                                Number(totalElements) > largestPageSize
                        );
                    },
                    {
                        message:
                            'range label, row count and next-page button agree on one page of up to the largest page size',
                    },
                )
                .toBe(true);
        });
    });

    test('checks the row of an instance, its actions and its links', async ({
        page,
        createInstance,
        shared,
        checkpoint,
    }) => {
        test.setTimeout(MERGED_TEST_TIMEOUT_MILLISECONDS);
        const instance = await createInstance({ purpose: 'rowcheck' });
        const overview = new InstanceOverviewPage(page);
        await overview.open();
        const table = overview.table;

        await test.step('shows the page title and every table column', async () => {
            await expect.soft(pageTitle(page), 'page title').toHaveText('Training Instance Overview');
            for (const header of OVERVIEW_HEADERS) {
                await expect.soft(table.headerCell(header), `${header} header`).toBeVisible();
            }
            await expect.soft(overview.createControl, 'Create control').toBeEnabled();
            await checkpoint(page, 'overview loaded');
        });

        await test.step('opens without an error dialog', async () => {
            await expectNoErrorDialog(page);
        });

        const row = await overview.showOnly(instance.title);

        await test.step('lists an own instance with its title, dates, definition, pool and access token', async () => {
            await expect.soft(await table.cell(row, 'Title'), 'title cell').toHaveText(instance.title);
            await expect
                .soft(await table.cell(row, 'Start Time'), 'start time cell')
                .toContainText(formatOverviewDate(instance.startTime));
            await expect
                .soft(await table.cell(row, 'End Time'), 'end time cell')
                .toContainText(formatOverviewDate(instance.endTime));
            await expect
                .soft(await table.cell(row, 'Expires In'), 'expires in cell')
                .toHaveText(/\d+\s*(days?|hours?|minutes?)/i);
            await expect
                .soft(await table.cell(row, 'Training Definition'), 'training definition cell')
                .toContainText(shared.trainingDefinition.title);
            await expect.soft(await table.cell(row, 'Last Edit By'), 'last edit by cell').not.toBeEmpty();
            await expect.soft(await table.cell(row, 'Pool'), 'pool cell').toHaveText(`Pool ${instance.poolId}`);
            await expect
                .soft((await table.cell(row, 'Access Token')).getByRole('button'), 'access token cell')
                .toHaveText(instance.accessToken);
        });

        await test.step('resolves the pool size of an instance that holds a pool', async () => {
            const poolSizeCell = await table.cell(row, 'Pool Size');
            await expect
                .soft(poolSizeCell.locator('mat-spinner, mat-progress-spinner'), 'pool size spinner')
                .toHaveCount(0);
            await expect.soft(poolSizeCell, 'pool size cell').toHaveText(/^\s*\d+ \(\d+ free\)\s*$/);
        });

        await test.step('disables copying the access token while the pool has no free sandbox', async () => {
            const tokenCell = await table.cell(row, 'Access Token');
            await expect
                .soft(tokenCell.getByRole('button', { name: instance.accessToken }), 'access token button')
                .toBeDisabled();
            await hoverTooltipTrigger(page, tokenCell.locator('.access-token-container'));
            await expect
                .soft(visibleTooltip(page), 'access token tooltip')
                .toHaveText('Cannot copy access token because there is no free sandbox.');
        });

        await test.step('offers no link to the training definition, which the organizer cannot open', async () => {
            const definitionCell = await table.cell(row, 'Training Definition');
            await expect.soft(definitionCell.locator('a'), 'links in the training definition cell').toHaveCount(0);
        });

        await test.step('enables the SSH configs action for an instance whose pool exists', async () => {
            await expect.soft(table.rowAction(row, 'vpn_key'), 'SSH configs action').toBeEnabled();
        });

        await test.step('disables analysis and score export for an instance that has not started', async () => {
            await expect.soft(table.rowAction(row, 'assessment'), 'analysis action').toBeDisabled();
            await expect.soft(table.rowAction(row, 'file_download'), 'score export action').toBeDisabled();
        });

        await test.step('downloads the instance data through the get data action', async () => {
            const { fileName } = await captureDownload(page, () =>
                table.clickRowAction(row, { icon: 'cloud_download', label: 'Get Data' }),
            );
            expect.soft(fileName, 'downloaded file name').toMatch(/\.zip$/);
        });

        const returnToOverview = async (): Promise<void> => {
            await overview.open();
            await overview.showOnly(instance.title);
        };

        await test.step('opens the pool detail from the pool link', async () => {
            const poolCell = await table.cell(row, 'Pool');
            await poolCell.getByRole('link', { name: `Pool ${instance.poolId}` }).click();
            await expectUrlWhileLoading(page, new RegExp(`/pool/${instance.poolId}$`));
            await returnToOverview();
        });

        await test.step('opens the detail page from the title link', async () => {
            await row.getByRole('link', { name: instance.title }).click();
            await expectUrlWhileLoading(page, new RegExp(`/linear-instance/${instance.id}/detail$`));
            await returnToOverview();
        });

        await test.step('opens the create page from the Create control', async () => {
            await overview.createControl.click();
            await expectUrlWhileLoading(page, /\/linear-instance\/create$/);
            await returnToOverview();
        });

        await test.step('opens the edit page through the edit action', async () => {
            await table.clickRowAction(row, { icon: 'create', label: 'Edit training instance' });
            await expectUrlWhileLoading(page, new RegExp(`/linear-instance/${instance.id}/edit$`));
            await returnToOverview();
        });

        await test.step('opens the access token page through the display token action', async () => {
            await table.clickRowAction(row, { icon: 'pin', label: 'Display Token' });
            await expectUrlWhileLoading(page, new RegExp(`/linear-instance/${instance.id}/access-token$`));
            await returnToOverview();
        });

        await test.step('opens the training runs through the training runs action', async () => {
            await table.clickRowAction(row, { icon: 'run_circle', label: 'Training Runs' });
            await expectUrlWhileLoading(page, new RegExp(`/linear-instance/${instance.id}/runs$`));
        });
    });

    test('deletes an instance after cancelling both delete dialogs', async ({
        page,
        apiAs,
        createInstance,
        checkpoint,
    }) => {
        test.setTimeout(MERGED_TEST_TIMEOUT_MILLISECONDS);
        const instance = await createInstance({ purpose: 'deletechain' });
        const training = apiAs('trainingOrganizer').training;
        const overview = new InstanceOverviewPage(page);
        await overview.open();
        const row = await overview.showOnly(instance.title);
        const openDeleteDialog = (): Promise<void> =>
            overview.table.clickRowAction(row, { icon: 'delete', label: 'Delete training instance' });

        await test.step('keeps the instance when the delete dialog is cancelled', async () => {
            await openDeleteDialog();
            const dialog = new ConfirmationDialog(page, 'Delete Training Instance');
            await expect.soft(dialog.title, 'delete dialog title').toHaveText('Delete Training Instance');
            await expect
                .soft(dialog.message, 'delete dialog message')
                .toContainText(`Do you want to delete training instance "${instance.title}"?`);
            await checkpoint(page, 'delete dialog open');
            await dialog.cancel();
            await expect(dialog.root).toHaveCount(0);
            await expect.soft(row, 'row after cancelling').toBeVisible();
            const stored = await training.get<{ id: number }>(`/training-instances/${instance.id}`);
            expect.soft(stored.id, 'stored instance').toBe(instance.id);
        });

        await test.step('keeps the instance when the force delete dialog is cancelled', async () => {
            await openDeleteDialog();
            await new ConfirmationDialog(page, 'Delete Training Instance').confirm();
            const forceDialog = new ConfirmationDialog(page, 'Force Delete Training Instance');
            await forceDialog.cancel();
            await expect(forceDialog.root).toHaveCount(0);
            await expect.soft(row, 'row after cancelling').toBeVisible();
            const stored = await training.get<{ id: number }>(`/training-instances/${instance.id}`);
            expect.soft(stored.id, 'stored instance').toBe(instance.id);
        });

        await test.step('deletes an instance that holds a pool after the force delete confirmation', async () => {
            await openDeleteDialog();
            await new ConfirmationDialog(page, 'Delete Training Instance').confirm();
            const forceDialog = new ConfirmationDialog(page, 'Force Delete Training Instance');
            await expect(forceDialog.title).toBeVisible();
            await expect
                .soft(forceDialog.message, 'force delete dialog message')
                .toContainText(`force delete training instance "${instance.title}"`);
            await checkpoint(page, 'force delete dialog open');
            await forceDialog.confirm();
            await waitForNotification(page, 'Training instance was successfully deleted');
            await expect.soft(overview.rowOf(instance.title), 'row after deleting').toHaveCount(0);
            await expect.soft(errorDialog(page), 'error dialog').toHaveCount(0);
            await expect
                .poll(async () =>
                    training.get(`/training-instances/${instance.id}`).then(
                        () => 200,
                        (error: unknown) => (error instanceof ApiError ? error.status : -1),
                    ),
                )
                .toBe(404);
        });
    });
});
