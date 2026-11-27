import { expect, test } from '../../support/fixtures';
import { MicroserviceRegistrationPage } from '../../support/pages/user-and-group/microservice-pages';
import { breadcrumbEntries, ConfirmationDialog, expectUrlWhileLoading, pageTitle } from '../../support/ui';

test.use({ origin: 'deployed', account: 'userAdministrator' });

const ENDPOINT = '/e2e/api/v1';
const ROLE_TYPE = 'ROLE_E2E';

test.describe('microservice.create', () => {
    test('sends a signed-out visitor to the login page', async ({ openAs }) => {
        const page = await openAs('anonymous');
        await page.goto('/microservice/create');
        await expectUrlWhileLoading(page, /\/login/);
    });

    test('checks the registration form', async ({ page, uniqueName, checkpoint }) => {
        test.setTimeout(240_000);
        const registration = new MicroserviceRegistrationPage(page);
        const defaultRole = registration.roleCard(0);
        const validName = uniqueName('valid');
        await registration.open();

        await test.step('shows the title, the breadcrumb and an empty form', async () => {
            await expect.soft(pageTitle(page), 'page title').toHaveText('Microservice Registration');
            await expect.soft(breadcrumbEntries(page), 'breadcrumb').toHaveText(['Home', 'Microservice', 'Registration']);
            await expect.soft(registration.nameInput, 'name').toBeEmpty();
            await expect.soft(registration.endpointInput, 'endpoint').toBeEmpty();
            await expect.soft(registration.roleCards, 'role cards').toHaveCount(1);
            await expect.soft(defaultRole.typeInput, 'role type').toBeEmpty();
            await checkpoint(page, 'empty registration form');
        });

        await test.step('keeps Register disabled while the form is empty', async () => {
            await expect.soft(registration.registerButton, 'Register').toBeDisabled();
        });

        await test.step('presents the first role card as the default role without a delete control', async () => {
            await expect.soft(registration.roleCards.first(), 'first role card').toContainText('Default Role');
            await expect.soft(defaultRole.deleteButton, 'delete control').toHaveCount(0);
        });

        await test.step('keeps Clear controls hidden while their fields are empty', async () => {
            await expect
                .soft(registration.form.getByRole('button', { name: /^Clear/ }), 'Clear controls')
                .toHaveCount(0);
        });

        await test.step('reports an empty name once the field was visited', async () => {
            await registration.nameInput.focus();
            await registration.nameInput.blur();
            await expect.soft(registration.nameErrors, 'name error').toHaveText('Name cannot be empty');
        });

        await test.step('reports an empty endpoint once the field was visited', async () => {
            await registration.endpointInput.focus();
            await registration.endpointInput.blur();
            await expect.soft(registration.endpointErrors, 'endpoint error').toHaveText('Endpoint cannot be empty');
        });

        await test.step('reports an empty role type once the field was visited', async () => {
            await defaultRole.typeInput.focus();
            await defaultRole.typeInput.blur();
            await expect.soft(defaultRole.typeErrors, 'role type error').toHaveText('Type cannot be empty');
        });

        await test.step('shows the entered name in the form heading', async () => {
            const name = uniqueName('heading');
            await registration.nameInput.fill(name);
            await expect.soft(registration.form, 'form heading').toContainText(`Microservice ${name}`);
        });

        await test.step('counts the characters of a role description and limits it to 255', async () => {
            const description = defaultRole.descriptionInput;
            await expect.soft(defaultRole.characterCounter, 'initial counter').toHaveText('0/255');
            await description.fill('d'.repeat(255));
            await description.pressSequentially('x');
            await expect.soft(description, 'description value').toHaveValue('d'.repeat(255));
            await expect.soft(defaultRole.characterCounter, 'full counter').toHaveText('255/255');
        });

        await test.step('enables Register once every required field is valid', async () => {
            await registration.fillValidRegistration(validName, ENDPOINT, ROLE_TYPE);
            await expect.soft(registration.registerButton, 'Register').toBeEnabled();
        });

        await test.step('keeps Register disabled when the name is missing', async () => {
            await registration.nameInput.fill('');
            await expect.soft(registration.registerButton, 'Register').toBeDisabled();
            await registration.nameInput.fill(validName);
        });

        await test.step('keeps Register disabled when the endpoint is missing', async () => {
            await registration.endpointInput.fill('');
            await expect.soft(registration.registerButton, 'Register').toBeDisabled();
            await registration.endpointInput.fill(ENDPOINT);
        });

        await test.step('keeps Register disabled when the default role type is missing', async () => {
            await defaultRole.typeInput.fill('');
            await expect.soft(registration.registerButton, 'Register').toBeDisabled();
            await defaultRole.typeInput.fill(ROLE_TYPE);
        });

        await test.step('rejects a name made only of spaces', async () => {
            await registration.nameInput.fill('   ');
            await expect.soft(registration.nameErrors, 'name error').toHaveText('Name cannot be empty');
            await expect.soft(registration.registerButton, 'Register').toBeDisabled();
            await registration.nameInput.fill(validName);
        });

        await test.step('rejects an endpoint made only of spaces', async () => {
            await registration.endpointInput.fill('   ');
            await expect.soft(registration.endpointErrors, 'endpoint error').toHaveText('Endpoint cannot be empty');
            await expect.soft(registration.registerButton, 'Register').toBeDisabled();
            await registration.endpointInput.fill(ENDPOINT);
        });

        await test.step('rejects a role type made only of spaces', async () => {
            await defaultRole.typeInput.fill('   ');
            await defaultRole.typeInput.blur();
            await expect.soft(defaultRole.typeErrors, 'role type error').toHaveText('Type cannot be empty');
            await expect.soft(registration.registerButton, 'Register').toBeDisabled();
            await defaultRole.typeInput.fill(ROLE_TYPE);
        });

        await test.step('limits the name to 255 characters', async () => {
            await registration.nameInput.fill('n'.repeat(255));
            await registration.nameInput.pressSequentially('x');
            await expect.soft(registration.nameInput, 'name value').toHaveValue('n'.repeat(255));
        });

        await test.step('keeps accented letters and markup in the name as literal text', async () => {
            const name = `${uniqueName('literal')} Žluťoučký kůň <b>x</b>`;
            await registration.nameInput.fill(name);
            await expect.soft(registration.nameInput, 'name value').toHaveValue(name);
            await expect.soft(registration.form.locator('mat-card-title b'), 'markup elements').toHaveCount(0);
        });

        await test.step('adds a removable role card with Add role', async () => {
            await registration.addRoleButton.click();
            await expect.soft(registration.roleCards, 'role cards').toHaveCount(2);
            await expect.soft(registration.roleCards.nth(1), 'second role card').toContainText('Role');
            await expect.soft(registration.roleCard(1).deleteButton, 'delete control').toBeVisible();
            await checkpoint(page, 'second role added');
        });

        await test.step('keeps Register disabled while an added role has no type', async () => {
            await expect.soft(registration.registerButton, 'Register without a type').toBeDisabled();
            await registration.roleCard(1).typeInput.fill('ROLE_E2E_EXTRA');
            await expect.soft(registration.registerButton, 'Register with a type').toBeEnabled();
        });

        await test.step('removes an added role card with its delete control', async () => {
            await registration.roleCard(1).deleteButton.click();
            await expect.soft(registration.roleCards, 'role cards').toHaveCount(1);
        });

        await test.step('empties a field with its Clear control', async () => {
            await registration.nameInput.fill(uniqueName('clearable'));
            await registration.form.getByRole('button', { name: 'Clear name' }).click();
            await expect.soft(registration.nameInput, 'name').toBeEmpty();
        });
    });

    test('guards leaving the registration form', async ({ page, uniqueName, checkpoint }) => {
        const registration = new MicroserviceRegistrationPage(page);

        await test.step('leaves a pristine form without asking', async () => {
            await registration.openFromOverview();
            await expect(registration.nameInput).toBeVisible();
            await page.goBack();
            await expect(page).toHaveURL(/\/microservice$/);
        });

        await test.step('asks before leaving a form with changes and stays on Cancel', async () => {
            await registration.openFromOverview();
            await registration.nameInput.fill(uniqueName('unsaved'));
            await page.goBack();
            const dialog = new ConfirmationDialog(page, /^Unsaved [Cc]hanges$/);
            await expect(dialog.root).toBeVisible();
            await checkpoint(page, 'unsaved changes dialog');
            await dialog.cancel();
            await expect(dialog.root).toHaveCount(0);
            await expect(page).toHaveURL(/\/microservice\/create$/);
        });

        await test.step('leaves after Leave without registering anything', async () => {
            await registration.openFromOverview();
            await registration.fillValidRegistration(uniqueName('abandoned'), ENDPOINT, ROLE_TYPE);
            await expect(registration.registerButton).toBeEnabled();
            const registrations: string[] = [];
            const recordRequest = (request: { method(): string; url(): string }): void => {
                if (request.method() === 'POST') {
                    registrations.push(request.url());
                }
            };
            page.on('request', recordRequest);
            await page.goBack();
            await new ConfirmationDialog(page, /^Unsaved [Cc]hanges$/).confirm();
            await expect(page).toHaveURL(/\/microservice$/);
            page.off('request', recordRequest);
            expect(registrations).toHaveLength(0);
        });
    });
});
