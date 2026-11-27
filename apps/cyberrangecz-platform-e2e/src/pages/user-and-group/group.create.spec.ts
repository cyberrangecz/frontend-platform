import type { ApiClient } from '../../support/api/api-client';
import { expect, test } from '../../support/fixtures';
import { daysAhead, findGroupByName, findGroups, type GroupRecord } from '../../support/pages/user-and-group/group-data';
import { formatPickerDateTime } from '../../support/pages/training-instance/instance-data';
import { GroupEditPage } from '../../support/pages/user-and-group/group-pages';
import {
    breadcrumbEntries,
    ConfirmationDialog,
    doubleClickAfterRender,
    errorDialog,
    pageTitle,
    pickerDay,
    waitForNotification,
} from '../../support/ui';

test.use({ account: 'userAdministrator' });

/** Waits until the service lists the group, since a popup of an earlier creation may still be on screen. */
async function storedGroup(api: ApiClient, name: string): Promise<GroupRecord> {
    await expect.poll(() => findGroupByName(api, name), { message: `group ${name} is stored` }).toBeDefined();
    return (await findGroupByName(api, name)) as GroupRecord;
}

test.describe('group.create', () => {
    test('checks the creation form', async ({ page, uniqueName, checkpoint }) => {
        test.setTimeout(180_000);
        const form = new GroupEditPage(page);
        await form.openCreate();

        await test.step('shows the title, the breadcrumb and the basic info panel', async () => {
            await expect.soft(pageTitle(page), 'page title').toHaveText('Create Group');
            await expect.soft(breadcrumbEntries(page), 'breadcrumb').toHaveText(['Home', 'Groups', 'Create']);
            await expect.soft(form.infoPanelHeader, 'basic info panel is open').toHaveAttribute('aria-expanded', 'true');
            await expect.soft(form.nameInput, 'name is empty').toBeEmpty();
            await expect.soft(form.descriptionInput, 'description is empty').toBeEmpty();
            await expect.soft(form.expirationInput, 'expiration date is empty').toBeEmpty();
            await checkpoint(page, 'empty creation form');
        });

        await test.step('keeps the members and roles panels disabled until the group exists', async () => {
            await expect.soft(form.membersPanelHeader, 'members panel').toHaveAttribute('aria-disabled', 'true');
            await expect.soft(form.rolesPanelHeader, 'roles panel').toHaveAttribute('aria-disabled', 'true');
        });

        await test.step('keeps both create controls disabled while the form is empty', async () => {
            await expect.soft(form.saveButton('create'), 'Create').toBeDisabled();
            await expect.soft(form.createAndContinueButton, 'Create and continue editing').toBeDisabled();
        });

        await test.step('collapses and expands the basic info panel', async () => {
            await form.infoPanelHeader.click();
            await expect.soft(form.infoPanelHeader, 'collapsed').toHaveAttribute('aria-expanded', 'false');
            await form.infoPanelHeader.click();
            await expect.soft(form.infoPanelHeader, 'expanded again').toHaveAttribute('aria-expanded', 'true');
        });

        await test.step('keeps Clear buttons hidden while their fields are empty', async () => {
            await expect.soft(form.clearButtons, 'Clear buttons').toHaveCount(0);
        });

        await test.step('reports an empty name once the field was visited', async () => {
            await form.nameInput.focus();
            await expect(form.nameInput).toBeFocused();
            await form.nameInput.blur();
            await expect.soft(form.nameErrors(), 'name error').toHaveText('Name cannot be empty');
        });

        await test.step('reports an empty description once the field was visited', async () => {
            await form.descriptionInput.focus();
            await form.descriptionInput.blur();
            await expect.soft(form.descriptionErrors(), 'description error').toHaveText('Description cannot be empty');
        });

        await test.step('disables the days before tomorrow in the date picker', async () => {
            await form.expirationInput.click();
            const todayCell = pickerDay(page, new Date().getDate());
            await expect.soft(todayCell, "today's cell").toHaveClass(/owl-dt-calendar-cell-disabled/);
            await form.dismissExpirationPicker();
            await expect(todayCell, 'closed picker').toBeHidden();
        });

        await test.step('rejects a name made only of spaces', async () => {
            await form.fillBasicInfo('   ', 'A description');
            await expect.soft(form.nameErrors(), 'name error').toHaveText('Name cannot be empty');
            await expect.soft(form.saveButton('create'), 'Create').toBeDisabled();
        });

        await test.step('rejects a description made only of spaces', async () => {
            await form.fillBasicInfo(uniqueName('create-blank-description'), '   ');
            await form.descriptionInput.blur();
            await expect.soft(form.descriptionErrors(), 'description error').toHaveText('Description cannot be empty');
            await expect.soft(form.saveButton('create'), 'Create').toBeDisabled();
        });

        await test.step('enables both create controls once name and description are filled', async () => {
            await form.fillBasicInfo(uniqueName('create-enabled'), 'A description');
            await expect.soft(form.saveButton('create'), 'Create').toBeEnabled();
            await expect.soft(form.createAndContinueButton, 'Create and continue editing').toBeEnabled();
        });

        await test.step('reports a typed expiration date that is not a date', async () => {
            await form.expirationInput.fill('abc');
            await form.expirationInput.blur();
            await expect.soft(form.expirationErrors(), 'expiration error').toHaveText('Enter a valid date after today');
        });

        await test.step('limits the name to 255 characters', async () => {
            await form.nameInput.fill('n'.repeat(255));
            await form.nameInput.pressSequentially('x');
            await expect.soft(form.nameInput, 'name value').toHaveValue('n'.repeat(255));
        });

        await test.step('limits the description to 255 characters', async () => {
            await form.descriptionInput.fill('d'.repeat(255));
            await form.descriptionInput.pressSequentially('x');
            await expect.soft(form.descriptionInput, 'description value').toHaveValue('d'.repeat(255));
        });

        await test.step('shows a Clear button once a field holds text and empties the field with it', async () => {
            await form.nameInput.fill(uniqueName('create-clearable'));
            await form.clearButtons.first().click();
            await expect.soft(form.nameInput, 'name after Clear').toBeEmpty();
        });
    });

    test('creates groups through the form', async ({ page, apiAs, uniqueName, checkpoint }) => {
        test.setTimeout(300_000);
        const groupApi = apiAs('userAdministrator').userAndGroup;
        const form = new GroupEditPage(page);
        const createdName = uniqueName('create-create');

        await test.step('creates the group, returns to the overview and confirms with a popup', async () => {
            await form.openCreate();
            await form.fillBasicInfo(createdName, 'Created through the form');
            await form.saveButton('create').click();

            const notification = await waitForNotification(page, 'Group was created');
            expect(notification.kind).toBe('success');
            await expect(page).toHaveURL(/\/group$/);
            await checkpoint(page, 'group created');

            const stored = await storedGroup(groupApi, createdName);
            expect(stored.description).toBe('Created through the form');
            expect(stored.expiration_date).toBeNull();
            expect(stored.users).toHaveLength(0);
            expect(stored.roles).toHaveLength(0);
        });

        await test.step('creates a group whose name uses the full 255 characters', async () => {
            const stem = uniqueName('create-long');
            const name = stem + 'n'.repeat(255 - stem.length);
            await form.openCreate();
            await form.fillBasicInfo(name, 'Longest name');
            await form.saveButton('create').click();
            await waitForNotification(page, 'Group was created');
            await storedGroup(groupApi, name);
        });

        await test.step('stores accented letters and markup in the name as literal text', async () => {
            const name = `${uniqueName('create-literal')} Žluťoučký kůň <b>x</b>`;
            await form.openCreate();
            await form.fillBasicInfo(name, 'Literal characters');
            await form.saveButton('create').click();
            await waitForNotification(page, 'Group was created');
            await storedGroup(groupApi, name);
        });

        await test.step('stores the expiration date picked in the calendar', async () => {
            const name = uniqueName('create-expiring');
            await form.openCreate();
            await form.fillBasicInfo(name, 'Expires next month');
            await form.pickExpirationNextMonth();
            await expect(form.expirationInput).not.toBeEmpty();
            await form.saveButton('create').click();
            await waitForNotification(page, 'Group was created');

            const stored = await storedGroup(groupApi, name);
            const expiration = new Date(stored.expiration_date ?? '');
            expect(expiration.getTime()).toBeGreaterThan(Date.now());
            expect(expiration.getDate()).toBe(15);
        });

        await test.step('accepts an expiration date a week ahead typed into the field', async () => {
            const name = uniqueName('create-typed-expiry');
            await form.openCreate();
            await form.fillBasicInfo(name, 'Typed date');
            const typed = new Date(daysAhead(7));
            typed.setHours(12, 0, 0, 0);
            await form.expirationInput.fill(formatPickerDateTime(typed));
            await form.expirationInput.blur();
            await expect(form.expirationErrors()).toHaveCount(0);
            await form.saveButton('create').click();
            await waitForNotification(page, 'Group was created');
            const stored = await storedGroup(groupApi, name);
            expect(stored.expiration_date).not.toBeNull();
        });

        await test.step('sends one request when Create is double-clicked', async () => {
            const name = uniqueName('create-double-click');
            await form.openCreate();
            await form.fillBasicInfo(name, 'Clicked twice');
            const requests: string[] = [];
            const recordRequest = (request: { method(): string; url(): string }): void => {
                if (request.method() === 'POST' && /\/groups$/.test(request.url())) {
                    requests.push(request.url());
                }
            };
            page.on('request', recordRequest);
            await doubleClickAfterRender(form.saveButton('create'));
            await waitForNotification(page, 'Group was created');
            page.off('request', recordRequest);
            expect(requests).toHaveLength(1);
            const matching = await findGroups(groupApi, name);
            expect(matching.filter((group) => group.name === name)).toHaveLength(1);
        });

        await test.step('continues on the edit page after Create and continue editing', async () => {
            const name = uniqueName('create-continue');
            await form.openCreate();
            await form.fillBasicInfo(name, 'Edited further');
            await form.createAndContinueButton.click();

            await waitForNotification(page, 'Group was created');
            const stored = await storedGroup(groupApi, name);
            await expect(page).toHaveURL(new RegExp(`/group/${stored.id}/edit$`));
            await expect(pageTitle(page)).toHaveText(`Edit ${name}`);
            await expect(form.membersPanelHeader).not.toHaveAttribute('aria-disabled', 'true');
            await expect(form.rolesPanelHeader).not.toHaveAttribute('aria-disabled', 'true');
            await checkpoint(page, 'edit page after creation');
        });

        await test.step('reports a name that is already taken without exposing database text', async () => {
            await form.openCreate();
            await form.fillBasicInfo(createdName, 'Same name again');
            await form.saveButton('create').click();

            await expect(errorDialog(page)).toBeVisible();
            await expect(errorDialog(page)).not.toContainText(/constraint|SQL|duplicate key|violat/i);
            await checkpoint(page, 'duplicate name refused');
            const matching = await findGroups(groupApi, createdName);
            expect(matching.filter((group) => group.name === createdName)).toHaveLength(1);
        });
    });

    test('asks before leaving the creation form with changes', async ({ page, apiAs, uniqueName, checkpoint }) => {
        const form = new GroupEditPage(page);

        await test.step('leaves a pristine form without asking', async () => {
            await form.openCreateFromOverview();
            await page.goBack();
            await expect(page).toHaveURL(/\/group$/);
        });

        await test.step('asks before leaving a form with changes and stays on Cancel', async () => {
            await form.openCreateFromOverview();
            await form.nameInput.fill(uniqueName('create-unsaved'));
            await page.goBack();
            const dialog = new ConfirmationDialog(page, /^Unsaved [Cc]hanges$/);
            await expect(dialog.message).toHaveText(
                'There are some unsaved changes. Do you want to leave without saving?',
            );
            await checkpoint(page, 'unsaved changes dialog');
            await dialog.cancel();
            await expect(dialog.root).toHaveCount(0);
            await expect(page).toHaveURL(/\/group\/create$/);
        });

        await test.step('leaves without creating anything after Leave', async () => {
            const name = uniqueName('create-abandoned');
            await form.openCreateFromOverview();
            await form.fillBasicInfo(name, 'Never saved');
            await page.goBack();
            await new ConfirmationDialog(page, /^Unsaved [Cc]hanges$/).confirm();
            await expect(page).toHaveURL(/\/group$/);
            expect(await findGroupByName(apiAs('userAdministrator').userAndGroup, name)).toBeUndefined();
        });
    });
});
