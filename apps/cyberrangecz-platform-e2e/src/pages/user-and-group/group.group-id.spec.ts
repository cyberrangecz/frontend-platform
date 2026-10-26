import { expect, test } from '../../support/fixtures';
import { ADMINISTRATION_LINKS, ROLES_WITHOUT_ADMINISTRATION } from '../../support/pages/user-and-group/administration-access';
import { expectRedirectedAway } from '../../support/route-guard';
import {
    createGroup,
    createPopulatedGroup,
    daysAhead,
    GRANTABLE_ROLE_TYPES,
    MEMBER_SUBJECTS,
    memberDisplayName,
} from '../../support/pages/user-and-group/group-data';
import { GroupDetailPage } from '../../support/pages/user-and-group/group-pages';
import { breadcrumbEntries, expectUrlWhileLoading, pageTitle, waitForPageReady } from '../../support/ui';

test.use({ account: 'userAdministrator' });

test.describe('group.group-id', () => {
    test.describe('access', () => {
        for (const role of ROLES_WITHOUT_ADMINISTRATION) {
            test(`sends the ${role} account away from /group/:id`, async ({ openAs, apiAs, uniqueName }) => {
                const group = await createGroup(apiAs('userAdministrator').userAndGroup, {
                    name: uniqueName(`detail-access-${role}`),
                });
                await expectRedirectedAway(openAs, role, `/group/${group.id}`, { absentLinks: ADMINISTRATION_LINKS });
            });
        }

        test('sends a signed-out visitor to the login page', async ({ openAs }) => {
            const page = await openAs('anonymous');
            await page.goto('/group/1');
            await expectUrlWhileLoading(page, /\/login/);
        });
    });

    test.describe('summary', () => {
        test('shows the title, the breadcrumb and the group summary', async ({
            page,
            apiAs,
            uniqueName,
            checkpoint,
        }) => {
            const name = uniqueName('detail-summary');
            const group = await createPopulatedGroup(apiAs('userAdministrator').userAndGroup, {
                name,
                description: 'Summary description',
                memberSubjects: MEMBER_SUBJECTS.slice(0, 3),
                roleTypes: GRANTABLE_ROLE_TYPES.slice(0, 2),
            });
            const detail = new GroupDetailPage(page);
            await detail.open(group.id);
            await expect(pageTitle(page)).toHaveText(`Detail of ${name}`);
            await expect(breadcrumbEntries(page)).toHaveText(['Home', 'Groups', name]);
            await expect(detail.summaryCard).toContainText(name);
            await expect(detail.summaryCard).toContainText('Summary description');
            await expect(detail.summaryCard.locator('.icon-container').nth(0)).toContainText('3');
            await expect(detail.summaryCard.locator('.icon-container').nth(1)).toContainText('2');
            await checkpoint(page, 'group detail');
        });

        test('states that a group without expiration never expires', async ({ page, apiAs, uniqueName }) => {
            const group = await createGroup(apiAs('userAdministrator').userAndGroup, {
                name: uniqueName('detail-no-expiration'),
            });
            const detail = new GroupDetailPage(page);
            await detail.open(group.id);
            await expect(detail.summaryCard).toContainText('No expiration date');
        });

        test('shows the expiration date of an expiring group', async ({ page, apiAs, uniqueName }) => {
            const group = await createGroup(apiAs('userAdministrator').userAndGroup, {
                name: uniqueName('detail-expiration'),
                expirationDate: daysAhead(60),
            });
            const detail = new GroupDetailPage(page);
            await detail.open(group.id);
            await expect(detail.summaryCard).not.toContainText('No expiration date');
            await expect(detail.summaryCard.locator('.group-expiration')).toContainText(/\d{4}/);
        });

        test('shows a name with markup as literal text', async ({ page, apiAs, uniqueName }) => {
            const name = `${uniqueName('detail-literal')} Žluťoučký kůň <b>x</b>`;
            const group = await createGroup(apiAs('userAdministrator').userAndGroup, { name });
            const detail = new GroupDetailPage(page);
            await detail.open(group.id);
            await expect(detail.summaryCard.locator('.group-name')).toHaveText(name);
            await expect(detail.summaryCard.locator('b')).toHaveCount(0);
        });
    });

    test.describe('members', () => {
        test('lists the members with name, login and issuer', async ({ page, apiAs, uniqueName }) => {
            const group = await createPopulatedGroup(apiAs('userAdministrator').userAndGroup, {
                name: uniqueName('detail-members'),
                memberSubjects: MEMBER_SUBJECTS.slice(0, 3),
            });
            const detail = new GroupDetailPage(page);
            await detail.open(group.id);
            for (const header of ['Picture', 'Name', 'Login', 'Issuer']) {
                await expect(detail.membersTable.headerCell(header)).toBeVisible();
            }
            await expect(detail.membersTable.rows).toHaveCount(3);
            expect((await detail.membersTable.columnTexts('Login')).sort()).toEqual(
                [...MEMBER_SUBJECTS.slice(0, 3)].sort(),
            );
        });

        test('states that a group without members has none', async ({ page, apiAs, uniqueName }) => {
            const group = await createGroup(apiAs('userAdministrator').userAndGroup, {
                name: uniqueName('detail-members-empty'),
            });
            const detail = new GroupDetailPage(page);
            await detail.open(group.id);
            await expect(detail.membersTable.emptyState).toHaveText(/No members in this group/);
        });

        test('filters the members by name', async ({ page, apiAs, uniqueName }) => {
            const group = await createPopulatedGroup(apiAs('userAdministrator').userAndGroup, {
                name: uniqueName('detail-members-filter'),
                memberSubjects: MEMBER_SUBJECTS.slice(0, 3),
            });
            const detail = new GroupDetailPage(page);
            await detail.open(group.id);
            await detail.membersFilter.fill(memberDisplayName(MEMBER_SUBJECTS[1]));
            await expect(detail.membersTable.rows).toHaveCount(1);
            await expect(detail.membersTable.rows.first()).toContainText(MEMBER_SUBJECTS[1]);
        });

        test('states that no member matches a filter', async ({ page, apiAs, uniqueName }) => {
            const group = await createPopulatedGroup(apiAs('userAdministrator').userAndGroup, {
                name: uniqueName('detail-members-no-match'),
                memberSubjects: MEMBER_SUBJECTS.slice(0, 2),
            });
            const detail = new GroupDetailPage(page);
            await detail.open(group.id);
            await detail.membersFilter.fill('zzzz-nobody-0f3a9c');
            await expect(detail.membersTable.rows).toHaveCount(0);
            await expect(detail.membersTable.emptyState).toBeVisible();
        });

        test('starts the members sorted by name, family name first, ascending', async ({ page, apiAs, uniqueName }) => {
            const group = await createPopulatedGroup(apiAs('userAdministrator').userAndGroup, {
                name: uniqueName('detail-members-default-sort'),
                memberSubjects: MEMBER_SUBJECTS.slice(0, 3),
            });
            const detail = new GroupDetailPage(page);
            await detail.open(group.id);
            await expect(detail.membersTable.headerCell('Name')).toHaveAttribute('aria-sort', 'ascending');
        });

        test('sorts the members by login in both directions', async ({ page, apiAs, uniqueName }) => {
            const group = await createPopulatedGroup(apiAs('userAdministrator').userAndGroup, {
                name: uniqueName('detail-members-sort'),
                memberSubjects: MEMBER_SUBJECTS.slice(0, 4),
            });
            const detail = new GroupDetailPage(page);
            await detail.open(group.id);
            await detail.membersTable.sortTo('Login', 'ascending');
            const ascending = await detail.membersTable.columnTexts('Login');
            expect(ascending).toEqual([...ascending].sort());
            await detail.membersTable.sortTo('Login', 'descending');
            expect(await detail.membersTable.columnTexts('Login')).toEqual([...ascending].reverse());
        });

        test('marks the sorted name and issuer columns', async ({ page, apiAs, uniqueName }) => {
            const group = await createPopulatedGroup(apiAs('userAdministrator').userAndGroup, {
                name: uniqueName('detail-members-sort-marks'),
                memberSubjects: MEMBER_SUBJECTS.slice(0, 3),
            });
            const detail = new GroupDetailPage(page);
            await detail.open(group.id);
            await detail.membersTable.sortTo('Name', 'descending');
            await detail.membersTable.sortTo('Issuer', 'ascending');
            await expect(detail.membersTable.headerCell('Issuer')).toHaveAttribute('aria-sort', 'ascending');
        });

        test('pages through eleven members ten at a time', async ({ page, apiAs, uniqueName }) => {
            const group = await createPopulatedGroup(apiAs('userAdministrator').userAndGroup, {
                name: uniqueName('detail-members-paging'),
                memberSubjects: MEMBER_SUBJECTS,
            });
            const detail = new GroupDetailPage(page);
            await detail.open(group.id);
            const table = detail.membersTable;
            await table.selectPageSize(10);
            await expect(table.rows).toHaveCount(10);
            await expect(table.rangeLabel).toHaveText(/^\s*1\s*[–-]\s*10 of 11\s*$/);
            await table.nextPageButton.click();
            await expect(table.rows).toHaveCount(1);
            await expect(table.nextPageButton).toBeDisabled();
            await table.firstPageButton.click();
            await expect(table.rows).toHaveCount(10);
        });
    });

    test.describe('roles', () => {
        test('lists the roles with type and microservice', async ({ page, apiAs, uniqueName }) => {
            const group = await createPopulatedGroup(apiAs('userAdministrator').userAndGroup, {
                name: uniqueName('detail-roles'),
                roleTypes: GRANTABLE_ROLE_TYPES.slice(0, 3),
            });
            const detail = new GroupDetailPage(page);
            await detail.open(group.id);
            for (const header of ['Role Type', 'Microservice Name']) {
                await expect(detail.rolesTable.headerCell(header)).toBeVisible();
            }
            expect((await detail.rolesTable.columnTexts('Role Type')).sort()).toEqual(
                [...GRANTABLE_ROLE_TYPES.slice(0, 3)].sort(),
            );
        });

        test('states that a group without roles has none', async ({ page, apiAs, uniqueName }) => {
            const group = await createGroup(apiAs('userAdministrator').userAndGroup, {
                name: uniqueName('detail-roles-empty'),
            });
            const detail = new GroupDetailPage(page);
            await detail.open(group.id);
            await expect(detail.rolesTable.emptyState).toHaveText(/No roles assigned to this group/);
        });

        test('filters the roles by role type', async ({ page, apiAs, uniqueName }) => {
            const group = await createPopulatedGroup(apiAs('userAdministrator').userAndGroup, {
                name: uniqueName('detail-roles-filter'),
                roleTypes: GRANTABLE_ROLE_TYPES.slice(0, 3),
            });
            const detail = new GroupDetailPage(page);
            await detail.open(group.id);
            await detail.rolesFilter.fill(GRANTABLE_ROLE_TYPES[1]);
            await expect(detail.rolesTable.rows).toHaveCount(1);
            await expect(detail.rolesTable.rows.first()).toContainText(GRANTABLE_ROLE_TYPES[1]);
        });

        test('states that no role matches a filter', async ({ page, apiAs, uniqueName }) => {
            const group = await createPopulatedGroup(apiAs('userAdministrator').userAndGroup, {
                name: uniqueName('detail-roles-no-match'),
                roleTypes: GRANTABLE_ROLE_TYPES.slice(0, 2),
            });
            const detail = new GroupDetailPage(page);
            await detail.open(group.id);
            await detail.rolesFilter.fill('ZZZZ_NO_SUCH_ROLE');
            await expect(detail.rolesTable.rows).toHaveCount(0);
            await expect(detail.rolesTable.emptyState).toBeVisible();
        });

        test('sorts the roles by role type in both directions', async ({ page, apiAs, uniqueName }) => {
            const group = await createPopulatedGroup(apiAs('userAdministrator').userAndGroup, {
                name: uniqueName('detail-roles-sort'),
                roleTypes: GRANTABLE_ROLE_TYPES.slice(0, 3),
            });
            const detail = new GroupDetailPage(page);
            await detail.open(group.id);
            await detail.rolesTable.sortTo('Role Type', 'ascending');
            const ascending = await detail.rolesTable.columnTexts('Role Type');
            expect(ascending).toEqual([...ascending].sort());
            await detail.rolesTable.sortTo('Role Type', 'descending');
            expect(await detail.rolesTable.columnTexts('Role Type')).toEqual([...ascending].reverse());
        });

        test('expands a role to show its description', async ({ page, apiAs, uniqueName, checkpoint }) => {
            const group = await createPopulatedGroup(apiAs('userAdministrator').userAndGroup, {
                name: uniqueName('detail-roles-expand'),
                roleTypes: [GRANTABLE_ROLE_TYPES[0]],
            });
            const detail = new GroupDetailPage(page);
            await detail.open(group.id);
            const table = detail.rolesTable;
            await table.expandButton(table.rows.first()).click();
            await expect(table.expandedDetails).toHaveCount(1);
            await expect(table.expandedDetails).toContainText('Description:');
            await checkpoint(page, 'role expanded');
            await table.expandButton(table.rows.first()).click();
            await expect(table.expandedDetails).toHaveCount(0);
        });

        test('states that a role without description has none', async ({ page, apiAs, uniqueName }) => {
            const group = await createPopulatedGroup(apiAs('userAdministrator').userAndGroup, {
                name: uniqueName('detail-roles-no-description'),
                roleTypes: ['ROLE_SANDBOX-SERVICE_TRAINEE'],
            });
            const detail = new GroupDetailPage(page);
            await detail.open(group.id);
            await detail.rolesTable.expandButton(detail.rolesTable.rows.first()).click();
            await expect(detail.rolesTable.expandedDetails).toContainText('No description.');
        });
    });

    test.describe('unknown group', () => {
        test('shows no raw exception text for a group id that is not a number', async ({ page }) => {
            await page.goto('/group/not-a-number');
            await waitForPageReady(page);
            await expect(page.locator('body')).not.toContainText(/exception|NaN|undefined|\[object/i);
        });
    });
});
