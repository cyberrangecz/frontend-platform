import { expect, test } from '../../support/fixtures';
import {
    createGroup,
    createPopulatedGroup,
    GRANTABLE_ROLE_TYPES,
    MEMBER_SUBJECTS,
    memberDisplayName,
    readGroup,
    readSystemGroups,
} from '../../support/pages/user-and-group/group-data';
import { GroupEditPage } from '../../support/pages/user-and-group/group-pages';
import { ConfirmationDialog, errorDialog, pageTitle, waitForNotification } from '../../support/ui';

test.use({ account: 'userAdministrator' });

test.describe('group.group-id.edit', () => {
    test('edits the basic info of a group', async ({ page, apiAs, uniqueName, checkpoint }) => {
        test.setTimeout(240_000);
        const api = apiAs('userAdministrator').userAndGroup;
        const originalName = uniqueName('edit-prefilled');
        const takenName = uniqueName('edit-taken');
        const group = await createGroup(api, { name: originalName, description: 'Stored description' });
        await createGroup(api, { name: takenName });
        const form = new GroupEditPage(page);
        await form.openEdit(group.id);

        await test.step('shows the title and the stored values of the group', async () => {
            await expect.soft(pageTitle(page), 'page title').toHaveText(`Edit ${originalName}`);
            await expect.soft(form.nameInput, 'stored name').toHaveValue(originalName);
            await expect.soft(form.descriptionInput, 'stored description').toHaveValue('Stored description');
            await expect.soft(form.membersPanelHeader, 'members panel').not.toHaveAttribute('aria-disabled', 'true');
            await expect.soft(form.rolesPanelHeader, 'roles panel').not.toHaveAttribute('aria-disabled', 'true');
            await checkpoint(page, 'edit page of a stored group');
        });

        await test.step('keeps Save disabled until a value changes', async () => {
            await expect.soft(form.saveButton('edit'), 'Save while pristine').toBeDisabled();
            await form.descriptionInput.fill('Changed');
            await expect.soft(form.saveButton('edit'), 'Save after a change').toBeEnabled();
        });

        await test.step('rejects an empty name', async () => {
            await form.nameInput.fill('');
            await form.nameInput.blur();
            await expect.soft(form.nameErrors(), 'name error').toHaveText('Name cannot be empty');
            await expect.soft(form.saveButton('edit'), 'Save').toBeDisabled();
        });

        await test.step('rejects a name made only of spaces', async () => {
            await form.nameInput.fill('   ');
            await form.nameInput.blur();
            await expect.soft(form.nameErrors(), 'name error').toHaveText('Name cannot be empty');
            await expect.soft(form.saveButton('edit'), 'Save').toBeDisabled();
            await form.nameInput.fill(originalName);
        });

        await test.step('rejects an empty description', async () => {
            await form.descriptionInput.fill('');
            await form.descriptionInput.blur();
            await expect.soft(form.descriptionErrors(), 'description error').toHaveText('Description cannot be empty');
            await expect.soft(form.saveButton('edit'), 'Save').toBeDisabled();
            await form.descriptionInput.fill('Stored description');
        });

        await test.step('limits the name to 255 characters', async () => {
            await form.nameInput.fill('n'.repeat(255));
            await form.nameInput.pressSequentially('x');
            await expect.soft(form.nameInput, 'name value').toHaveValue('n'.repeat(255));
        });

        await test.step('renames the group and confirms with a popup', async () => {
            const renamed = uniqueName('edit-after-rename');
            await form.nameInput.fill(renamed);
            await form.saveButton('edit').click();

            const notification = await waitForNotification(page, 'Group was saved');
            expect(notification.kind).toBe('success');
            await expect.poll(async () => (await readGroup(api, group.id)).name, { message: 'stored name' }).toBe(renamed);
        });

        await test.step('keeps accented letters and markup in a new name as literal text', async () => {
            const renamed = `${uniqueName('edit-literal-after')} Žluťoučký kůň <b>x</b>`;
            await form.nameInput.fill(renamed);
            await form.saveButton('edit').click();
            await waitForNotification(page, 'Group was saved');
            await expect.poll(async () => (await readGroup(api, group.id)).name, { message: 'stored name' }).toBe(renamed);
        });

        await test.step('saves a changed description', async () => {
            await form.descriptionInput.fill('A new description');
            await form.saveButton('edit').click();
            await waitForNotification(page, 'Group was saved');
            await expect
                .poll(async () => (await readGroup(api, group.id)).description, { message: 'stored description' })
                .toBe('A new description');
        });

        await test.step('saves an expiration date picked in the calendar', async () => {
            await form.pickExpirationNextMonth();
            await form.saveButton('edit').click();
            await waitForNotification(page, 'Group was saved');
            await expect
                .poll(async () => new Date((await readGroup(api, group.id)).expiration_date ?? '').getTime(), {
                    message: 'stored expiration moment',
                })
                .toBeGreaterThan(Date.now());
        });

        await test.step('does not let the platform groups be renamed', async () => {
            const [systemGroup] = await readSystemGroups(api);
            expect(systemGroup).toBeDefined();
            await form.openEdit(systemGroup!.id);
            await expect(form.nameInput).toBeDisabled();
        });

        await test.step('refuses a name another group already holds without exposing database text', async () => {
            await form.openEdit(group.id);
            await form.nameInput.fill(takenName);
            await form.saveButton('edit').click();

            await expect(errorDialog(page)).toBeVisible();
            await expect(errorDialog(page)).not.toContainText(/constraint|SQL|duplicate key|violat/i);
            await checkpoint(page, 'duplicate rename refused');
        });
    });

    test('edits the members of a group', async ({ page, apiAs, uniqueName, checkpoint }) => {
        test.setTimeout(300_000);
        const api = apiAs('userAdministrator').userAndGroup;
        const memberSubjects = MEMBER_SUBJECTS.slice(0, 4);
        const group = await createPopulatedGroup(api, { name: uniqueName('edit-members'), memberSubjects });
        const sourceName = uniqueName('edit-import-source');
        await createPopulatedGroup(api, { name: sourceName, memberSubjects: MEMBER_SUBJECTS.slice(4, 6) });
        const peer = await createGroup(api, { name: `${group.name}-peer` });
        const pagedGroup = await createPopulatedGroup(api, {
            name: uniqueName('edit-members-paging'),
            memberSubjects: MEMBER_SUBJECTS,
        });
        const storedMembers = async (): Promise<string[]> =>
            (await readGroup(api, group.id)).users.map((user) => user.sub);
        const form = new GroupEditPage(page);
        const table = form.members.table;
        await form.openEdit(group.id);

        await test.step('lists the members of the group', async () => {
            await expect.soft(table.rows, 'member rows').toHaveCount(memberSubjects.length);
            for (const header of ['Id', 'Name', 'Login', 'Issuer', 'Actions']) {
                await expect.soft(table.headerCell(header), `column ${header}`).toBeVisible();
            }
        });

        await test.step('starts the members sorted by name, family name first, ascending', async () => {
            await expect.soft(table.headerCell('Name'), 'Name column sort').toHaveAttribute('aria-sort', 'ascending');
        });

        await test.step('filters the assigned members', async () => {
            await form.members.filterInput.fill(memberDisplayName(MEMBER_SUBJECTS[1]));
            await expect.soft(table.rows, 'rows').toHaveCount(1);
            await expect.soft(table.rows.first(), 'matching row').toContainText(MEMBER_SUBJECTS[1]);
            await form.members.filterInput.fill('');
            await expect(table.rows).toHaveCount(memberSubjects.length);
        });

        await test.step('sorts the members by login in both directions', async () => {
            await table.sortTo('Login', 'ascending');
            const ascending = await table.columnTexts('Login');
            expect.soft(ascending, 'ascending logins').toEqual([...ascending].sort());
            await table.sortTo('Login', 'descending');
            expect.soft(await table.columnTexts('Login'), 'descending logins').toEqual([...ascending].reverse());
        });

        await test.step('sorts the members by id, name and issuer', async () => {
            await table.sortTo('Id', 'ascending');
            const ids = (await table.columnTexts('Id')).map(Number);
            expect.soft(ids, 'ascending ids').toEqual([...ids].sort((left, right) => left - right));
            await table.sortTo('Name', 'descending');
            await table.sortTo('Issuer', 'ascending');
            await expect.soft(table.headerCell('Issuer'), 'Issuer column sort').toHaveAttribute('aria-sort', 'ascending');
        });

        await test.step('removes one member with the row delete action', async () => {
            await table.rowAction(table.rowByText(MEMBER_SUBJECTS[0]), 'delete').click();
            await expect(table.rows).toHaveCount(3);
            await expect.poll(storedMembers, { message: 'stored members' }).toHaveLength(3);
            expect(await storedMembers()).not.toContain(MEMBER_SUBJECTS[0]);
        });

        await test.step('removes the selected members with the bulk delete control', async () => {
            await expect(form.members.deleteButton).toBeDisabled();
            await form.members.selectAssigned(MEMBER_SUBJECTS[1]);
            await form.members.selectAssigned(MEMBER_SUBJECTS[2]);
            await expect(form.members.deleteButton).toHaveText(/Delete \(2\)/);
            await form.members.deleteButton.click();
            await expect(table.rows).toHaveCount(1);
            await expect.poll(storedMembers, { message: 'stored members' }).toHaveLength(1);
        });

        await test.step('shows the empty state of a group without members', async () => {
            await table.rowAction(table.rowByText(MEMBER_SUBJECTS[3]), 'delete').click();
            await expect.poll(storedMembers, { message: 'stored members' }).toHaveLength(0);
            await expect(table.emptyState).toHaveText(/No users in this group yet/);
        });

        await test.step('offers no suggestion for a name nobody carries', async () => {
            await form.members.userSearch.fill('zzzz-nobody-0f3a9c');
            await expect(page.getByRole('option', { name: 'No results found' })).toBeVisible();
            await expect(page.getByRole('option', { disabled: false })).toHaveCount(0);
            await expect(form.members.addButton).toBeDisabled();
        });

        await test.step('keeps Add disabled until a user is chosen', async () => {
            await form.members.userSearch.fill('');
            await page.keyboard.press('Escape');
            await expect(form.members.addButton).toBeDisabled();
            await form.members.chooseUser(MEMBER_SUBJECTS[0]);
            await expect(form.members.addButton).toBeEnabled();
        });

        await test.step('warns about unsaved member changes once a user is chosen', async () => {
            await expect(form.unsavedMembersWarning).toBeVisible();
        });

        await test.step('adds a chosen user to the group', async () => {
            await form.members.addChosen();

            await expect(table.rows).toHaveCount(1);
            await expect(table.rows.first()).toContainText(MEMBER_SUBJECTS[0]);
            await checkpoint(page, 'member added');
            await expect.poll(storedMembers, { message: 'stored members' }).toContain(MEMBER_SUBJECTS[0]);
        });

        await test.step('does not offer the edited group as a group to import', async () => {
            await form.members.groupSearch.fill(group.name);
            await expect(page.getByRole('option', { name: peer.name, exact: true })).toBeVisible();
            await expect(page.getByRole('option', { name: group.name, exact: true })).toHaveCount(0);
        });

        await test.step('imports the members of another group', async () => {
            await form.members.chooseGroupToImport(sourceName);
            await form.members.addChosen();
            await expect(table.rows).toHaveCount(3);
            await expect.poll(storedMembers, { message: 'stored members' }).toHaveLength(3);
        });

        await test.step('pages through eleven members ten at a time', async () => {
            await form.openEdit(pagedGroup.id);
            await table.selectPageSize(10);
            await expect(table.rows).toHaveCount(10);
            await expect(table.rangeLabel).toHaveText(/^\s*1\s*[–-]\s*10 of 11\s*$/);
            await table.nextPageButton.click();
            await expect(table.rows).toHaveCount(1);
            await expect(table.nextPageButton).toBeDisabled();
            await table.previousPageButton.click();
            await expect(table.rows).toHaveCount(10);
        });
    });

    test('edits the roles of a group', async ({ page, apiAs, uniqueName, checkpoint }) => {
        test.setTimeout(240_000);
        const api = apiAs('userAdministrator').userAndGroup;
        const group = await createPopulatedGroup(api, {
            name: uniqueName('edit-roles'),
            roleTypes: GRANTABLE_ROLE_TYPES,
        });
        const storedRoles = async (): Promise<string[]> =>
            (await readGroup(api, group.id)).roles.map((role) => role.role_type);
        const form = new GroupEditPage(page);
        const table = form.roles.table;
        await form.openEdit(group.id);

        await test.step('lists the roles of the group', async () => {
            await expect.soft(table.rows, 'role rows').toHaveCount(GRANTABLE_ROLE_TYPES.length);
            for (const header of ['Id', 'Microservice Id', 'Role Type', 'Microservice Name']) {
                await expect.soft(table.headerCell(header), `column ${header}`).toBeVisible();
            }
        });

        await test.step('filters the assigned roles by role type', async () => {
            await form.roles.filterInput.fill(GRANTABLE_ROLE_TYPES[2]);
            await expect.soft(table.rows, 'rows').toHaveCount(1);
            await expect.soft(table.rows.first(), 'matching row').toContainText(GRANTABLE_ROLE_TYPES[2]);
            await form.roles.filterInput.fill('');
            await expect(table.rows).toHaveCount(GRANTABLE_ROLE_TYPES.length);
        });

        await test.step('sorts the assigned roles by role type in both directions', async () => {
            await table.sortTo('Role Type', 'ascending');
            const ascending = await table.columnTexts('Role Type');
            expect.soft(ascending, 'ascending role types').toEqual([...ascending].sort());
            await table.sortTo('Role Type', 'descending');
            expect.soft(await table.columnTexts('Role Type'), 'descending role types').toEqual([...ascending].reverse());
        });

        await test.step('sorts the assigned roles by id', async () => {
            await table.sortTo('Id', 'ascending');
            const ids = (await table.columnTexts('Id')).map(Number);
            expect.soft(ids, 'ascending ids').toEqual([...ids].sort((left, right) => left - right));
        });

        await test.step('removes one role with the row delete action', async () => {
            await table.rowAction(table.rowByText(GRANTABLE_ROLE_TYPES[0]), 'delete').click();
            await expect(table.rows).toHaveCount(3);
            await expect
                .poll(async () => (await storedRoles()).sort(), { message: 'stored roles' })
                .toEqual([...GRANTABLE_ROLE_TYPES.slice(1)].sort());
        });

        await test.step('removes the selected roles with the bulk delete control', async () => {
            await expect(form.roles.deleteButton).toBeDisabled();
            await form.roles.selectAssigned(GRANTABLE_ROLE_TYPES[1]);
            await form.roles.selectAssigned(GRANTABLE_ROLE_TYPES[2]);
            await expect(form.roles.deleteButton).toHaveText(/Delete \(2\)/);
            await form.roles.deleteButton.click();
            await expect(table.rows).toHaveCount(1);
            await expect.poll(storedRoles, { message: 'stored roles' }).toHaveLength(1);
        });

        await test.step('shows the empty state of a group without roles', async () => {
            await table.rowAction(table.rowByText(GRANTABLE_ROLE_TYPES[3]), 'delete').click();
            await expect.poll(storedRoles, { message: 'stored roles' }).toHaveLength(0);
            await expect(table.emptyState).toHaveText(/No roles assigned to this group yet/);
        });

        await test.step('keeps Add disabled until a role is chosen and warns once it is', async () => {
            await expect(form.roles.addButton).toBeDisabled();
            await form.roles.chooseRole(GRANTABLE_ROLE_TYPES[0]);
            await expect(form.roles.addButton).toBeEnabled();
            await expect(form.unsavedRolesWarning).toBeVisible();
        });

        await test.step('adds a chosen role to the group', async () => {
            await form.roles.addChosen();
            await expect(table.rows).toHaveCount(1);
            await expect(table.rows.first()).toContainText(GRANTABLE_ROLE_TYPES[0]);
            await checkpoint(page, 'role added');
            await expect.poll(storedRoles, { message: 'stored roles' }).toContain(GRANTABLE_ROLE_TYPES[0]);
        });
    });

    test('guards leaving the edit page', async ({ page, apiAs, uniqueName, checkpoint }) => {
        test.setTimeout(240_000);
        const api = apiAs('userAdministrator').userAndGroup;
        const group = await createGroup(api, { name: uniqueName('edit-guard'), description: 'Kept' });
        const form = new GroupEditPage(page);

        await test.step('asks before leaving with unsaved details and stays on Cancel', async () => {
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

        await test.step('discards unsaved details after Leave', async () => {
            await form.openEditFromOverview(group.name);
            await form.descriptionInput.fill('Thrown away');
            await page.goBack();
            await new ConfirmationDialog(page, /^Unsaved [Cc]hanges$/).confirm();
            await expect(page).toHaveURL(/\/group$/);
            expect((await readGroup(api, group.id)).description).toBe('Kept');
        });

        await test.step('asks before leaving with a user chosen but not added', async () => {
            await form.openEditFromOverview(group.name);
            await form.members.chooseUser(MEMBER_SUBJECTS[0]);
            await page.goBack();
            const dialog = new ConfirmationDialog(page, /^Unsaved [Cc]hanges$/);
            await expect(dialog.root).toBeVisible();
            await dialog.confirm();
            await expect(page).toHaveURL(/\/group$/);
        });

        await test.step('asks before leaving with a role chosen but not added', async () => {
            await form.openEditFromOverview(group.name);
            await form.roles.chooseRole(GRANTABLE_ROLE_TYPES[0]);
            await page.goBack();
            const dialog = new ConfirmationDialog(page, /^Unsaved [Cc]hanges$/);
            await expect(dialog.root).toBeVisible();
            await dialog.confirm();
            await expect(page).toHaveURL(/\/group$/);
            expect((await readGroup(api, group.id)).roles).toHaveLength(0);
        });

        await test.step('leaves without asking when nothing changed', async () => {
            await form.openEditFromOverview(group.name);
            await page.goBack();
            await expect(page).toHaveURL(/\/group$/);
        });

        await test.step('leaves without asking after saving', async () => {
            await form.openEditFromOverview(group.name);
            await form.expandInfoPanel();
            await form.descriptionInput.fill('Saved first');
            await form.saveButton('edit').click();
            await waitForNotification(page, 'Group was saved');
            await page.goBack();
            await expect(page).toHaveURL(/\/group$/);
            expect((await readGroup(api, group.id)).description).toBe('Saved first');
        });
    });
});
