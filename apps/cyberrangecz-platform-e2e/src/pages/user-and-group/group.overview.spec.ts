import { expect, test } from '../../support/fixtures';
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
import { ConfirmationDialog, errorDialog, pageTitle, waitForNotification } from '../../support/ui';

test.use({ account: 'userAdministrator' });

test.describe('group.overview', () => {
    test('checks the plain overview and the platform groups', async ({ page, apiAs, checkpoint }) => {
        test.setTimeout(180_000);
        const systemGroups = await readSystemGroups(apiAs('userAdministrator').userAndGroup);
        const overview = new GroupOverviewPage(page);
        await overview.open();

        await test.step('shows the title, the columns and the control bar', async () => {
            await expect.soft(pageTitle(page), 'page title').toHaveText('Group Overview');
            for (const header of ['Name', 'Description', 'Expiration Date', 'Actions']) {
                await expect.soft(overview.table.headerCell(header), `column ${header}`).toBeVisible();
            }
            await expect.soft(overview.createButton, 'Create').toBeEnabled();
            await expect.soft(overview.deleteButton, 'Delete').toBeDisabled();
            await expect.soft(overview.filterInput, 'filter').toBeVisible();
            await checkpoint(page, 'group overview loaded');
        });

        await test.step('sorts by name ascending when first opened', async () => {
            await expect.soft(overview.table.headerCell('Name'), 'Name column sort').toHaveAttribute('aria-sort', 'ascending');
        });

        await test.step('lists the platform groups with their descriptions', async () => {
            for (const name of SYSTEM_GROUP_NAMES) {
                const stored = systemGroups.find((group) => group.name === name);
                expect.soft(stored, `system group ${name} from the API`).toBeDefined();
                await overview.filterBy(name);
                await expect.soft(overview.rowOf(name), `row of ${name}`).toHaveCount(1);
                await expect.soft(overview.rowOf(name), `description of ${name}`).toContainText(stored?.description ?? '');
            }
        });

        for (const name of SYSTEM_GROUP_NAMES) {
            await test.step(`does not offer deleting ${name}`, async () => {
                expect.soft(
                    systemGroups.map((group) => group.name),
                    `system groups from the API contain ${name}`,
                ).toContain(name);
                await overview.filterBy(name);
                await expect.soft(overview.rowOf(name), `row of ${name}`).toBeVisible();
                const action = overview.deleteActionOf(name);
                const offered = (await action.count()) > 0 && (await action.first().isEnabled());
                expect.soft(offered, `the row delete action of ${name}`).toBe(false);
            });

            await test.step(`does not let ${name} be selected for bulk deletion`, async () => {
                await overview.filterBy(name);
                await expect.soft(overview.rowOf(name), `row of ${name}`).toBeVisible();
                const checkbox = overview.table.rowCheckbox(overview.rowOf(name));
                const selectable = (await checkbox.count()) > 0 && (await checkbox.isEnabled());
                expect.soft(selectable, `the selection checkbox of ${name}`).toBe(false);
            });
        }

        await test.step('shows the empty state when no group matches the filter', async () => {
            await overview.filterBy('no-such-group-0f3a9c');
            await expect.soft(overview.table.rows, 'rows').toHaveCount(0);
            await expect.soft(overview.table.emptyState, 'empty state').toBeVisible();
            await checkpoint(page, 'filter without matches');
        });

        await test.step('restores the full list when the filter is cleared', async () => {
            await overview.filterBy('');
            await expect.soft(overview.table.rows.first(), 'first row').toBeVisible();
            await expect.soft(overview.rowOf('DEFAULT-GROUP'), 'DEFAULT-GROUP row').toBeVisible();
        });

        await test.step('offers the page sizes 10, 15, 25, 50 and 100', async () => {
            await overview.table.pageSizeSelect.click({ force: true });
            await expect.soft(page.getByRole('option'), 'page sizes').toHaveText(['10', '15', '25', '50', '100']);
            await page.keyboard.press('Escape');
        });

        await test.step('shows the number of rows the page size allows', async () => {
            await overview.table.selectPageSize(10);
            await expect.soft(overview.table.rows, 'rows').toHaveCount(10);
            await expect.soft(overview.table.rangeLabel, 'range').toHaveText(/^\s*1\s*[–-]\s*10 of \d+\s*$/);
        });

        await test.step('moves between the first, next, previous and last page', async () => {
            await expect.soft(overview.table.previousPageButton, 'previous on the first page').toBeDisabled();
            await expect.soft(overview.table.firstPageButton, 'first on the first page').toBeDisabled();

            await overview.table.nextPageButton.click();
            await expect.soft(overview.table.rangeLabel, 'second page range').toHaveText(/^\s*11\s*[–-]\s*20 of \d+\s*$/);
            await expect.soft(overview.table.previousPageButton, 'previous on the second page').toBeEnabled();

            await overview.table.previousPageButton.click();
            await expect.soft(overview.table.rangeLabel, 'back on the first page').toHaveText(/^\s*1\s*[–-]\s*10 of \d+\s*$/);

            await overview.table.lastPageButton.click();
            await expect.soft(overview.table.nextPageButton, 'next on the last page').toBeDisabled();
            await expect.soft(overview.table.rows.first(), 'last page rows').toBeVisible();

            await overview.table.firstPageButton.click();
            await expect.soft(overview.table.rangeLabel, 'first page again').toHaveText(/^\s*1\s*[–-]\s*10 of \d+\s*$/);
        });

        await test.step('opens the creation page with the Create control', async () => {
            await overview.createButton.click();
            await expect(page).toHaveURL(/\/group\/create$/);
        });
    });

    test('checks the groups created for display', async ({ page, apiAs, uniqueName }) => {
        test.setTimeout(180_000);
        const api = apiAs('userAdministrator').userAndGroup;
        const prefix = uniqueName('overview-sort');
        const filterName = uniqueName('overview-filter');
        const literalName = `${uniqueName('overview-literal')} Žluťoučký kůň <b>x</b>`;
        const expiringName = uniqueName('overview-expiry');
        const noExpiryName = uniqueName('overview-no-expiry');
        const linkedName = `${prefix}-a`;
        const linked = await createGroup(api, {
            name: linkedName,
            description: 'charlie',
            expirationDate: daysAhead(30),
        });
        await createGroup(api, { name: `${prefix}-b`, description: 'alpha', expirationDate: daysAhead(10) });
        await createGroup(api, { name: `${prefix}-c`, description: 'bravo', expirationDate: daysAhead(20) });
        await createGroup(api, { name: filterName });
        await createGroup(api, { name: uniqueName('overview-other') });
        await createGroup(api, { name: literalName });
        await createGroup(api, { name: expiringName, expirationDate: daysAhead(40) });
        await createGroup(api, { name: noExpiryName });
        const overview = new GroupOverviewPage(page);
        await overview.open();

        await test.step('filters the list by name', async () => {
            await overview.filterBy(filterName);
            await expect.soft(overview.table.rows, 'rows').toHaveCount(1);
            await expect.soft(overview.rowOf(filterName), 'filtered row').toBeVisible();
        });

        await test.step('renders special characters and markup in a group name as literal text', async () => {
            await overview.filterBy(literalName);
            await expect.soft(overview.nameLinkOf(literalName), 'name link').toHaveText(literalName);
            await expect.soft(overview.table.root.locator('b'), 'markup elements').toHaveCount(0);
        });

        await test.step('shows the expiration date of a group as year, month and day', async () => {
            await overview.filterBy(expiringName);
            const [expiration] = await overview.table.columnTexts('Expiration Date');
            expect.soft(expiration, 'expiration date').toMatch(/^\d{4}-\d{1,2}-\d{1,2}$/);
        });

        await test.step('shows a dash for a group without expiration date', async () => {
            await overview.filterBy(noExpiryName);
            expect.soft(await overview.table.columnTexts('Expiration Date'), 'expiration column').toEqual(['-']);
        });

        await overview.filterBy(prefix);
        await expect(overview.table.rows).toHaveCount(3);

        await test.step('sorts by name in both directions', async () => {
            await overview.table.sortTo('Name', 'ascending');
            await expect
                .poll(() => overview.table.columnTexts('Name'), { message: 'ascending names' })
                .toEqual([`${prefix}-a`, `${prefix}-b`, `${prefix}-c`]);
            await overview.table.sortTo('Name', 'descending');
            await expect
                .poll(() => overview.table.columnTexts('Name'), { message: 'descending names' })
                .toEqual([`${prefix}-c`, `${prefix}-b`, `${prefix}-a`]);
        });

        await test.step('sorts by description in both directions', async () => {
            await overview.table.sortTo('Description', 'ascending');
            await expect
                .poll(() => overview.table.columnTexts('Description'), { message: 'ascending descriptions' })
                .toEqual(['alpha', 'bravo', 'charlie']);
            await overview.table.sortTo('Description', 'descending');
            await expect
                .poll(() => overview.table.columnTexts('Description'), { message: 'descending descriptions' })
                .toEqual(['charlie', 'bravo', 'alpha']);
        });

        await test.step('sorts by expiration date in both directions', async () => {
            await overview.table.sortTo('Expiration Date', 'ascending');
            await expect
                .poll(() => overview.table.columnTexts('Name'), { message: 'names by ascending expiration' })
                .toEqual([`${prefix}-b`, `${prefix}-c`, `${prefix}-a`]);
            await overview.table.sortTo('Expiration Date', 'descending');
            await expect
                .poll(() => overview.table.columnTexts('Name'), { message: 'names by descending expiration' })
                .toEqual([`${prefix}-a`, `${prefix}-c`, `${prefix}-b`]);
        });

        await test.step('opens the edit page with the row edit action', async () => {
            await overview.filterBy(linkedName);
            await overview.editActionOf(linkedName).click();
            await expect(page).toHaveURL(new RegExp(`/group/${linked.id}/edit$`));
        });

        await test.step('opens the detail page with the name link', async () => {
            await page.goBack();
            await overview.table.waitUntilLoaded();
            await overview.filterBy(linkedName);
            await overview.nameLinkOf(linkedName).click();
            await expect(page).toHaveURL(new RegExp(`/group/${linked.id}$`));
        });
    });

    test('deletes groups in bulk', async ({ page, apiAs, uniqueName }) => {
        test.setTimeout(180_000);
        const api = apiAs('userAdministrator').userAndGroup;
        const prefix = uniqueName('overview-bulk');
        await createGroup(api, { name: `${prefix}-a` });
        await createGroup(api, { name: `${prefix}-b` });
        const overview = new GroupOverviewPage(page);
        await overview.open();
        await overview.filterBy(prefix);
        await expect(overview.table.rows).toHaveCount(2);

        await test.step('labels the delete control with the number of selected rows', async () => {
            await overview.table.rowCheckbox(overview.rowOf(`${prefix}-a`)).check();
            await expect.soft(overview.deleteButton, 'one selected').toHaveText(/Delete \(1\)/);
            await overview.table.selectAllCheckbox.check();
            await expect.soft(overview.deleteButton, 'two selected').toHaveText(/Delete \(2\)/);
            await overview.table.selectAllCheckbox.uncheck();
            await expect.soft(overview.deleteButton, 'none selected').toBeDisabled();
        });

        await test.step('asks for confirmation before deleting selected groups and keeps them on cancel', async () => {
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

        await test.step('deletes the selected groups after confirmation', async () => {
            await overview.deleteButton.click();
            await new ConfirmationDialog(page, /^Remove Groups$/).confirm();

            const notification = await waitForNotification(page, 'Groups were deleted');
            expect(notification.kind).toBe('success');
            await expect(overview.table.rows).toHaveCount(0);
            expect(await findGroupByName(api, `${prefix}-a`)).toBeUndefined();
            expect(await findGroupByName(api, `${prefix}-b`)).toBeUndefined();
        });
    });

    test('deletes single groups', async ({ page, apiAs, uniqueName, checkpoint }) => {
        test.setTimeout(180_000);
        const api = apiAs('userAdministrator').userAndGroup;
        const name = uniqueName('overview-delete');
        await createGroup(api, { name });
        const overview = new GroupOverviewPage(page);
        await overview.open();
        await overview.filterBy(name);

        await test.step('asks for confirmation before deleting one group and keeps it on cancel', async () => {
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

        await test.step('deletes one group after confirmation', async () => {
            await overview.deleteActionOf(name).click();
            await new ConfirmationDialog(page, /^Remove Group$/).confirm();

            const notification = await waitForNotification(page, 'Group was deleted');
            expect(notification.kind).toBe('success');
            await expect(overview.rowOf(name)).toHaveCount(0);
            await expect(errorDialog(page)).toHaveCount(0);
            await checkpoint(page, 'group deleted');
            expect(await findGroupByName(api, name)).toBeUndefined();
        });

        await test.step('deletes a group once its members are removed and keeps those users', async () => {
            const emptiedName = uniqueName('overview-delete-members');
            const memberSubjects = MEMBER_SUBJECTS.slice(0, 3);
            const group = await createPopulatedGroup(api, { name: emptiedName, memberSubjects });
            await removeMembers(api, group.id, memberSubjects);
            await overview.open();
            await overview.filterBy(emptiedName);
            await overview.deleteActionOf(emptiedName).click();
            await new ConfirmationDialog(page, /^Remove Group$/).confirm();

            const notification = await waitForNotification(page, 'Group was deleted');
            expect(notification.kind).toBe('success');
            await expect(overview.rowOf(emptiedName)).toHaveCount(0);
            await expect(errorDialog(page)).toHaveCount(0);
            expect(await findGroupByName(api, emptiedName)).toBeUndefined();
            for (const subject of memberSubjects) {
                expect(await findUserBySubject(api, subject)).toBeDefined();
            }
        });
    });
});
