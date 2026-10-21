import type { ApiClient } from '../../support/api/api-client';
import { expect, test } from '../../support/fixtures';
import { ADMINISTRATION_LINKS, ROLES_WITHOUT_ADMINISTRATION } from '../../support/pages/user-and-group/administration-access';
import { expectRedirectedAway } from '../../support/route-guard';
import {
    createGroup,
    createPopulatedGroup,
    daysAhead,
    findGroupByName,
    findUserBySubject,
    MEMBER_SUBJECTS,
    removeMembers,
    readSystemGroups,
    SYSTEM_GROUP_NAMES,
} from '../../support/pages/user-and-group/group-data';
import { GroupOverviewPage } from '../../support/pages/user-and-group/group-pages';
import {
    ConfirmationDialog,
    errorDialog,
    pageTitle,
    waitForNotification,
    expectUrlWhileLoading,
} from '../../support/ui';

test.use({ account: 'userAdministrator' });

test.describe('group.overview', () => {
    test.describe('access', () => {
        for (const role of ROLES_WITHOUT_ADMINISTRATION) {
            test(`sends the ${role} account away from /group`, async ({ openAs }) => {
                await expectRedirectedAway(openAs, role, '/group', { absentLinks: ADMINISTRATION_LINKS });
            });
        }

        test('sends a signed-out visitor to the login page', async ({ openAs }) => {
            const page = await openAs('anonymous');
            await page.goto('/group');
            await expectUrlWhileLoading(page, /\/login/);
        });
    });

    test('shows the title, the columns and the control bar', async ({ page, checkpoint }) => {
        const overview = new GroupOverviewPage(page);
        await overview.open();
        await expect(pageTitle(page)).toHaveText('Group Overview');
        for (const header of ['Name', 'Description', 'Expiration Date', 'Actions']) {
            await expect(overview.table.headerCell(header)).toBeVisible();
        }
        await expect(overview.createButton).toBeEnabled();
        await expect(overview.deleteButton).toBeDisabled();
        await expect(overview.filterInput).toBeVisible();
        await checkpoint(page, 'group overview loaded');
    });

    test('lists the platform groups with their descriptions', async ({ page, apiAs }) => {
        const systemGroups = await readSystemGroups(apiAs('userAdministrator').userAndGroup);
        const overview = new GroupOverviewPage(page);
        await overview.open();
        for (const name of SYSTEM_GROUP_NAMES) {
            const stored = systemGroups.find((group) => group.name === name);
            expect(stored, `system group ${name} from the API`).toBeDefined();
            await overview.filterBy(name);
            await expect(overview.rowOf(name)).toHaveCount(1);
            await expect(overview.rowOf(name)).toContainText(stored!.description);
        }
    });

    test('sorts by name ascending when first opened', async ({ page }) => {
        const overview = new GroupOverviewPage(page);
        await overview.open();
        await expect(overview.table.headerCell('Name')).toHaveAttribute('aria-sort', 'ascending');
    });

    test('filters the list by name', async ({ page, apiAs, uniqueName, checkpoint }) => {
        const api = apiAs('userAdministrator').userAndGroup;
        const name = uniqueName('overview-filter');
        await createGroup(api, { name });
        await createGroup(api, { name: uniqueName('overview-other') });
        const overview = new GroupOverviewPage(page);
        await overview.open();
        await overview.filterBy(name);
        await expect(overview.table.rows).toHaveCount(1);
        await expect(overview.rowOf(name)).toBeVisible();
        await checkpoint(page, 'filtered by name');
    });

    test('shows the empty state when no group matches the filter', async ({ page, checkpoint }) => {
        const overview = new GroupOverviewPage(page);
        await overview.open();
        await overview.filterBy('no-such-group-0f3a9c');
        await expect(overview.table.rows).toHaveCount(0);
        await expect(overview.table.emptyState).toBeVisible();
        await checkpoint(page, 'filter without matches');
    });

    test('restores the full list when the filter is cleared', async ({ page }) => {
        const overview = new GroupOverviewPage(page);
        await overview.open();
        await overview.filterBy('no-such-group-0f3a9c');
        await expect(overview.table.rows).toHaveCount(0);
        await overview.filterBy('');
        await expect(overview.table.rows.first()).toBeVisible();
        await expect(overview.rowOf('DEFAULT-GROUP')).toBeVisible();
    });

    test('renders special characters and markup in a group name as literal text', async ({
        page,
        apiAs,
        uniqueName,
    }) => {
        const name = `${uniqueName('overview-literal')} Žluťoučký kůň <b>x</b>`;
        await createGroup(apiAs('userAdministrator').userAndGroup, { name });
        const overview = new GroupOverviewPage(page);
        await overview.open();
        await overview.filterBy(name);
        await expect(overview.nameLinkOf(name)).toHaveText(name);
        await expect(overview.table.root.locator('b')).toHaveCount(0);
    });

    test('shows the expiration date of a group as year, month and day', async ({
        page,
        apiAs,
        uniqueName,
    }) => {
        const name = uniqueName('overview-expiry');
        await createGroup(apiAs('userAdministrator').userAndGroup, {
            name,
            expirationDate: daysAhead(40),
        });
        const overview = new GroupOverviewPage(page);
        await overview.open();
        await overview.filterBy(name);
        const [expiration] = await overview.table.columnTexts('Expiration Date');
        expect(expiration).toMatch(/^\d{4}-\d{1,2}-\d{1,2}$/);
    });

    test('shows a dash for a group without expiration date', async ({ page, apiAs, uniqueName }) => {
        const name = uniqueName('overview-no-expiry');
        await createGroup(apiAs('userAdministrator').userAndGroup, { name });
        const overview = new GroupOverviewPage(page);
        await overview.open();
        await overview.filterBy(name);
        expect(await overview.table.columnTexts('Expiration Date')).toEqual(['-']);
    });

    test.describe('sorting', () => {
        async function openSortableGroups(
            overview: GroupOverviewPage,
            api: ApiClient,
            prefix: string,
        ): Promise<void> {
            await createGroup(api, {
                name: `${prefix}-a`,
                description: 'charlie',
                expirationDate: daysAhead(30),
            });
            await createGroup(api, {
                name: `${prefix}-b`,
                description: 'alpha',
                expirationDate: daysAhead(10),
            });
            await createGroup(api, {
                name: `${prefix}-c`,
                description: 'bravo',
                expirationDate: daysAhead(20),
            });
            await overview.open();
            await overview.filterBy(prefix);
            await expect(overview.table.rows).toHaveCount(3);
        }

        test('sorts by name in both directions', async ({ page, apiAs, uniqueName }) => {
            const overview = new GroupOverviewPage(page);
            const prefix = uniqueName('overview-sort-name');
            await openSortableGroups(overview, apiAs('userAdministrator').userAndGroup, prefix);
            await overview.table.sortTo('Name', 'ascending');
            await expect
                .poll(() => overview.table.columnTexts('Name'))
                .toEqual([`${prefix}-a`, `${prefix}-b`, `${prefix}-c`]);
            await overview.table.sortTo('Name', 'descending');
            await expect
                .poll(() => overview.table.columnTexts('Name'))
                .toEqual([`${prefix}-c`, `${prefix}-b`, `${prefix}-a`]);
        });

        test('sorts by description in both directions', async ({ page, apiAs, uniqueName }) => {
            const overview = new GroupOverviewPage(page);
            const prefix = uniqueName('overview-sort-description');
            await openSortableGroups(overview, apiAs('userAdministrator').userAndGroup, prefix);
            await overview.table.sortTo('Description', 'ascending');
            await expect
                .poll(() => overview.table.columnTexts('Description'))
                .toEqual(['alpha', 'bravo', 'charlie']);
            await overview.table.sortTo('Description', 'descending');
            await expect
                .poll(() => overview.table.columnTexts('Description'))
                .toEqual(['charlie', 'bravo', 'alpha']);
        });

        test('sorts by expiration date in both directions', async ({ page, apiAs, uniqueName }) => {
            const overview = new GroupOverviewPage(page);
            const prefix = uniqueName('overview-sort-expiry');
            await openSortableGroups(overview, apiAs('userAdministrator').userAndGroup, prefix);
            await overview.table.sortTo('Expiration Date', 'ascending');
            await expect
                .poll(() => overview.table.columnTexts('Name'))
                .toEqual([`${prefix}-b`, `${prefix}-c`, `${prefix}-a`]);
            await overview.table.sortTo('Expiration Date', 'descending');
            await expect
                .poll(() => overview.table.columnTexts('Name'))
                .toEqual([`${prefix}-a`, `${prefix}-c`, `${prefix}-b`]);
        });
    });

    test.describe('paging', () => {
        test('offers the page sizes 10, 15, 25, 50 and 100', async ({ page }) => {
            const overview = new GroupOverviewPage(page);
            await overview.open();
            await overview.table.pageSizeSelect.click({ force: true });
            await expect(page.getByRole('option')).toHaveText(['10', '15', '25', '50', '100']);
        });

        test('shows the number of rows the page size allows', async ({ page }) => {
            const overview = new GroupOverviewPage(page);
            await overview.open();
            await overview.table.selectPageSize(10);
            await expect(overview.table.rows).toHaveCount(10);
            await expect(overview.table.rangeLabel).toHaveText(/^\s*1\s*[–-]\s*10 of \d+\s*$/);
        });

        test('moves between the first, next, previous and last page', async ({ page }) => {
            const overview = new GroupOverviewPage(page);
            await overview.open();
            await overview.table.selectPageSize(10);
            await expect(overview.table.previousPageButton).toBeDisabled();
            await expect(overview.table.firstPageButton).toBeDisabled();

            await overview.table.nextPageButton.click();
            await expect(overview.table.rangeLabel).toHaveText(/^\s*11\s*[–-]\s*20 of \d+\s*$/);
            await expect(overview.table.previousPageButton).toBeEnabled();

            await overview.table.previousPageButton.click();
            await expect(overview.table.rangeLabel).toHaveText(/^\s*1\s*[–-]\s*10 of \d+\s*$/);

            await overview.table.lastPageButton.click();
            await expect(overview.table.nextPageButton).toBeDisabled();
            await expect(overview.table.rows.first()).toBeVisible();

            await overview.table.firstPageButton.click();
            await expect(overview.table.rangeLabel).toHaveText(/^\s*1\s*[–-]\s*10 of \d+\s*$/);
        });
    });

    test.describe('selection', () => {
        test('labels the delete control with the number of selected rows', async ({
            page,
            apiAs,
            uniqueName,
        }) => {
            const api = apiAs('userAdministrator').userAndGroup;
            const prefix = uniqueName('overview-select');
            await createGroup(api, { name: `${prefix}-a` });
            await createGroup(api, { name: `${prefix}-b` });
            const overview = new GroupOverviewPage(page);
            await overview.open();
            await overview.filterBy(prefix);
            await expect(overview.table.rows).toHaveCount(2);

            await overview.table.rowCheckbox(overview.rowOf(`${prefix}-a`)).check();
            await expect(overview.deleteButton).toHaveText(/Delete \(1\)/);
            await overview.table.selectAllCheckbox.check();
            await expect(overview.deleteButton).toHaveText(/Delete \(2\)/);
            await overview.table.selectAllCheckbox.uncheck();
            await expect(overview.deleteButton).toBeDisabled();
        });
    });

    test.describe('navigation', () => {
        test('opens the creation page with the Create control', async ({ page }) => {
            const overview = new GroupOverviewPage(page);
            await overview.open();
            await overview.createButton.click();
            await expect(page).toHaveURL(/\/group\/create$/);
        });

        test('opens the edit page with the row edit action', async ({ page, apiAs, uniqueName }) => {
            const name = uniqueName('overview-row-edit');
            const group = await createGroup(apiAs('userAdministrator').userAndGroup, { name });
            const overview = new GroupOverviewPage(page);
            await overview.open();
            await overview.filterBy(name);
            await overview.editActionOf(name).click();
            await expect(page).toHaveURL(new RegExp(`/group/${group.id}/edit$`));
        });

        test('opens the detail page with the name link', async ({ page, apiAs, uniqueName }) => {
            const name = uniqueName('overview-row-link');
            const group = await createGroup(apiAs('userAdministrator').userAndGroup, { name });
            const overview = new GroupOverviewPage(page);
            await overview.open();
            await overview.filterBy(name);
            await overview.nameLinkOf(name).click();
            await expect(page).toHaveURL(new RegExp(`/group/${group.id}$`));
        });
    });

    test.describe('deleting', () => {
        test('asks for confirmation before deleting one group and keeps it on cancel', async ({
            page,
            apiAs,
            uniqueName,
            checkpoint,
        }) => {
            const api = apiAs('userAdministrator').userAndGroup;
            const name = uniqueName('overview-delete-cancel');
            await createGroup(api, { name });
            const overview = new GroupOverviewPage(page);
            await overview.open();
            await overview.filterBy(name);
            await overview.deleteActionOf(name).click();

            const dialog = new ConfirmationDialog(page, /^Remove Group$/);
            await expect(dialog.title).toBeVisible();
            await expect(dialog.message).toHaveText('Do you want to remove selected group?');
            await checkpoint(page, 'delete confirmation');
            await dialog.cancel();
            await expect(dialog.root).toHaveCount(0);
            await expect(overview.rowOf(name)).toBeVisible();
            expect(await findGroupByName(api, name)).toBeDefined();
        });

        test('deletes one group after confirmation', async ({ page, apiAs, uniqueName, checkpoint }) => {
            const api = apiAs('userAdministrator').userAndGroup;
            const name = uniqueName('overview-delete-one');
            await createGroup(api, { name });
            const overview = new GroupOverviewPage(page);
            await overview.open();
            await overview.filterBy(name);
            await overview.deleteActionOf(name).click();
            await new ConfirmationDialog(page, /^Remove Group$/).confirm();

            const notification = await waitForNotification(page, 'Group was deleted');
            expect(notification.kind).toBe('success');
            await expect(overview.rowOf(name)).toHaveCount(0);
            await expect(errorDialog(page)).toHaveCount(0);
            await checkpoint(page, 'group deleted');
            expect(await findGroupByName(api, name)).toBeUndefined();
        });

        test('deletes a group once its members are removed and keeps those users', async ({
            page,
            apiAs,
            uniqueName,
        }) => {
            const api = apiAs('userAdministrator').userAndGroup;
            const name = uniqueName('overview-delete-members');
            const memberSubjects = MEMBER_SUBJECTS.slice(0, 3);
            const group = await createPopulatedGroup(api, { name, memberSubjects });
            await removeMembers(api, group.id, memberSubjects);
            const overview = new GroupOverviewPage(page);
            await overview.open();
            await overview.filterBy(name);
            await overview.deleteActionOf(name).click();
            await new ConfirmationDialog(page, /^Remove Group$/).confirm();

            const notification = await waitForNotification(page, 'Group was deleted');
            expect(notification.kind).toBe('success');
            await expect(overview.rowOf(name)).toHaveCount(0);
            await expect(errorDialog(page)).toHaveCount(0);
            expect(await findGroupByName(api, name)).toBeUndefined();
            for (const subject of memberSubjects) {
                expect(await findUserBySubject(api, subject)).toBeDefined();
            }
        });

        test('asks for confirmation before deleting selected groups and keeps them on cancel', async ({
            page,
            apiAs,
            uniqueName,
        }) => {
            const api = apiAs('userAdministrator').userAndGroup;
            const prefix = uniqueName('overview-delete-many-cancel');
            await createGroup(api, { name: `${prefix}-a` });
            await createGroup(api, { name: `${prefix}-b` });
            const overview = new GroupOverviewPage(page);
            await overview.open();
            await overview.filterBy(prefix);
            await expect(overview.table.rows).toHaveCount(2);
            await overview.table.selectAllCheckbox.check();
            await overview.deleteButton.click();

            const dialog = new ConfirmationDialog(page, /^Remove Groups$/);
            await expect(dialog.title).toBeVisible();
            await expect(dialog.message).toHaveText('Do you want to remove 2 selected groups?');
            await dialog.cancel();
            await expect(dialog.root).toHaveCount(0);
            await expect(overview.table.rows).toHaveCount(2);
            expect(await findGroupByName(api, `${prefix}-a`)).toBeDefined();
            expect(await findGroupByName(api, `${prefix}-b`)).toBeDefined();
        });

        test('deletes the selected groups after confirmation', async ({ page, apiAs, uniqueName }) => {
            const api = apiAs('userAdministrator').userAndGroup;
            const prefix = uniqueName('overview-delete-many');
            await createGroup(api, { name: `${prefix}-a` });
            await createGroup(api, { name: `${prefix}-b` });
            const overview = new GroupOverviewPage(page);
            await overview.open();
            await overview.filterBy(prefix);
            await expect(overview.table.rows).toHaveCount(2);
            await overview.table.selectAllCheckbox.check();
            await overview.deleteButton.click();
            await new ConfirmationDialog(page, /^Remove Groups$/).confirm();

            const notification = await waitForNotification(page, 'Groups were deleted');
            expect(notification.kind).toBe('success');
            await expect(overview.table.rows).toHaveCount(0);
            expect(await findGroupByName(api, `${prefix}-a`)).toBeUndefined();
            expect(await findGroupByName(api, `${prefix}-b`)).toBeUndefined();
        });
    });

    test.describe('platform groups', () => {
        for (const name of SYSTEM_GROUP_NAMES) {
            test(`does not offer deleting ${name}`, async ({ page, apiAs }) => {
                const systemGroups = await readSystemGroups(apiAs('userAdministrator').userAndGroup);
                expect(systemGroups.map((group) => group.name)).toContain(name);
                const overview = new GroupOverviewPage(page);
                await overview.open();
                await overview.filterBy(name);
                await expect(overview.rowOf(name)).toBeVisible();
                const action = overview.deleteActionOf(name);
                const offered = (await action.count()) > 0 && (await action.first().isEnabled());
                expect(offered, `the row delete action of ${name}`).toBe(false);
            });

            test(`does not let ${name} be selected for bulk deletion`, async ({ page }) => {
                const overview = new GroupOverviewPage(page);
                await overview.open();
                await overview.filterBy(name);
                await expect(overview.rowOf(name)).toBeVisible();
                const checkbox = overview.table.rowCheckbox(overview.rowOf(name));
                const selectable = (await checkbox.count()) > 0 && (await checkbox.isEnabled());
                expect(selectable, `the selection checkbox of ${name}`).toBe(false);
            });
        }
    });
});
