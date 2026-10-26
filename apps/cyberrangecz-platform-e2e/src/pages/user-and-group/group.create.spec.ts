import { expect, test } from '../../support/fixtures';
import { ADMINISTRATION_LINKS, ROLES_WITHOUT_ADMINISTRATION } from '../../support/pages/user-and-group/administration-access';
import { expectRedirectedAway } from '../../support/route-guard';
import {
    createGroup,
    daysAhead,
    findGroupByName,
    findGroups,
} from '../../support/pages/user-and-group/group-data';
import { formatPickerDateTime } from '../../support/pages/training-instance/instance-data';
import { GroupEditPage } from '../../support/pages/user-and-group/group-pages';
import {
    breadcrumbEntries,
    ConfirmationDialog,
    errorDialog,
    pageTitle,
    pickerDay,
    waitForNotification,
    expectUrlWhileLoading,
} from '../../support/ui';

test.use({ account: 'userAdministrator' });

test.describe('group.create', () => {
    test.describe('access', () => {
        for (const role of ROLES_WITHOUT_ADMINISTRATION) {
            test(`sends the ${role} account away from /group/create`, async ({ openAs }) => {
                await expectRedirectedAway(openAs, role, '/group/create', { absentLinks: ADMINISTRATION_LINKS });
            });
        }

        test('sends a signed-out visitor to the login page', async ({ openAs }) => {
            const page = await openAs('anonymous');
            await page.goto('/group/create');
            await expectUrlWhileLoading(page, /\/login/);
        });
    });

    test.describe('page', () => {
        test('shows the title, the breadcrumb and the basic info panel', async ({ page, checkpoint }) => {
            const form = new GroupEditPage(page);
            await form.openCreate();
            await expect(pageTitle(page)).toHaveText('Create Group');
            await expect(breadcrumbEntries(page)).toHaveText(['Home', 'Groups', 'Create']);
            await expect(form.infoPanelHeader).toHaveAttribute('aria-expanded', 'true');
            await expect(form.nameInput).toBeEmpty();
            await expect(form.descriptionInput).toBeEmpty();
            await expect(form.expirationInput).toBeEmpty();
            await checkpoint(page, 'empty creation form');
        });

        test('keeps the members and roles panels disabled until the group exists', async ({ page }) => {
            const form = new GroupEditPage(page);
            await form.openCreate();
            await expect(form.membersPanelHeader).toHaveAttribute('aria-disabled', 'true');
            await expect(form.rolesPanelHeader).toHaveAttribute('aria-disabled', 'true');
        });

        test('keeps both create controls disabled while the form is empty', async ({ page }) => {
            const form = new GroupEditPage(page);
            await form.openCreate();
            await expect(form.saveButton('create')).toBeDisabled();
            await expect(form.createAndContinueButton).toBeDisabled();
        });

        test('collapses and expands the basic info panel', async ({ page }) => {
            const form = new GroupEditPage(page);
            await form.openCreate();
            await form.infoPanelHeader.click();
            await expect(form.infoPanelHeader).toHaveAttribute('aria-expanded', 'false');
            await form.infoPanelHeader.click();
            await expect(form.infoPanelHeader).toHaveAttribute('aria-expanded', 'true');
        });
    });

    test.describe('validation', () => {
        test('reports an empty name once the field was visited', async ({ page }) => {
            const form = new GroupEditPage(page);
            await form.openCreate();
            await form.nameInput.focus();
            await form.nameInput.blur();
            await expect(form.nameErrors()).toHaveText('Name cannot be empty');
        });

        test('reports an empty description once the field was visited', async ({ page }) => {
            const form = new GroupEditPage(page);
            await form.openCreate();
            await form.descriptionInput.focus();
            await form.descriptionInput.blur();
            await expect(form.descriptionErrors()).toHaveText('Description cannot be empty');
        });

        test('rejects a name made only of spaces', async ({ page }) => {
            const form = new GroupEditPage(page);
            await form.openCreate();
            await form.fillBasicInfo('   ', 'A description');
            await expect(form.nameErrors()).toHaveText('Name cannot be empty');
            await expect(form.saveButton('create')).toBeDisabled();
        });

        test('rejects a description made only of spaces', async ({ page, uniqueName }) => {
            const form = new GroupEditPage(page);
            await form.openCreate();
            await form.fillBasicInfo(uniqueName('create-blank-description'), '   ');
            await form.descriptionInput.blur();
            await expect(form.descriptionErrors()).toHaveText('Description cannot be empty');
            await expect(form.saveButton('create')).toBeDisabled();
        });

        test('enables both create controls once name and description are filled', async ({
            page,
            uniqueName,
        }) => {
            const form = new GroupEditPage(page);
            await form.openCreate();
            await form.fillBasicInfo(uniqueName('create-enabled'), 'A description');
            await expect(form.saveButton('create')).toBeEnabled();
            await expect(form.createAndContinueButton).toBeEnabled();
        });

        test('limits the name to 255 characters', async ({ page }) => {
            const form = new GroupEditPage(page);
            await form.openCreate();
            await form.nameInput.fill('n'.repeat(255));
            await form.nameInput.pressSequentially('x');
            await expect(form.nameInput).toHaveValue('n'.repeat(255));
        });

        test('limits the description to 255 characters', async ({ page }) => {
            const form = new GroupEditPage(page);
            await form.openCreate();
            await form.descriptionInput.fill('d'.repeat(255));
            await form.descriptionInput.pressSequentially('x');
            await expect(form.descriptionInput).toHaveValue('d'.repeat(255));
        });

        test('reports a typed expiration date that is not a date', async ({ page }) => {
            const form = new GroupEditPage(page);
            await form.openCreate();
            await form.expirationInput.fill('abc');
            await form.expirationInput.blur();
            await expect(form.expirationErrors()).toHaveText('Enter a valid date after today');
        });

        test('disables the days before tomorrow in the date picker', async ({ page }) => {
            const form = new GroupEditPage(page);
            await form.openCreate();
            await form.expirationInput.click();
            const today = new Date().getDate();
            const todayCell = pickerDay(page, today);
            await expect(todayCell).toHaveClass(/owl-dt-calendar-cell-disabled/);
        });

        test('keeps Clear buttons hidden while their fields are empty', async ({ page }) => {
            const form = new GroupEditPage(page);
            await form.openCreate();
            await expect(form.clearButtons).toHaveCount(0);
        });

        test('shows a Clear button once a field holds text and empties the field with it', async ({
            page,
            uniqueName,
        }) => {
            const form = new GroupEditPage(page);
            await form.openCreate();
            await form.nameInput.fill(uniqueName('create-clearable'));
            await form.clearButtons.first().click();
            await expect(form.nameInput).toBeEmpty();
        });
    });

    test.describe('creating', () => {
        test('creates the group, returns to the overview and confirms with a popup', async ({
            page,
            apiAs,
            uniqueName,
            checkpoint,
        }) => {
            const name = uniqueName('create-create');
            const form = new GroupEditPage(page);
            await form.openCreate();
            await form.fillBasicInfo(name, 'Created through the form');
            await form.saveButton('create').click();

            const notification = await waitForNotification(page, 'Group was created');
            expect(notification.kind).toBe('success');
            await expect(page).toHaveURL(/\/group$/);
            await checkpoint(page, 'group created');

            const stored = await findGroupByName(apiAs('userAdministrator').userAndGroup, name);
            expect(stored?.description).toBe('Created through the form');
            expect(stored?.expiration_date).toBeNull();
            expect(stored?.users).toHaveLength(0);
            expect(stored?.roles).toHaveLength(0);
        });

        test('creates a group whose name uses the full 255 characters', async ({ page, apiAs, uniqueName }) => {
            const stem = uniqueName('create-long');
            const name = stem + 'n'.repeat(255 - stem.length);
            const form = new GroupEditPage(page);
            await form.openCreate();
            await form.fillBasicInfo(name, 'Longest name');
            await form.saveButton('create').click();
            await waitForNotification(page, 'Group was created');
            expect(await findGroupByName(apiAs('userAdministrator').userAndGroup, name)).toBeDefined();
        });

        test('stores accented letters and markup in the name as literal text', async ({
            page,
            apiAs,
            uniqueName,
        }) => {
            const name = `${uniqueName('create-literal')} Žluťoučký kůň <b>x</b>`;
            const form = new GroupEditPage(page);
            await form.openCreate();
            await form.fillBasicInfo(name, 'Literal characters');
            await form.saveButton('create').click();
            await waitForNotification(page, 'Group was created');
            expect(await findGroupByName(apiAs('userAdministrator').userAndGroup, name)).toBeDefined();
        });

        test('stores the expiration date picked in the calendar', async ({ page, apiAs, uniqueName }) => {
            const name = uniqueName('create-expiring');
            const form = new GroupEditPage(page);
            await form.openCreate();
            await form.fillBasicInfo(name, 'Expires next month');
            await form.pickExpirationNextMonth();
            await expect(form.expirationInput).not.toBeEmpty();
            await form.saveButton('create').click();
            await waitForNotification(page, 'Group was created');

            const stored = await findGroupByName(apiAs('userAdministrator').userAndGroup, name);
            const expiration = new Date(stored?.expiration_date ?? '');
            expect(expiration.getTime()).toBeGreaterThan(Date.now());
            expect(expiration.getDate()).toBe(15);
        });

        test('continues on the edit page after Create and continue editing', async ({
            page,
            apiAs,
            uniqueName,
            checkpoint,
        }) => {
            const name = uniqueName('create-continue');
            const form = new GroupEditPage(page);
            await form.openCreate();
            await form.fillBasicInfo(name, 'Edited further');
            await form.createAndContinueButton.click();

            await waitForNotification(page, 'Group was created');
            const stored = await findGroupByName(apiAs('userAdministrator').userAndGroup, name);
            await expect(page).toHaveURL(new RegExp(`/group/${stored?.id}/edit$`));
            await expect(pageTitle(page)).toHaveText(`Edit ${name}`);
            await expect(form.membersPanelHeader).not.toHaveAttribute('aria-disabled', 'true');
            await expect(form.rolesPanelHeader).not.toHaveAttribute('aria-disabled', 'true');
            await checkpoint(page, 'edit page after creation');
        });

        test('sends one request when Create is double-clicked', async ({ page, apiAs, uniqueName }) => {
            const name = uniqueName('create-double-click');
            const form = new GroupEditPage(page);
            await form.openCreate();
            await form.fillBasicInfo(name, 'Clicked twice');
            const requests: string[] = [];
            page.on('request', (request) => {
                if (request.method() === 'POST' && /\/groups$/.test(request.url())) {
                    requests.push(request.url());
                }
            });
            await form.saveButton('create').dblclick();
            await waitForNotification(page, 'Group was created');
            expect(requests).toHaveLength(1);
            const matching = await findGroups(apiAs('userAdministrator').userAndGroup, name);
            expect(matching.filter((group) => group.name === name)).toHaveLength(1);
        });

        test('reports a name that is already taken without exposing database text', async ({
            page,
            apiAs,
            uniqueName,
            checkpoint,
        }) => {
            const name = uniqueName('create-duplicate');
            await createGroup(apiAs('userAdministrator').userAndGroup, { name });
            const form = new GroupEditPage(page);
            await form.openCreate();
            await form.fillBasicInfo(name, 'Same name again');
            await form.saveButton('create').click();

            await expect(errorDialog(page)).toBeVisible();
            await expect(errorDialog(page)).not.toContainText(/constraint|SQL|duplicate key|violat/i);
            await checkpoint(page, 'duplicate name refused');
            const matching = await findGroups(apiAs('userAdministrator').userAndGroup, name);
            expect(matching.filter((group) => group.name === name)).toHaveLength(1);
        });

        test('accepts an expiration date a week ahead typed into the field', async ({
            page,
            apiAs,
            uniqueName,
        }) => {
            const name = uniqueName('create-typed-expiry');
            const form = new GroupEditPage(page);
            await form.openCreate();
            await form.fillBasicInfo(name, 'Typed date');
            const typed = new Date(daysAhead(7));
            typed.setHours(12, 0, 0, 0);
            await form.expirationInput.fill(formatPickerDateTime(typed));
            await form.expirationInput.blur();
            await expect(form.expirationErrors()).toHaveCount(0);
            await form.saveButton('create').click();
            await waitForNotification(page, 'Group was created');
            const stored = await findGroupByName(apiAs('userAdministrator').userAndGroup, name);
            expect(stored?.expiration_date).not.toBeNull();
        });
    });

    test.describe('leaving', () => {
        test('asks before leaving a form with changes and stays on Cancel', async ({
            page,
            uniqueName,
            checkpoint,
        }) => {
            const form = new GroupEditPage(page);
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

        test('leaves without creating anything after Leave', async ({ page, apiAs, uniqueName }) => {
            const name = uniqueName('create-abandoned');
            const form = new GroupEditPage(page);
            await form.openCreateFromOverview();
            await form.fillBasicInfo(name, 'Never saved');
            await page.goBack();
            await new ConfirmationDialog(page, /^Unsaved [Cc]hanges$/).confirm();
            await expect(page).toHaveURL(/\/group$/);
            expect(await findGroupByName(apiAs('userAdministrator').userAndGroup, name)).toBeUndefined();
        });

        test('leaves a pristine form without asking', async ({ page }) => {
            await new GroupEditPage(page).openCreateFromOverview();
            await page.goBack();
            await expect(page).toHaveURL(/\/group$/);
        });
    });
});
