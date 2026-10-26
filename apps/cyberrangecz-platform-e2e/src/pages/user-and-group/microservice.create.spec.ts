import { expect, test } from '../../support/fixtures';
import { MicroserviceRegistrationPage } from '../../support/pages/user-and-group/microservice-pages';
import {
    breadcrumbEntries,
    ConfirmationDialog,
    pageTitle,
    expectUrlWhileLoading,
} from '../../support/ui';

test.use({ origin: 'deployed', account: 'userAdministrator' });

test.describe('microservice.create', () => {
    test('sends a signed-out visitor to the login page', async ({ openAs }) => {
        const page = await openAs('anonymous');
        await page.goto('/microservice/create');
        await expectUrlWhileLoading(page, /\/login/);
    });

    test.describe('page', () => {
        test('shows the title, the breadcrumb and an empty form', async ({
            page,
            checkpoint,
        }) => {
            const registration = new MicroserviceRegistrationPage(page);
            await registration.open();
            await expect(pageTitle(page)).toHaveText(
                'Microservice Registration',
            );
            await expect(breadcrumbEntries(page)).toHaveText([
                'Home',
                'Microservice',
                'Registration',
            ]);
            await expect(registration.nameInput).toBeEmpty();
            await expect(registration.endpointInput).toBeEmpty();
            await expect(registration.roleCards).toHaveCount(1);
            await expect(registration.roleCard(0).typeInput).toBeEmpty();
            await checkpoint(page, 'empty registration form');
        });

        test('keeps Register disabled while the form is empty', async ({
            page,
        }) => {
            const registration = new MicroserviceRegistrationPage(page);
            await registration.open();
            await expect(registration.registerButton).toBeDisabled();
        });

        test('presents the first role card as the default role without a delete control', async ({
            page,
        }) => {
            const registration = new MicroserviceRegistrationPage(page);
            await registration.open();
            await expect(registration.roleCards.first()).toContainText(
                'Default Role',
            );
            await expect(registration.roleCard(0).deleteButton).toHaveCount(0);
        });

        test('shows the entered name in the form heading', async ({
            page,
            uniqueName,
        }) => {
            const registration = new MicroserviceRegistrationPage(page);
            await registration.open();
            const name = uniqueName('heading');
            await registration.nameInput.fill(name);
            await expect(registration.form).toContainText(
                `Microservice ${name}`,
            );
        });
    });

    test.describe('validation', () => {
        test('reports an empty name once the field was visited', async ({
            page,
        }) => {
            const registration = new MicroserviceRegistrationPage(page);
            await registration.open();
            await registration.nameInput.focus();
            await registration.nameInput.blur();
            await expect(registration.nameErrors).toHaveText(
                'Name cannot be empty',
            );
        });

        test('reports an empty endpoint once the field was visited', async ({
            page,
        }) => {
            const registration = new MicroserviceRegistrationPage(page);
            await registration.open();
            await registration.endpointInput.focus();
            await registration.endpointInput.blur();
            await expect(registration.endpointErrors).toHaveText(
                'Endpoint cannot be empty',
            );
        });

        test('reports an empty role type once the field was visited', async ({
            page,
        }) => {
            const registration = new MicroserviceRegistrationPage(page);
            await registration.open();
            await registration.roleCard(0).typeInput.focus();
            await registration.roleCard(0).typeInput.blur();
            await expect(registration.roleCard(0).typeErrors).toHaveText(
                'Type cannot be empty',
            );
        });

        test('keeps Register disabled when the name is missing', async ({
            page,
            uniqueName,
        }) => {
            const registration = new MicroserviceRegistrationPage(page);
            await registration.open();
            await registration.fillValidRegistration(
                uniqueName('no-name'),
                '/e2e/api/v1',
                'ROLE_E2E',
            );
            await registration.nameInput.fill('');
            await expect(registration.registerButton).toBeDisabled();
        });

        test('keeps Register disabled when the endpoint is missing', async ({
            page,
            uniqueName,
        }) => {
            const registration = new MicroserviceRegistrationPage(page);
            await registration.open();
            await registration.fillValidRegistration(
                uniqueName('no-endpoint'),
                '/e2e/api/v1',
                'ROLE_E2E',
            );
            await registration.endpointInput.fill('');
            await expect(registration.registerButton).toBeDisabled();
        });

        test('keeps Register disabled when the default role type is missing', async ({
            page,
            uniqueName,
        }) => {
            const registration = new MicroserviceRegistrationPage(page);
            await registration.open();
            await registration.fillValidRegistration(
                uniqueName('no-type'),
                '/e2e/api/v1',
                'ROLE_E2E',
            );
            await registration.roleCard(0).typeInput.fill('');
            await expect(registration.registerButton).toBeDisabled();
        });

        test('rejects a name made only of spaces', async ({ page }) => {
            const registration = new MicroserviceRegistrationPage(page);
            await registration.open();
            await registration.fillValidRegistration(
                '   ',
                '/e2e/api/v1',
                'ROLE_E2E',
            );
            await expect(registration.nameErrors).toHaveText(
                'Name cannot be empty',
            );
            await expect(registration.registerButton).toBeDisabled();
        });

        test('rejects an endpoint made only of spaces', async ({
            page,
            uniqueName,
        }) => {
            const registration = new MicroserviceRegistrationPage(page);
            await registration.open();
            await registration.fillValidRegistration(
                uniqueName('blank-endpoint'),
                '   ',
                'ROLE_E2E',
            );
            await expect(registration.endpointErrors).toHaveText(
                'Endpoint cannot be empty',
            );
            await expect(registration.registerButton).toBeDisabled();
        });

        test('rejects a role type made only of spaces', async ({
            page,
            uniqueName,
        }) => {
            const registration = new MicroserviceRegistrationPage(page);
            await registration.open();
            await registration.fillValidRegistration(
                uniqueName('blank-type'),
                '/e2e/api/v1',
                '   ',
            );
            await registration.roleCard(0).typeInput.blur();
            await expect(registration.roleCard(0).typeErrors).toHaveText(
                'Type cannot be empty',
            );
            await expect(registration.registerButton).toBeDisabled();
        });

        test('limits the name to 255 characters', async ({ page }) => {
            const registration = new MicroserviceRegistrationPage(page);
            await registration.open();
            await registration.nameInput.fill('n'.repeat(255));
            await registration.nameInput.pressSequentially('x');
            await expect(registration.nameInput).toHaveValue('n'.repeat(255));
        });

        test('keeps accented letters and markup in the name as literal text', async ({
            page,
            uniqueName,
        }) => {
            const registration = new MicroserviceRegistrationPage(page);
            await registration.open();
            const name = `${uniqueName('literal')} Žluťoučký kůň <b>x</b>`;
            await registration.nameInput.fill(name);
            await expect(registration.nameInput).toHaveValue(name);
            await expect(
                registration.form.locator('mat-card-title b'),
            ).toHaveCount(0);
        });

        test('enables Register once every required field is valid', async ({
            page,
            uniqueName,
        }) => {
            const registration = new MicroserviceRegistrationPage(page);
            await registration.open();
            await registration.fillValidRegistration(
                uniqueName('valid'),
                '/e2e/api/v1',
                'ROLE_E2E',
            );
            await expect(registration.registerButton).toBeEnabled();
        });
    });

    test.describe('roles', () => {
        test('adds a removable role card with Add role', async ({
            page,
            checkpoint,
        }) => {
            const registration = new MicroserviceRegistrationPage(page);
            await registration.open();
            await registration.addRoleButton.click();
            await expect(registration.roleCards).toHaveCount(2);
            await expect(registration.roleCards.nth(1)).toContainText('Role');
            await expect(registration.roleCard(1).deleteButton).toBeVisible();
            await checkpoint(page, 'second role added');
        });

        test('removes an added role card with its delete control', async ({
            page,
        }) => {
            const registration = new MicroserviceRegistrationPage(page);
            await registration.open();
            await registration.addRoleButton.click();
            await registration.roleCard(1).deleteButton.click();
            await expect(registration.roleCards).toHaveCount(1);
        });

        test('keeps Register disabled while an added role has no type', async ({
            page,
            uniqueName,
        }) => {
            const registration = new MicroserviceRegistrationPage(page);
            await registration.open();
            await registration.fillValidRegistration(
                uniqueName('extra-role'),
                '/e2e/api/v1',
                'ROLE_E2E',
            );
            await registration.addRoleButton.click();
            await expect(registration.registerButton).toBeDisabled();
            await registration.roleCard(1).typeInput.fill('ROLE_E2E_EXTRA');
            await expect(registration.registerButton).toBeEnabled();
        });

        test('counts the characters of a role description and limits it to 255', async ({
            page,
        }) => {
            const registration = new MicroserviceRegistrationPage(page);
            await registration.open();
            const description = registration.roleCard(0).descriptionInput;
            await expect(registration.roleCard(0).characterCounter).toHaveText(
                '0/255',
            );
            await description.fill('d'.repeat(255));
            await description.pressSequentially('x');
            await expect(description).toHaveValue('d'.repeat(255));
            await expect(registration.roleCard(0).characterCounter).toHaveText(
                '255/255',
            );
        });
    });

    test.describe('clearing', () => {
        test('empties a field with its Clear control', async ({
            page,
            uniqueName,
        }) => {
            const registration = new MicroserviceRegistrationPage(page);
            await registration.open();
            await registration.nameInput.fill(uniqueName('clearable'));
            await registration.form
                .getByRole('button', { name: 'Clear name' })
                .click();
            await expect(registration.nameInput).toBeEmpty();
        });

        test('keeps Clear controls hidden while their fields are empty', async ({
            page,
        }) => {
            const registration = new MicroserviceRegistrationPage(page);
            await registration.open();
            await expect(
                registration.form.getByRole('button', { name: /^Clear/ }),
            ).toHaveCount(0);
        });
    });

    test.describe('leaving', () => {
        test('asks before leaving a form with changes and stays on Cancel', async ({
            page,
            uniqueName,
            checkpoint,
        }) => {
            const registration = new MicroserviceRegistrationPage(page);
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

        test('leaves after Leave without registering anything', async ({
            page,
            uniqueName,
        }) => {
            const registration = new MicroserviceRegistrationPage(page);
            await registration.openFromOverview();
            await registration.fillValidRegistration(
                uniqueName('abandoned'),
                '/e2e/api/v1',
                'ROLE_E2E',
            );
            await expect(registration.registerButton).toBeEnabled();
            const registrations: string[] = [];
            page.on('request', (request) => {
                if (request.method() === 'POST') {
                    registrations.push(request.url());
                }
            });
            await page.goBack();
            await new ConfirmationDialog(
                page,
                /^Unsaved [Cc]hanges$/,
            ).confirm();
            await expect(page).toHaveURL(/\/microservice$/);
            expect(registrations).toHaveLength(0);
        });

        test('leaves a pristine form without asking', async ({ page }) => {
            const registration = new MicroserviceRegistrationPage(page);
            await registration.openFromOverview();
            await expect(registration.nameInput).toBeVisible();
            await page.goBack();
            await expect(page).toHaveURL(/\/microservice$/);
        });
    });
});
