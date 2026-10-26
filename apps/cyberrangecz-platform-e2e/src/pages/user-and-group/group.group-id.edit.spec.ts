import { expect, test } from '../../support/fixtures';
import { ADMINISTRATION_LINKS, ROLES_WITHOUT_ADMINISTRATION } from '../../support/pages/user-and-group/administration-access';
import { expectRedirectedAway } from '../../support/route-guard';
import {
    createGroup,
    createPopulatedGroup,
    findGroupByName,
    GRANTABLE_ROLE_TYPES,
    MEMBER_SUBJECTS,
    memberDisplayName,
    readGroup,
    readSystemGroups,
} from '../../support/pages/user-and-group/group-data';
import { GroupEditPage } from '../../support/pages/user-and-group/group-pages';
import {
    ConfirmationDialog,
    errorDialog,
    pageTitle,
    waitForNotification,
    expectUrlWhileLoading,
} from '../../support/ui';

test.use({ account: 'userAdministrator' });

test.describe('group.group-id.edit', () => {
    test.describe('access', () => {
        for (const role of ROLES_WITHOUT_ADMINISTRATION) {
            test(`sends the ${role} account away from /group/:id/edit`, async ({ openAs, apiAs, uniqueName }) => {
                const group = await createGroup(apiAs('userAdministrator').userAndGroup, {
                    name: uniqueName(`edit-access-${role}`),
                });
                await expectRedirectedAway(openAs, role, `/group/${group.id}/edit`, { absentLinks: ADMINISTRATION_LINKS });
            });
        }

        test('sends a signed-out visitor to the login page', async ({ openAs }) => {
            const page = await openAs('anonymous');
            await page.goto('/group/1/edit');
            await expectUrlWhileLoading(page, /\/login/);
        });
    });

    test.describe('basic info', () => {
        test('shows the title and the stored values of the group', async ({
            page,
            apiAs,
            uniqueName,
            checkpoint,
        }) => {
            const name = uniqueName('edit-prefilled');
            const group = await createGroup(apiAs('userAdministrator').userAndGroup, {
                name,
                description: 'Stored description',
            });
            const form = new GroupEditPage(page);
            await form.openEdit(group.id);
            await expect(pageTitle(page)).toHaveText(`Edit ${name}`);
            await expect(form.nameInput).toHaveValue(name);
            await expect(form.descriptionInput).toHaveValue('Stored description');
            await expect(form.membersPanelHeader).not.toHaveAttribute('aria-disabled', 'true');
            await expect(form.rolesPanelHeader).not.toHaveAttribute('aria-disabled', 'true');
            await checkpoint(page, 'edit page of a stored group');
        });

        test('keeps Save disabled until a value changes', async ({ page, apiAs, uniqueName }) => {
            const group = await createGroup(apiAs('userAdministrator').userAndGroup, {
                name: uniqueName('edit-pristine'),
            });
            const form = new GroupEditPage(page);
            await form.openEdit(group.id);
            await expect(form.saveButton('edit')).toBeDisabled();
            await form.descriptionInput.fill('Changed');
            await expect(form.saveButton('edit')).toBeEnabled();
        });

        test('renames the group and confirms with a popup', async ({ page, apiAs, uniqueName }) => {
            const api = apiAs('userAdministrator').userAndGroup;
            const group = await createGroup(api, { name: uniqueName('edit-before-rename') });
            const renamed = uniqueName('edit-after-rename');
            const form = new GroupEditPage(page);
            await form.openEdit(group.id);
            await form.nameInput.fill(renamed);
            await form.saveButton('edit').click();

            const notification = await waitForNotification(page, 'Group was saved');
            expect(notification.kind).toBe('success');
            expect((await readGroup(api, group.id)).name).toBe(renamed);
        });

        test('saves a changed description', async ({ page, apiAs, uniqueName }) => {
            const api = apiAs('userAdministrator').userAndGroup;
            const group = await createGroup(api, { name: uniqueName('edit-describe') });
            const form = new GroupEditPage(page);
            await form.openEdit(group.id);
            await form.descriptionInput.fill('A new description');
            await form.saveButton('edit').click();
            await waitForNotification(page, 'Group was saved');
            expect((await readGroup(api, group.id)).description).toBe('A new description');
        });

        test('saves an expiration date picked in the calendar', async ({ page, apiAs, uniqueName }) => {
            const api = apiAs('userAdministrator').userAndGroup;
            const group = await createGroup(api, { name: uniqueName('edit-expire') });
            const form = new GroupEditPage(page);
            await form.openEdit(group.id);
            await form.pickExpirationNextMonth();
            await form.saveButton('edit').click();
            await waitForNotification(page, 'Group was saved');
            const stored = await readGroup(api, group.id);
            expect(new Date(stored.expiration_date ?? '').getTime()).toBeGreaterThan(Date.now());
        });

        test('rejects an empty name', async ({ page, apiAs, uniqueName }) => {
            const group = await createGroup(apiAs('userAdministrator').userAndGroup, {
                name: uniqueName('edit-empty-name'),
            });
            const form = new GroupEditPage(page);
            await form.openEdit(group.id);
            await form.nameInput.fill('');
            await form.nameInput.blur();
            await expect(form.nameErrors()).toHaveText('Name cannot be empty');
            await expect(form.saveButton('edit')).toBeDisabled();
        });

        test('rejects a name made only of spaces', async ({ page, apiAs, uniqueName }) => {
            const group = await createGroup(apiAs('userAdministrator').userAndGroup, {
                name: uniqueName('edit-blank-name'),
            });
            const form = new GroupEditPage(page);
            await form.openEdit(group.id);
            await form.nameInput.fill('   ');
            await form.nameInput.blur();
            await expect(form.nameErrors()).toHaveText('Name cannot be empty');
            await expect(form.saveButton('edit')).toBeDisabled();
        });

        test('rejects an empty description', async ({ page, apiAs, uniqueName }) => {
            const group = await createGroup(apiAs('userAdministrator').userAndGroup, {
                name: uniqueName('edit-empty-description'),
            });
            const form = new GroupEditPage(page);
            await form.openEdit(group.id);
            await form.descriptionInput.fill('');
            await form.descriptionInput.blur();
            await expect(form.descriptionErrors()).toHaveText('Description cannot be empty');
            await expect(form.saveButton('edit')).toBeDisabled();
        });

        test('limits the name to 255 characters', async ({ page, apiAs, uniqueName }) => {
            const group = await createGroup(apiAs('userAdministrator').userAndGroup, {
                name: uniqueName('edit-limit'),
            });
            const form = new GroupEditPage(page);
            await form.openEdit(group.id);
            await form.nameInput.fill('n'.repeat(255));
            await form.nameInput.pressSequentially('x');
            await expect(form.nameInput).toHaveValue('n'.repeat(255));
        });

        test('keeps accented letters and markup in a new name as literal text', async ({
            page,
            apiAs,
            uniqueName,
        }) => {
            const api = apiAs('userAdministrator').userAndGroup;
            const group = await createGroup(api, { name: uniqueName('edit-literal-before') });
            const renamed = `${uniqueName('edit-literal-after')} Žluťoučký kůň <b>x</b>`;
            const form = new GroupEditPage(page);
            await form.openEdit(group.id);
            await form.nameInput.fill(renamed);
            await form.saveButton('edit').click();
            await waitForNotification(page, 'Group was saved');
            expect((await readGroup(api, group.id)).name).toBe(renamed);
        });

        test('refuses a name another group already holds without exposing database text', async ({
            page,
            apiAs,
            uniqueName,
            checkpoint,
        }) => {
            const api = apiAs('userAdministrator').userAndGroup;
            const taken = uniqueName('edit-taken');
            await createGroup(api, { name: taken });
            const group = await createGroup(api, { name: uniqueName('edit-wants-taken') });
            const form = new GroupEditPage(page);
            await form.openEdit(group.id);
            await form.nameInput.fill(taken);
            await form.saveButton('edit').click();

            await expect(errorDialog(page)).toBeVisible();
            await expect(errorDialog(page)).not.toContainText(/constraint|SQL|duplicate key|violat/i);
            await checkpoint(page, 'duplicate rename refused');
        });

        test('does not let the platform groups be renamed', async ({ page, apiAs }) => {
            const [systemGroup] = await readSystemGroups(apiAs('userAdministrator').userAndGroup);
            expect(systemGroup).toBeDefined();
            const form = new GroupEditPage(page);
            await form.openEdit(systemGroup!.id);
            await expect(form.nameInput).toBeDisabled();
        });
    });

    test.describe('members', () => {
        test('lists the members of the group', async ({ page, apiAs, uniqueName }) => {
            const group = await createPopulatedGroup(apiAs('userAdministrator').userAndGroup, {
                name: uniqueName('edit-members-list'),
                memberSubjects: MEMBER_SUBJECTS.slice(0, 3),
            });
            const form = new GroupEditPage(page);
            await form.openEdit(group.id);
            await expect(form.members.table.rows).toHaveCount(3);
            for (const header of ['Id', 'Name', 'Login', 'Issuer', 'Actions']) {
                await expect(form.members.table.headerCell(header)).toBeVisible();
            }
        });

        test('shows the empty state of a group without members', async ({ page, apiAs, uniqueName }) => {
            const group = await createGroup(apiAs('userAdministrator').userAndGroup, {
                name: uniqueName('edit-members-empty'),
            });
            const form = new GroupEditPage(page);
            await form.openEdit(group.id);
            await expect(form.members.table.emptyState).toHaveText(/No users in this group yet/);
        });

        test('keeps Add disabled until a user is chosen', async ({ page, apiAs, uniqueName }) => {
            const group = await createGroup(apiAs('userAdministrator').userAndGroup, {
                name: uniqueName('edit-members-add-disabled'),
            });
            const form = new GroupEditPage(page);
            await form.openEdit(group.id);
            await expect(form.members.addButton).toBeDisabled();
            await form.members.chooseUser(MEMBER_SUBJECTS[0]);
            await expect(form.members.addButton).toBeEnabled();
        });

        test('warns about unsaved member changes once a user is chosen', async ({
            page,
            apiAs,
            uniqueName,
        }) => {
            const group = await createGroup(apiAs('userAdministrator').userAndGroup, {
                name: uniqueName('edit-members-warning'),
            });
            const form = new GroupEditPage(page);
            await form.openEdit(group.id);
            await form.members.chooseUser(MEMBER_SUBJECTS[0]);
            await expect(form.unsavedMembersWarning).toBeVisible();
        });

        test('adds a chosen user to the group', async ({ page, apiAs, uniqueName, checkpoint }) => {
            const api = apiAs('userAdministrator').userAndGroup;
            const group = await createGroup(api, { name: uniqueName('edit-members-add') });
            const form = new GroupEditPage(page);
            await form.openEdit(group.id);
            await form.members.chooseUser(MEMBER_SUBJECTS[0]);
            await form.members.addChosen();

            await expect(form.members.table.rows).toHaveCount(1);
            await expect(form.members.table.rows.first()).toContainText(MEMBER_SUBJECTS[0]);
            await checkpoint(page, 'member added');
            await expect
                .poll(async () => (await readGroup(api, group.id)).users.map((user) => user.sub))
                .toContain(MEMBER_SUBJECTS[0]);
        });

        test('offers no suggestion for a name nobody carries', async ({ page, apiAs, uniqueName }) => {
            const group = await createGroup(apiAs('userAdministrator').userAndGroup, {
                name: uniqueName('edit-members-no-match'),
            });
            const form = new GroupEditPage(page);
            await form.openEdit(group.id);
            await form.members.userSearch.fill('zzzz-nobody-0f3a9c');
            await expect(page.getByRole('option', { name: 'No results found' })).toBeVisible();
            await expect(page.getByRole('option', { disabled: false })).toHaveCount(0);
            await expect(form.members.addButton).toBeDisabled();
        });

        test('filters the assigned members', async ({ page, apiAs, uniqueName }) => {
            const group = await createPopulatedGroup(apiAs('userAdministrator').userAndGroup, {
                name: uniqueName('edit-members-filter'),
                memberSubjects: MEMBER_SUBJECTS.slice(0, 3),
            });
            const form = new GroupEditPage(page);
            await form.openEdit(group.id);
            await form.members.filterInput.fill(memberDisplayName(MEMBER_SUBJECTS[1]));
            await expect(form.members.table.rows).toHaveCount(1);
            await expect(form.members.table.rows.first()).toContainText(MEMBER_SUBJECTS[1]);
        });

        test('removes one member with the row delete action', async ({ page, apiAs, uniqueName }) => {
            const api = apiAs('userAdministrator').userAndGroup;
            const group = await createPopulatedGroup(api, {
                name: uniqueName('edit-members-remove'),
                memberSubjects: MEMBER_SUBJECTS.slice(0, 3),
            });
            const form = new GroupEditPage(page);
            await form.openEdit(group.id);
            const row = form.members.table.rowByText(MEMBER_SUBJECTS[0]);
            await form.members.table.rowAction(row, 'delete').click();
            await expect(form.members.table.rows).toHaveCount(2);
            await expect
                .poll(async () => (await readGroup(api, group.id)).users.map((user) => user.sub))
                .toHaveLength(2);
            expect((await readGroup(api, group.id)).users.map((user) => user.sub)).not.toContain(
                MEMBER_SUBJECTS[0],
            );
        });

        test('removes the selected members with the bulk delete control', async ({
            page,
            apiAs,
            uniqueName,
        }) => {
            const api = apiAs('userAdministrator').userAndGroup;
            const group = await createPopulatedGroup(api, {
                name: uniqueName('edit-members-bulk'),
                memberSubjects: MEMBER_SUBJECTS.slice(0, 3),
            });
            const form = new GroupEditPage(page);
            await form.openEdit(group.id);
            await expect(form.members.deleteButton).toBeDisabled();
            await form.members.selectAssigned(MEMBER_SUBJECTS[0]);
            await form.members.selectAssigned(MEMBER_SUBJECTS[1]);
            await expect(form.members.deleteButton).toHaveText(/Delete \(2\)/);
            await form.members.deleteButton.click();
            await expect(form.members.table.rows).toHaveCount(1);
            await expect.poll(async () => (await readGroup(api, group.id)).users.length).toBe(1);
        });

        test('starts the members sorted by name, family name first, ascending', async ({ page, apiAs, uniqueName }) => {
            const group = await createPopulatedGroup(apiAs('userAdministrator').userAndGroup, {
                name: uniqueName('edit-members-default-sort'),
                memberSubjects: MEMBER_SUBJECTS.slice(0, 3),
            });
            const form = new GroupEditPage(page);
            await form.openEdit(group.id);
            await expect(form.members.table.headerCell('Name')).toHaveAttribute('aria-sort', 'ascending');
        });

        test('sorts the members by login in both directions', async ({ page, apiAs, uniqueName }) => {
            const group = await createPopulatedGroup(apiAs('userAdministrator').userAndGroup, {
                name: uniqueName('edit-members-sort'),
                memberSubjects: MEMBER_SUBJECTS.slice(0, 4),
            });
            const form = new GroupEditPage(page);
            await form.openEdit(group.id);
            const table = form.members.table;
            await table.sortTo('Login', 'ascending');
            const ascending = await table.columnTexts('Login');
            expect(ascending).toEqual([...ascending].sort());
            await table.sortTo('Login', 'descending');
            const descending = await table.columnTexts('Login');
            expect(descending).toEqual([...ascending].reverse());
        });

        test('sorts the members by id, name and issuer', async ({ page, apiAs, uniqueName }) => {
            const group = await createPopulatedGroup(apiAs('userAdministrator').userAndGroup, {
                name: uniqueName('edit-members-sort-columns'),
                memberSubjects: MEMBER_SUBJECTS.slice(0, 4),
            });
            const form = new GroupEditPage(page);
            await form.openEdit(group.id);
            const table = form.members.table;
            await table.sortTo('Id', 'ascending');
            const ids = (await table.columnTexts('Id')).map(Number);
            expect(ids).toEqual([...ids].sort((left, right) => left - right));
            await table.sortTo('Name', 'descending');
            await table.sortTo('Issuer', 'ascending');
            await expect(table.headerCell('Issuer')).toHaveAttribute('aria-sort', 'ascending');
        });

        test('pages through eleven members ten at a time', async ({ page, apiAs, uniqueName }) => {
            const group = await createPopulatedGroup(apiAs('userAdministrator').userAndGroup, {
                name: uniqueName('edit-members-paging'),
                memberSubjects: MEMBER_SUBJECTS,
            });
            const form = new GroupEditPage(page);
            await form.openEdit(group.id);
            const table = form.members.table;
            await table.selectPageSize(10);
            await expect(table.rows).toHaveCount(10);
            await expect(table.rangeLabel).toHaveText(/^\s*1\s*[–-]\s*10 of 11\s*$/);
            await table.nextPageButton.click();
            await expect(table.rows).toHaveCount(1);
            await expect(table.nextPageButton).toBeDisabled();
            await table.previousPageButton.click();
            await expect(table.rows).toHaveCount(10);
        });

        test('imports the members of another group', async ({ page, apiAs, uniqueName }) => {
            const api = apiAs('userAdministrator').userAndGroup;
            const sourceName = uniqueName('edit-import-source');
            await createPopulatedGroup(api, { name: sourceName, memberSubjects: MEMBER_SUBJECTS.slice(0, 2) });
            const target = await createGroup(api, { name: uniqueName('edit-import-target') });
            const form = new GroupEditPage(page);
            await form.openEdit(target.id);
            await form.members.chooseGroupToImport(sourceName);
            await form.members.addChosen();
            await expect(form.members.table.rows).toHaveCount(2);
            await expect.poll(async () => (await readGroup(api, target.id)).users.length).toBe(2);
        });

        test('does not offer the edited group as a group to import', async ({ page, apiAs, uniqueName }) => {
            const api = apiAs('userAdministrator').userAndGroup;
            const group = await createGroup(api, { name: uniqueName('edit-import-self') });
            const peer = await createGroup(api, { name: `${group.name}-peer` });
            const form = new GroupEditPage(page);
            await form.openEdit(group.id);
            await form.members.groupSearch.fill(group.name);
            await expect(page.getByRole('option', { name: peer.name, exact: true })).toBeVisible();
            await expect(page.getByRole('option', { name: group.name, exact: true })).toHaveCount(0);
        });
    });

    test.describe('roles', () => {
        test('lists the roles of the group', async ({ page, apiAs, uniqueName }) => {
            const group = await createPopulatedGroup(apiAs('userAdministrator').userAndGroup, {
                name: uniqueName('edit-roles-list'),
                roleTypes: GRANTABLE_ROLE_TYPES.slice(0, 2),
            });
            const form = new GroupEditPage(page);
            await form.openEdit(group.id);
            await expect(form.roles.table.rows).toHaveCount(2);
            for (const header of ['Id', 'Microservice Id', 'Role Type', 'Microservice Name']) {
                await expect(form.roles.table.headerCell(header)).toBeVisible();
            }
        });

        test('shows the empty state of a group without roles', async ({ page, apiAs, uniqueName }) => {
            const group = await createGroup(apiAs('userAdministrator').userAndGroup, {
                name: uniqueName('edit-roles-empty'),
            });
            const form = new GroupEditPage(page);
            await form.openEdit(group.id);
            await expect(form.roles.table.emptyState).toHaveText(/No roles assigned to this group yet/);
        });

        test('keeps Add disabled until a role is chosen and warns once it is', async ({
            page,
            apiAs,
            uniqueName,
        }) => {
            const group = await createGroup(apiAs('userAdministrator').userAndGroup, {
                name: uniqueName('edit-roles-warning'),
            });
            const form = new GroupEditPage(page);
            await form.openEdit(group.id);
            await expect(form.roles.addButton).toBeDisabled();
            await form.roles.chooseRole(GRANTABLE_ROLE_TYPES[0]);
            await expect(form.roles.addButton).toBeEnabled();
            await expect(form.unsavedRolesWarning).toBeVisible();
        });

        test('adds a chosen role to the group', async ({ page, apiAs, uniqueName, checkpoint }) => {
            const api = apiAs('userAdministrator').userAndGroup;
            const group = await createGroup(api, { name: uniqueName('edit-roles-add') });
            const form = new GroupEditPage(page);
            await form.openEdit(group.id);
            await form.roles.chooseRole(GRANTABLE_ROLE_TYPES[0]);
            await form.roles.addChosen();
            await expect(form.roles.table.rows).toHaveCount(1);
            await expect(form.roles.table.rows.first()).toContainText(GRANTABLE_ROLE_TYPES[0]);
            await checkpoint(page, 'role added');
            await expect
                .poll(async () => (await readGroup(api, group.id)).roles.map((role) => role.role_type))
                .toContain(GRANTABLE_ROLE_TYPES[0]);
        });

        test('removes one role with the row delete action', async ({ page, apiAs, uniqueName }) => {
            const api = apiAs('userAdministrator').userAndGroup;
            const group = await createPopulatedGroup(api, {
                name: uniqueName('edit-roles-remove'),
                roleTypes: GRANTABLE_ROLE_TYPES.slice(0, 2),
            });
            const form = new GroupEditPage(page);
            await form.openEdit(group.id);
            const row = form.roles.table.rowByText(GRANTABLE_ROLE_TYPES[0]);
            await form.roles.table.rowAction(row, 'delete').click();
            await expect(form.roles.table.rows).toHaveCount(1);
            await expect
                .poll(async () => (await readGroup(api, group.id)).roles.map((role) => role.role_type))
                .toEqual([GRANTABLE_ROLE_TYPES[1]]);
        });

        test('removes the selected roles with the bulk delete control', async ({
            page,
            apiAs,
            uniqueName,
        }) => {
            const api = apiAs('userAdministrator').userAndGroup;
            const group = await createPopulatedGroup(api, {
                name: uniqueName('edit-roles-bulk'),
                roleTypes: GRANTABLE_ROLE_TYPES.slice(0, 3),
            });
            const form = new GroupEditPage(page);
            await form.openEdit(group.id);
            await expect(form.roles.deleteButton).toBeDisabled();
            await form.roles.selectAssigned(GRANTABLE_ROLE_TYPES[0]);
            await form.roles.selectAssigned(GRANTABLE_ROLE_TYPES[1]);
            await expect(form.roles.deleteButton).toHaveText(/Delete \(2\)/);
            await form.roles.deleteButton.click();
            await expect(form.roles.table.rows).toHaveCount(1);
            await expect.poll(async () => (await readGroup(api, group.id)).roles.length).toBe(1);
        });

        test('filters the assigned roles by role type', async ({ page, apiAs, uniqueName }) => {
            const group = await createPopulatedGroup(apiAs('userAdministrator').userAndGroup, {
                name: uniqueName('edit-roles-filter'),
                roleTypes: GRANTABLE_ROLE_TYPES.slice(0, 3),
            });
            const form = new GroupEditPage(page);
            await form.openEdit(group.id);
            await form.roles.filterInput.fill(GRANTABLE_ROLE_TYPES[2]);
            await expect(form.roles.table.rows).toHaveCount(1);
            await expect(form.roles.table.rows.first()).toContainText(GRANTABLE_ROLE_TYPES[2]);
        });

        test('sorts the assigned roles by role type in both directions', async ({
            page,
            apiAs,
            uniqueName,
        }) => {
            const group = await createPopulatedGroup(apiAs('userAdministrator').userAndGroup, {
                name: uniqueName('edit-roles-sort'),
                roleTypes: GRANTABLE_ROLE_TYPES.slice(0, 3),
            });
            const form = new GroupEditPage(page);
            await form.openEdit(group.id);
            const table = form.roles.table;
            await table.sortTo('Role Type', 'ascending');
            const ascending = await table.columnTexts('Role Type');
            expect(ascending).toEqual([...ascending].sort());
            await table.sortTo('Role Type', 'descending');
            expect(await table.columnTexts('Role Type')).toEqual([...ascending].reverse());
        });

        test('sorts the assigned roles by id', async ({ page, apiAs, uniqueName }) => {
            const group = await createPopulatedGroup(apiAs('userAdministrator').userAndGroup, {
                name: uniqueName('edit-roles-sort-id'),
                roleTypes: GRANTABLE_ROLE_TYPES.slice(0, 3),
            });
            const form = new GroupEditPage(page);
            await form.openEdit(group.id);
            await form.roles.table.sortTo('Id', 'ascending');
            const ids = (await form.roles.table.columnTexts('Id')).map(Number);
            expect(ids).toEqual([...ids].sort((left, right) => left - right));
        });
    });

    test.describe('leaving', () => {
        test('asks before leaving with unsaved details and stays on Cancel', async ({
            page,
            apiAs,
            uniqueName,
            checkpoint,
        }) => {
            const group = await createGroup(apiAs('userAdministrator').userAndGroup, {
                name: uniqueName('edit-guard-details'),
            });
            const form = new GroupEditPage(page);
            await form.openEditFromOverview(group.name);
            await form.descriptionInput.fill('Not saved');
            await page.goBack();
            const dialog = new ConfirmationDialog(page, /^Unsaved [Cc]hanges$/);
            await expect(dialog.message).toHaveText(
                'There are some unsaved changes. Do you want to leave without saving?',
            );
            await checkpoint(page, 'unsaved details dialog');
            await dialog.cancel();
            await expect(page).toHaveURL(new RegExp(`/group/${group.id}/edit$`));
            await expect(form.descriptionInput).toHaveValue('Not saved');
        });

        test('discards unsaved details after Leave', async ({ page, apiAs, uniqueName }) => {
            const api = apiAs('userAdministrator').userAndGroup;
            const group = await createGroup(api, { name: uniqueName('edit-guard-leave'), description: 'Kept' });
            const form = new GroupEditPage(page);
            await form.openEditFromOverview(group.name);
            await form.descriptionInput.fill('Thrown away');
            await page.goBack();
            await new ConfirmationDialog(page, /^Unsaved [Cc]hanges$/).confirm();
            await expect(page).toHaveURL(/\/group$/);
            expect((await readGroup(api, group.id)).description).toBe('Kept');
        });

        test('asks before leaving with a user chosen but not added', async ({ page, apiAs, uniqueName }) => {
            const group = await createGroup(apiAs('userAdministrator').userAndGroup, {
                name: uniqueName('edit-guard-members'),
            });
            const form = new GroupEditPage(page);
            await form.openEditFromOverview(group.name);
            await form.members.chooseUser(MEMBER_SUBJECTS[0]);
            await page.goBack();
            const dialog = new ConfirmationDialog(page, /^Unsaved [Cc]hanges$/);
            await expect(dialog.root).toBeVisible();
            await dialog.confirm();
            await expect(page).toHaveURL(/\/group$/);
        });

        test('asks before leaving with a role chosen but not added', async ({ page, apiAs, uniqueName }) => {
            const api = apiAs('userAdministrator').userAndGroup;
            const group = await createGroup(api, { name: uniqueName('edit-guard-roles') });
            const form = new GroupEditPage(page);
            await form.openEditFromOverview(group.name);
            await form.roles.chooseRole(GRANTABLE_ROLE_TYPES[0]);
            await page.goBack();
            const dialog = new ConfirmationDialog(page, /^Unsaved [Cc]hanges$/);
            await expect(dialog.root).toBeVisible();
            await dialog.confirm();
            await expect(page).toHaveURL(/\/group$/);
            expect((await readGroup(api, group.id)).roles).toHaveLength(0);
        });

        test('leaves without asking when nothing changed', async ({ page, apiAs, uniqueName }) => {
            const group = await createGroup(apiAs('userAdministrator').userAndGroup, {
                name: uniqueName('edit-guard-pristine'),
            });
            const form = new GroupEditPage(page);
            await form.openEditFromOverview(group.name);
            await page.goBack();
            await expect(page).toHaveURL(/\/group$/);
        });

        test('leaves without asking after saving', async ({ page, apiAs, uniqueName }) => {
            const api = apiAs('userAdministrator').userAndGroup;
            const name = uniqueName('edit-guard-saved');
            const group = await createGroup(api, { name });
            const form = new GroupEditPage(page);
            await form.openEditFromOverview(group.name);
            await form.expandInfoPanel();
            await form.descriptionInput.fill('Saved first');
            await form.saveButton('edit').click();
            await waitForNotification(page, 'Group was saved');
            await page.goBack();
            await expect(page).toHaveURL(/\/group$/);
            expect(await findGroupByName(api, name)).toBeDefined();
        });
    });
});
