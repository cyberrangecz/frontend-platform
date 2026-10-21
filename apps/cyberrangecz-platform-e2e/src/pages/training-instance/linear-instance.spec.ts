import { FILTER_SETTLE_TIMEOUT_MILLISECONDS, HOUR_MILLISECONDS } from '../../support/time';
import { ApiError } from '../../support/api/api-client';
import { expect, test } from '../../support/pages/training-instance/training-instance-test';
import { formatOverviewDate, waitForInstanceStart } from '../../support/pages/training-instance/instance-data';
import { InstanceOverviewPage } from '../../support/pages/training-instance/instance-overview.page';
import { expectRedirectedAway } from '../../support/route-guard';
import {
    ConfirmationDialog,
    captureDownload,
    errorDialog,
    expectNoErrorDialog,
    pageTitle,
    waitForNotification,
    expectUrlWhileLoading,
} from '../../support/ui';

test.use({ account: 'trainingOrganizer' });

const NON_ORGANIZER_ROLES =['trainingDesigner', 'trainee'] as const;

test.describe('linear-instance', () => {
    test('shows the page title and every table column', async ({ page, checkpoint }) => {
        const overview = new InstanceOverviewPage(page);
        await overview.open();
        await expect(pageTitle(page)).toHaveText('Training Instance Overview');
        for (const header of [
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
        ]) {
            await expect(overview.table.headerCell(header)).toBeVisible();
        }
        await expect(overview.createControl).toBeEnabled();
        await checkpoint(page, 'overview loaded');
    });

    test('opens without an error dialog', async ({ page }) => {
        const overview = new InstanceOverviewPage(page);
        await overview.open();
        await expectNoErrorDialog(page);
    });

    test('lists an own instance with its title, dates, definition, pool and access token', async ({
        page,
        createInstance,
        shared,
    }) => {
        const instance = await createInstance({ purpose: 'row' });
        const overview = new InstanceOverviewPage(page);
        await overview.open();
        const row = await overview.showOnly(instance.title);
        const table = overview.table;
        await expect(await table.cell(row, 'Title')).toHaveText(instance.title);
        await expect(await table.cell(row, 'Start Time')).toContainText(formatOverviewDate(instance.startTime));
        await expect(await table.cell(row, 'End Time')).toContainText(formatOverviewDate(instance.endTime));
        await expect(await table.cell(row, 'Expires In')).toHaveText(/\d+\s*(days?|hours?|minutes?)/i);
        await expect(await table.cell(row, 'Training Definition')).toContainText(shared.trainingDefinition.title);
        await expect(await table.cell(row, 'Last Edit By')).not.toBeEmpty();
        await expect(await table.cell(row, 'Pool')).toHaveText(`Pool ${instance.poolId}`);
        await expect((await table.cell(row, 'Access Token')).getByRole('button')).toHaveText(instance.accessToken);
    });

    test('resolves the pool size of an instance that holds a pool', async ({ page, createInstance }) => {
        const instance = await createInstance({ purpose: 'poolsize' });
        const overview = new InstanceOverviewPage(page);
        await overview.open();
        const row = await overview.showOnly(instance.title);
        const poolSizeCell = await overview.table.cell(row, 'Pool Size');
        await expect(poolSizeCell.locator('mat-spinner, mat-progress-spinner')).toHaveCount(0);
        await expect(poolSizeCell).toHaveText(/^\s*\d+ \(\d+ free\)\s*$/);
    });

    test('disables copying the access token while the pool has no free sandbox', async ({
        page,
        createInstance,
    }) => {
        const instance = await createInstance({ purpose: 'tokencopy' });
        const overview = new InstanceOverviewPage(page);
        await overview.open();
        const row = await overview.showOnly(instance.title);
        const tokenCell = await overview.table.cell(row, 'Access Token');
        await expect(tokenCell.getByRole('button', { name: instance.accessToken })).toBeDisabled();
    });

    test('offers no link to the training definition, which the organizer cannot open', async ({
        page,
        createInstance,
    }) => {
        const instance = await createInstance({ purpose: 'links' });
        const overview = new InstanceOverviewPage(page);
        await overview.open();
        const row = await overview.showOnly(instance.title);
        await expect(await overview.table.cell(row, 'Training Definition').then((cell) => cell.locator('a'))).toHaveCount(0);
    });

    test('opens the pool detail from the pool link', async ({ page, createInstance }) => {
        const instance = await createInstance({ purpose: 'poollink' });
        const overview = new InstanceOverviewPage(page);
        await overview.open();
        const row = await overview.showOnly(instance.title);
        const poolCell = await overview.table.cell(row, 'Pool');
        await poolCell.getByRole('link', { name: `Pool ${instance.poolId}` }).click();
        await expectUrlWhileLoading(page, new RegExp(`/pool/${instance.poolId}$`));
    });

    test('opens the detail page from the title link', async ({ page, createInstance }) => {
        const instance = await createInstance({ purpose: 'titlelink' });
        const overview = new InstanceOverviewPage(page);
        await overview.open();
        const row = await overview.showOnly(instance.title);
        await row.getByRole('link', { name: instance.title }).click();
        await expectUrlWhileLoading(page, new RegExp(`/linear-instance/${instance.id}/detail$`));
    });

    test('opens the create page from the Create control', async ({ page }) => {
        const overview = new InstanceOverviewPage(page);
        await overview.open();
        await overview.createControl.click();
        await expectUrlWhileLoading(page, /\/linear-instance\/create$/);
    });

    test.describe('filter', () => {
        test('narrows the table to the instances whose title matches', async ({ page, createInstance, checkpoint }) => {
            const instance = await createInstance({ purpose: 'filter' });
            const other = await createInstance({ purpose: 'filterother' });
            const overview = new InstanceOverviewPage(page);
            await overview.open();
            await overview.showOnly(instance.title);
            await expect(overview.table.rows).toHaveCount(1);
            await expect(overview.rowOf(other.title)).toHaveCount(0);
            await checkpoint(page, 'filtered by title');
        });

        test('shows the empty state when no title matches and recovers after clearing', async ({
            page,
            createInstance,
            checkpoint,
        }) => {
            const instance = await createInstance({ purpose: 'filterempty' });
            const overview = new InstanceOverviewPage(page);
            await overview.open();
            await overview.filterByTitle(`${instance.title}-no-such-instance`);
            await expect(overview.table.emptyState).toBeVisible({ timeout: FILTER_SETTLE_TIMEOUT_MILLISECONDS });
            await expect(overview.table.rows).toHaveCount(0);
            await checkpoint(page, 'empty state');
            await overview.filterByTitle('');
            await expect(overview.filterInput).toHaveValue('');
            await expect(overview.table.rows.first()).toBeVisible();
            await expect(overview.table.emptyState).toHaveCount(0);
        });

        test('treats special characters in the filter as literal text', async ({ page }) => {
            const overview = new InstanceOverviewPage(page);
            await overview.open();
            await overview.filterByTitle('<b>x</b> Žluťoučký kůň');
            await expect(overview.table.emptyState).toBeVisible({ timeout: FILTER_SETTLE_TIMEOUT_MILLISECONDS });
            await expect(overview.filterInput).toHaveValue('<b>x</b> Žluťoučký kůň');
        });
    });

    test.describe('sort', () => {
        test('starts sorted by start time, newest first', async ({ page, createInstance }, testInfo) => {
            const purpose = `defaultsort-attempt${testInfo.retry}`;
            const earlier = await createInstance({ purpose, startsInMilliseconds: HOUR_MILLISECONDS });
            const later = await createInstance({ purpose, startsInMilliseconds: 3 * HOUR_MILLISECONDS });
            const overview = new InstanceOverviewPage(page);
            await overview.open();
            await expect(overview.table.headerCell('Start Time')).toHaveAttribute('aria-sort', 'descending');
            await overview.filterByTitle(earlier.title.slice(0, earlier.title.lastIndexOf('-')));
            await expect.poll(() => overview.titlesInOrder()).toEqual([later.title, earlier.title]);
        });

        const sortableColumns = [
            { header: 'Title', ascendingFirst: 'title' },
            { header: 'Start Time', ascendingFirst: 'earlier' },
            { header: 'End Time', ascendingFirst: 'earlier' },
            { header: 'Pool', ascendingFirst: 'earlier' },
            { header: 'Access Token', ascendingFirst: 'earlier' },
        ] as const;

        for (const { header, ascendingFirst } of sortableColumns) {
            test(`sorts by ${header} ascending, then descending`, async ({ page, createInstance }, testInfo) => {
                const purpose = `sortcheck-${header.toLowerCase().replace(/\s+/g, '-')}-attempt${testInfo.retry}`;
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
                const expectedAscending =
                    ascendingFirst === 'title'
                        ? [earlier.title, later.title].sort()
                        : [earlier.title, later.title];
                const overview = new InstanceOverviewPage(page);
                await overview.open();
                await overview.filterByTitle(earlier.title.slice(0, earlier.title.lastIndexOf('-')));
                await expect.poll(() => overview.titlesInOrder()).toHaveLength(2);
                await overview.table.sortTo(header, 'ascending');
                await expect.poll(() => overview.titlesInOrder()).toEqual(expectedAscending);
                await overview.table.sortTo(header, 'descending');
                await expect.poll(() => overview.titlesInOrder()).toEqual([...expectedAscending].reverse());
            });
        }

        test('sorts by Last Edit By ascending, then descending', async ({ page }) => {
            const overview = new InstanceOverviewPage(page);
            await overview.open();
            await overview.table.sortTo('Last Edit By', 'ascending');
            await overview.table.sortTo('Last Edit By', 'descending');
        });

        for (const header of ['Expires In', 'Training Definition', 'Pool Size']) {
            test(`does not sort by ${header}`, async ({ page }) => {
                const overview = new InstanceOverviewPage(page);
                await overview.open();
                await overview.table.sortBy(header);
                await expect(overview.table.headerCell(header)).not.toHaveAttribute('aria-sort', /ascending|descending/);
                await expect(overview.table.headerCell('Start Time')).toHaveAttribute('aria-sort', 'descending');
            });
        }
    });

    test.describe('paging', () => {
        test('offers the page sizes and pages through the instances', async ({ page, apiAs, createInstance, checkpoint }) => {
            const training = apiAs('trainingOrganizer').training;
            const smallestPageSize = 10;
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
            await overview.table.selectPageSize(smallestPageSize);
            await expect(overview.table.rows).toHaveCount(smallestPageSize);
            await expect(overview.table.rangeLabel).toHaveText(new RegExp(`^\\s*1 – ${smallestPageSize} of \\d+\\s*$`));
            await expect(overview.table.previousPageButton).toBeDisabled();
            await overview.table.nextPageButton.click();
            await expect(overview.table.rangeLabel).toHaveText(new RegExp(`^\\s*${smallestPageSize + 1} – `));
            await checkpoint(page, 'second page');
            await overview.table.previousPageButton.click();
            await expect(overview.table.rangeLabel).toHaveText(new RegExp(`^\\s*1 – ${smallestPageSize} of `));
        });

        test('shows a full page at the largest page size, 50', async ({ page }) => {
            const largestPageSize = 50;
            const overview = new InstanceOverviewPage(page);
            await overview.open();
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
                    { message: 'range label, row count and next-page button agree on one page of up to the largest page size' },
                )
                .toBe(true);
        });
    });

    test.describe('row actions', () => {
        test('opens the edit page through the edit action', async ({ page, createInstance }) => {
            const instance = await createInstance({ purpose: 'actionedit' });
            const overview = new InstanceOverviewPage(page);
            await overview.open();
            const row = await overview.showOnly(instance.title);
            await overview.table.clickRowAction(row, { icon: 'create', label: 'Edit training instance' });
            await expectUrlWhileLoading(page, new RegExp(`/linear-instance/${instance.id}/edit$`));
        });

        test('opens the access token page through the display token action', async ({ page, createInstance }) => {
            const instance = await createInstance({ purpose: 'actiontoken' });
            const overview = new InstanceOverviewPage(page);
            await overview.open();
            const row = await overview.showOnly(instance.title);
            await overview.table.clickRowAction(row, { icon: 'pin', label: 'Display Token' });
            await expectUrlWhileLoading(page, new RegExp(`/linear-instance/${instance.id}/access-token$`));
        });

        test('opens the training runs through the training runs action', async ({ page, createInstance }) => {
            const instance = await createInstance({ purpose: 'actionruns' });
            const overview = new InstanceOverviewPage(page);
            await overview.open();
            const row = await overview.showOnly(instance.title);
            await overview.table.clickRowAction(row, { icon: 'run_circle', label: 'Training Runs' });
            await expectUrlWhileLoading(page, new RegExp(`/linear-instance/${instance.id}/runs$`));
        });

        test('downloads the instance data through the get data action', async ({ page, createInstance }) => {
            const instance = await createInstance({ purpose: 'actiondata' });
            const overview = new InstanceOverviewPage(page);
            await overview.open();
            const row = await overview.showOnly(instance.title);
            const { fileName } = await captureDownload(page, () =>
                overview.table.clickRowAction(row, { icon: 'cloud_download', label: 'Get Data' }),
            );
            expect(fileName).toMatch(/\.zip$/);
        });

        test('enables the SSH configs action for an instance whose pool exists', async ({ page, createInstance }) => {
            const instance = await createInstance({ purpose: 'actionssh' });
            const overview = new InstanceOverviewPage(page);
            await overview.open();
            const row = await overview.showOnly(instance.title);
            await expect(overview.table.rowAction(row, 'vpn_key')).toBeEnabled();
        });

        test('disables analysis and score export for an instance that has not started', async ({
            page,
            createInstance,
        }) => {
            const instance = await createInstance({ purpose: 'actionnotstarted' });
            const overview = new InstanceOverviewPage(page);
            await overview.open();
            const row = await overview.showOnly(instance.title);
            await expect(overview.table.rowAction(row, 'assessment')).toBeDisabled();
            await expect(overview.table.rowAction(row, 'file_download')).toBeDisabled();
        });

        test('enables analysis and score export once an instance has started', async ({ page, createInstance }) => {
            const instance = await createInstance({ purpose: 'actionstarted', startsInMilliseconds: 10_000 });
            await waitForInstanceStart(instance);
            const overview = new InstanceOverviewPage(page);
            await overview.open();
            const row = await overview.showOnly(instance.title);
            await expect(overview.table.rowAction(row, 'assessment')).toBeEnabled();
            await expect(overview.table.rowAction(row, 'file_download')).toBeEnabled();
        });

        test('keeps the instance when the delete dialog is cancelled', async ({
            page,
            apiAs,
            createInstance,
            checkpoint,
        }) => {
            const instance = await createInstance({ purpose: 'deletecancel' });
            const overview = new InstanceOverviewPage(page);
            await overview.open();
            const row = await overview.showOnly(instance.title);
            await overview.table.clickRowAction(row, { icon: 'delete', label: 'Delete training instance' });
            const dialog = new ConfirmationDialog(page, 'Delete Training Instance');
            await expect(dialog.title).toHaveText('Delete Training Instance');
            await expect(dialog.message).toContainText(`Do you want to delete training instance "${instance.title}"?`);
            await checkpoint(page, 'delete dialog open');
            await dialog.cancel();
            await expect(dialog.root).toHaveCount(0);
            await expect(row).toBeVisible();
            const stored = await apiAs('trainingOrganizer').training.get<{ id: number }>(`/training-instances/${instance.id}`);
            expect(stored.id).toBe(instance.id);
        });

        test('deletes an instance that holds a pool after the force delete confirmation', async ({
            page,
            apiAs,
            createInstance,
            checkpoint,
        }) => {
            const instance = await createInstance({ purpose: 'deleteconfirm' });
            const overview = new InstanceOverviewPage(page);
            await overview.open();
            const row = await overview.showOnly(instance.title);
            await overview.table.clickRowAction(row, { icon: 'delete', label: 'Delete training instance' });
            await new ConfirmationDialog(page, 'Delete Training Instance').confirm();
            const forceDialog = new ConfirmationDialog(page, 'Force Delete Training Instance');
            await expect(forceDialog.title).toBeVisible();
            await expect(forceDialog.message).toContainText(`force delete training instance "${instance.title}"`);
            await checkpoint(page, 'force delete dialog open');
            await forceDialog.confirm();
            await waitForNotification(page, 'Training instance was successfully deleted');
            await expect(overview.rowOf(instance.title)).toHaveCount(0);
            await expect(errorDialog(page)).toHaveCount(0);
            await expect
                .poll(async () =>
                    apiAs('trainingOrganizer')
                        .training.get(`/training-instances/${instance.id}`)
                        .then(
                            () => 200,
                            (error: unknown) => (error instanceof ApiError ? error.status : -1),
                        ),
                )
                .toBe(404);
        });

        test('keeps the instance when the force delete dialog is cancelled', async ({ page, apiAs, createInstance }) => {
            const instance = await createInstance({ purpose: 'forcecancel' });
            const overview = new InstanceOverviewPage(page);
            await overview.open();
            const row = await overview.showOnly(instance.title);
            await overview.table.clickRowAction(row, { icon: 'delete', label: 'Delete training instance' });
            await new ConfirmationDialog(page, 'Delete Training Instance').confirm();
            const forceDialog = new ConfirmationDialog(page, 'Force Delete Training Instance');
            await forceDialog.cancel();
            await expect(forceDialog.root).toHaveCount(0);
            await expect(row).toBeVisible();
            const stored = await apiAs('trainingOrganizer').training.get<{ id: number }>(`/training-instances/${instance.id}`);
            expect(stored.id).toBe(instance.id);
        });
    });

    test.describe('access', () => {
        for (const role of NON_ORGANIZER_ROLES) {
            test(`sends the ${role} account away from /linear-instance`, async ({ openAs }) => {
                await expectRedirectedAway(openAs, role, '/linear-instance');
            });
        }
    });
});
