import { expect, test } from '../../support/fixtures';
import {
    createGroup,
    createPopulatedGroup,
    daysAhead,
    GRANTABLE_ROLE_TYPES,
    MEMBER_SUBJECTS,
    memberDisplayName,
} from '../../support/pages/user-and-group/group-data';
import { GroupDetailPage } from '../../support/pages/user-and-group/group-pages';
import { breadcrumbEntries, pageTitle, waitForPageReady } from '../../support/ui';

test.use({ account: 'userAdministrator' });

test.describe('group.group-id', () => {
    test('checks the summary and the members of a group', async ({ page, apiAs, uniqueName, checkpoint }) => {
        test.setTimeout(180_000);
        const api = apiAs('userAdministrator').userAndGroup;
        const name = uniqueName('detail-summary');
        const memberSubjects = MEMBER_SUBJECTS.slice(0, 4);
        const group = await createPopulatedGroup(api, {
            name,
            description: 'Summary description',
            memberSubjects,
            roleTypes: GRANTABLE_ROLE_TYPES.slice(0, 2),
        });
        const pagedGroup = await createPopulatedGroup(api, {
            name: uniqueName('detail-members-paging'),
            memberSubjects: MEMBER_SUBJECTS,
        });
        const detail = new GroupDetailPage(page);
        await detail.open(group.id);

        await test.step('shows the title, the breadcrumb and the group summary', async () => {
            await expect.soft(pageTitle(page), 'page title').toHaveText(`Detail of ${name}`);
            await expect.soft(breadcrumbEntries(page), 'breadcrumb').toHaveText(['Home', 'Groups', name]);
            await expect.soft(detail.summaryCard, 'name in summary').toContainText(name);
            await expect.soft(detail.summaryCard, 'description in summary').toContainText('Summary description');
            await expect.soft(detail.summaryCard.locator('.icon-container').nth(0), 'member count').toContainText('4');
            await expect.soft(detail.summaryCard.locator('.icon-container').nth(1), 'role count').toContainText('2');
            await checkpoint(page, 'group detail');
        });

        await test.step('lists the members with name, login and issuer', async () => {
            for (const header of ['Picture', 'Name', 'Login', 'Issuer']) {
                await expect.soft(detail.membersTable.headerCell(header), `column ${header}`).toBeVisible();
            }
            await expect.soft(detail.membersTable.rows, 'member rows').toHaveCount(memberSubjects.length);
            expect.soft((await detail.membersTable.columnTexts('Login')).sort(), 'logins').toEqual([...memberSubjects].sort());
        });

        await test.step('starts the members sorted by name, family name first, ascending', async () => {
            await expect.soft(detail.membersTable.headerCell('Name'), 'Name column sort').toHaveAttribute('aria-sort', 'ascending');
        });

        await test.step('filters the members by name', async () => {
            await detail.membersFilter.fill(memberDisplayName(MEMBER_SUBJECTS[1]));
            await expect.soft(detail.membersTable.rows, 'rows').toHaveCount(1);
            await expect.soft(detail.membersTable.rows.first(), 'matching row').toContainText(MEMBER_SUBJECTS[1]);
        });

        await test.step('states that no member matches a filter', async () => {
            await detail.membersFilter.fill('zzzz-nobody-0f3a9c');
            await expect.soft(detail.membersTable.rows, 'rows').toHaveCount(0);
            await expect.soft(detail.membersTable.emptyState, 'empty state').toBeVisible();
            await detail.membersFilter.fill('');
            await expect(detail.membersTable.rows).toHaveCount(memberSubjects.length);
        });

        await test.step('pages through eleven members ten at a time', async () => {
            await detail.open(pagedGroup.id);
            const table = detail.membersTable;
            await table.selectPageSize(10);
            await expect.soft(table.rows, 'first page rows').toHaveCount(10);
            await expect.soft(table.rangeLabel, 'first page range').toHaveText(/^\s*1\s*[–-]\s*10 of 11\s*$/);
            await table.nextPageButton.click();
            await expect.soft(table.rows, 'second page rows').toHaveCount(1);
            await expect.soft(table.nextPageButton, 'next on the last page').toBeDisabled();
            await table.firstPageButton.click();
            await expect.soft(table.rows, 'first page rows again').toHaveCount(10);
        });

        await test.step('sorts the members by login in both directions', async () => {
            await detail.open(group.id);
            await detail.membersTable.sortTo('Login', 'ascending');
            const ascending = await detail.membersTable.columnTexts('Login');
            expect.soft(ascending, 'ascending logins').toEqual([...ascending].sort());
            await detail.membersTable.sortTo('Login', 'descending');
            expect.soft(await detail.membersTable.columnTexts('Login'), 'descending logins').toEqual([...ascending].reverse());
        });

        await test.step('marks the sorted name and issuer columns', async () => {
            await detail.membersTable.sortTo('Name', 'descending');
            await detail.membersTable.sortTo('Issuer', 'ascending');
            await expect.soft(detail.membersTable.headerCell('Issuer'), 'Issuer column sort').toHaveAttribute('aria-sort', 'ascending');
        });
    });

    test('checks the roles of a group', async ({ page, apiAs, uniqueName, checkpoint }) => {
        const group = await createPopulatedGroup(apiAs('userAdministrator').userAndGroup, {
            name: uniqueName('detail-roles'),
            roleTypes: GRANTABLE_ROLE_TYPES,
        });
        const detail = new GroupDetailPage(page);
        const table = detail.rolesTable;
        await detail.open(group.id);

        await test.step('lists the roles with type and microservice', async () => {
            for (const header of ['Role Type', 'Microservice Name']) {
                await expect.soft(table.headerCell(header), `column ${header}`).toBeVisible();
            }
            expect.soft((await table.columnTexts('Role Type')).sort(), 'role types').toEqual([...GRANTABLE_ROLE_TYPES].sort());
        });

        await test.step('sorts the roles by role type in both directions', async () => {
            await table.sortTo('Role Type', 'ascending');
            const ascending = await table.columnTexts('Role Type');
            expect.soft(ascending, 'ascending role types').toEqual([...ascending].sort());
            await table.sortTo('Role Type', 'descending');
            expect.soft(await table.columnTexts('Role Type'), 'descending role types').toEqual([...ascending].reverse());
        });

        await test.step('expands a role to show its description', async () => {
            const row = table.rowByText(GRANTABLE_ROLE_TYPES[0]);
            await table.expandButton(row).click();
            await expect.soft(table.expandedDetails, 'expanded details').toHaveCount(1);
            await expect.soft(table.expandedDetails, 'description label').toContainText('Description:');
            await checkpoint(page, 'role expanded');
            await table.expandButton(row).click();
            await expect.soft(table.expandedDetails, 'collapsed details').toHaveCount(0);
        });

        await test.step('states that a role without description has none', async () => {
            await table.expandButton(table.rowByText('ROLE_SANDBOX-SERVICE_TRAINEE')).click();
            await expect.soft(table.expandedDetails, 'expanded details').toContainText('No description.');
        });

        await test.step('filters the roles by role type', async () => {
            await detail.rolesFilter.fill(GRANTABLE_ROLE_TYPES[1]);
            await expect.soft(table.rows, 'rows').toHaveCount(1);
            await expect.soft(table.rows.first(), 'matching row').toContainText(GRANTABLE_ROLE_TYPES[1]);
        });

        await test.step('states that no role matches a filter', async () => {
            await detail.rolesFilter.fill('ZZZZ_NO_SUCH_ROLE');
            await expect.soft(table.rows, 'rows').toHaveCount(0);
            await expect.soft(table.emptyState, 'empty state').toBeVisible();
        });
    });

    test('checks empty groups, expiration, markup and an unknown group', async ({ page, apiAs, uniqueName }) => {
        const api = apiAs('userAdministrator').userAndGroup;
        const emptyGroup = await createGroup(api, { name: uniqueName('detail-empty') });
        const markupName = `${uniqueName('detail-literal')} Žluťoučký kůň <b>x</b>`;
        const expiringGroup = await createGroup(api, { name: markupName, expirationDate: daysAhead(60) });
        const detail = new GroupDetailPage(page);
        await detail.open(emptyGroup.id);

        await test.step('states that a group without expiration never expires', async () => {
            await expect.soft(detail.summaryCard, 'summary').toContainText('No expiration date');
        });

        await test.step('states that a group without members has none', async () => {
            await expect.soft(detail.membersTable.emptyState, 'members empty state').toHaveText(/No members in this group/);
        });

        await test.step('states that a group without roles has none', async () => {
            await expect.soft(detail.rolesTable.emptyState, 'roles empty state').toHaveText(/No roles assigned to this group/);
        });

        await detail.open(expiringGroup.id);

        await test.step('shows the expiration date of an expiring group', async () => {
            await expect.soft(detail.summaryCard, 'summary').not.toContainText('No expiration date');
            await expect.soft(detail.summaryCard.locator('.group-expiration'), 'expiration').toContainText(/\d{4}/);
        });

        await test.step('shows a name with markup as literal text', async () => {
            await expect.soft(detail.summaryCard.locator('.group-name'), 'group name').toHaveText(markupName);
            await expect.soft(detail.summaryCard.locator('b'), 'markup elements').toHaveCount(0);
        });

        await test.step('shows no raw exception text for a group id that is not a number', async () => {
            await page.goto('/group/not-a-number');
            await waitForPageReady(page);
            await expect.soft(page.locator('body'), 'page text').not.toContainText(/exception|NaN|undefined|\[object/i);
        });
    });
});
