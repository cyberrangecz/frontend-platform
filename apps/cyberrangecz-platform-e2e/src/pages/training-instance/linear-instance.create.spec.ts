import { DAY_MILLISECONDS, fromNow, HOUR_MILLISECONDS } from '../../support/time';
import { expectRedirectedAway } from '../../support/route-guard';
import { ApiError } from '../../support/api/api-client';
import {
    accessTokenPrefixFor,
    createTrainingInstance,
    findInstanceByTitle,
    TOKEN_PREFIX_LIMIT,
    textOfLength,
} from '../../support/pages/training-instance/instance-data';
import { InstanceFormPage } from '../../support/pages/training-instance/instance-form.page';
import { expect, test } from '../../support/pages/training-instance/training-instance-test';
import {
    ConfirmationDialog,
    expansionPanelHeader,
    navigationEntryByPath,
    expectNoErrorDialog,
    pageTitle,
    waitForNotification,
    expectUrlWhileLoading,
    waitForPageReady,
} from '../../support/ui';

test.use({ account: 'trainingOrganizer' });

const TITLE_LIMIT = 255;

test.describe('linear-instance.create', () => {
    test('shows the empty create form with Save disabled', async ({ page, checkpoint }) => {
        const form = new InstanceFormPage(page);
        await form.openCreate();
        await expect(pageTitle(page)).toHaveText('Create Training Instance');
        await expect(form.formPanel).toContainText('Create Training Instance');
        await expect(form.titleInput).toHaveValue('');
        await expect(form.endTimeInput).toHaveValue('');
        await expect(form.accessTokenPrefixInput).toHaveValue('access');
        await expect(form.trainingDefinitionSelector).toBeVisible();
        await expect(form.poolSelector).toBeVisible();
        await expect(form.saveControl).toBeDisabled();
        await expect(form.organizersPanel).toHaveCount(0);
        await checkpoint(page, 'empty create form');
    });

    test('opens without an error dialog', async ({ page }) => {
        await page.goto('/linear-instance/create');
        await waitForPageReady(page);
        await expect(page.getByRole('textbox', { name: 'Title' })).toBeVisible();
        await expectNoErrorDialog(page);
    });

    test('shows the field hints', async ({ page }) => {
        const form = new InstanceFormPage(page);
        await form.openCreate();
        await expect(page.getByText('When trainees can access training runs - Defaults to current time')).toBeVisible();
        await expect(page.getByText('Trainees cannot access training runs after end time expires')).toBeVisible();
        await expect(page.getByText('Generated PIN code will be added to your token')).toBeVisible();
    });

    test('lists the released and unreleased training definitions in the selector', async ({
        page,
        shared,
        checkpoint,
    }) => {
        const form = new InstanceFormPage(page);
        await form.openCreate();
        await form.trainingDefinitionSelector.getByRole('combobox').click();
        await expect(page.getByRole('option', { name: shared.trainingDefinition.title })).toBeVisible();
        await checkpoint(page, 'training definition options open');
    });

    test('narrows the training definition options by the search text', async ({ page, shared }) => {
        const form = new InstanceFormPage(page);
        await form.openCreate();
        await form.trainingDefinitionSelector.getByRole('combobox').click();
        await page.getByPlaceholder('Search Training Definitions').fill(shared.trainingDefinition.title);
        await expect(page.getByRole('option', { name: shared.trainingDefinition.title })).toBeVisible();
        await page.getByPlaceholder('Search Training Definitions').fill('no-such-training-definition');
        await expect(page.getByRole('option', { disabled: false })).toHaveCount(0);
        await expect(page.getByText('No Training Definitions')).toBeVisible();
    });

    test('lists an unlocked pool of the organizer in the pool selector', async ({ page, createOwnPool }) => {
        const poolId = await createOwnPool('poolselect');
        const form = new InstanceFormPage(page);
        await form.openCreate();
        await form.poolSelector.getByRole('combobox').click();
        await expect(page.getByRole('option', { name: new RegExp(`^Pool ${poolId} - `) })).toBeVisible();
    });

    test('links the selected pool but not the training definition, which the organizer cannot open', async ({
        page,
        shared,
        createOwnPool,
    }) => {
        const poolId = await createOwnPool('poollink');
        const form = new InstanceFormPage(page);
        await form.openCreate();
        await expect(page.getByRole('link', { name: 'View selected training definition' })).toHaveCount(0);
        await expect(page.getByText('Only unlocked pools are available')).toBeVisible();
        await form.chooseResource(form.trainingDefinitionSelector, shared.trainingDefinition.title);
        await form.chooseResource(form.poolSelector, new RegExp(`^Pool ${poolId} - `));
        await expect(form.trainingDefinitionSelector).toContainText(shared.trainingDefinition.title);
        await expect(page.getByRole('link', { name: 'View selected training definition' })).toHaveCount(0);
        await expect(page.getByRole('link', { name: 'View selected pool' })).toBeVisible();
    });

    test('does not offer the Local Environment toggle while local mode is disabled', async ({ page }) => {
        const form = new InstanceFormPage(page);
        await form.openCreate();
        await expect(form.localEnvironmentToggle).toHaveCount(0);
    });

    test.describe('toggles', () => {
        test('starts with the stepper bar shown and backward mode on', async ({ page }) => {
            const form = new InstanceFormPage(page);
            await form.openCreate();
            await expect(form.showStepperBarToggle).toBeChecked();
            await expect(form.backwardModeToggle).toBeChecked();
            await expect(form.backwardModeToggle).toBeEnabled();
        });

        test('turns backward mode off and disables it when the stepper bar is hidden', async ({ page }) => {
            const form = new InstanceFormPage(page);
            await form.openCreate();
            await expect(form.backwardModeToggle).toBeChecked();
            await form.showStepperBarToggle.click();
            await expect(form.showStepperBarToggle).not.toBeChecked();
            await expect(form.backwardModeToggle).not.toBeChecked();
            await expect(form.backwardModeToggle).toBeDisabled();
            await form.showStepperBarToggle.click();
            await expect(form.backwardModeToggle).toBeEnabled();
        });
    });

    test.describe('title', () => {
        test('rejects an empty title after it was cleared', async ({ page }) => {
            const form = new InstanceFormPage(page);
            await form.openCreate();
            await form.titleInput.fill('x');
            await form.titleInput.fill('');
            await form.titleInput.blur();
            await expect(form.titleErrors()).toHaveText('This field is required');
        });

        test('rejects a whitespace-only title', async ({ page }) => {
            const form = new InstanceFormPage(page);
            await form.openCreate();
            await form.titleInput.fill('   ');
            await form.titleInput.blur();
            await expect(form.titleErrors()).toHaveText('This field is required');
            await expect(form.saveControl).toBeDisabled();
        });

        test('limits the title to 255 characters', async ({ page }) => {
            const form = new InstanceFormPage(page);
            await form.openCreate();
            await expect(form.titleInput).toHaveAttribute('maxlength', String(TITLE_LIMIT));
            await form.titleInput.focus();
            await page.keyboard.insertText(textOfLength(TITLE_LIMIT + 1));
            await expect(form.titleInput).toHaveValue(textOfLength(TITLE_LIMIT));
        });

        test('clears the title through the clear button', async ({ page }) => {
            const form = new InstanceFormPage(page);
            await form.openCreate();
            await form.titleInput.fill('to be cleared');
            await form.titleInput.locator('xpath=ancestor::mat-form-field').getByRole('button').click();
            await expect(form.titleInput).toHaveValue('');
        });
    });

    test.describe('access token prefix', () => {
        test('rejects an empty prefix after it was cleared', async ({ page }) => {
            const form = new InstanceFormPage(page);
            await form.openCreate();
            await form.accessTokenPrefixInput.fill('x');
            await form.accessTokenPrefixInput.fill('');
            await form.accessTokenPrefixInput.blur();
            await expect(form.accessTokenErrors()).toHaveText('This field is required');
        });

        test('rejects a whitespace-only prefix', async ({ page }) => {
            const form = new InstanceFormPage(page);
            await form.openCreate();
            await form.accessTokenPrefixInput.fill('   ');
            await form.accessTokenPrefixInput.blur();
            await expect(form.accessTokenErrors()).toHaveText('This field is required');
        });

        test('limits the prefix to 32 characters', async ({ page }) => {
            const form = new InstanceFormPage(page);
            await form.openCreate();
            await expect(form.accessTokenPrefixInput).toHaveAttribute('maxlength', String(TOKEN_PREFIX_LIMIT));
            await form.accessTokenPrefixInput.fill('');
            await page.keyboard.insertText(textOfLength(TOKEN_PREFIX_LIMIT + 1));
            await expect(form.accessTokenPrefixInput).toHaveValue(textOfLength(TOKEN_PREFIX_LIMIT));
        });
    });

    test.describe('times', () => {
        test('requires an end time', async ({ page }) => {
            const form = new InstanceFormPage(page);
            await form.openCreate();
            await form.endTimeInput.focus();
            await form.endTimeInput.blur();
            await expect(form.endTimeErrors()).toHaveText('This field is required');
        });

        test('rejects an end time in the past', async ({ page }) => {
            const form = new InstanceFormPage(page);
            await form.openCreate();
            await form.fillTimes(null, fromNow(-HOUR_MILLISECONDS));
            await expect(form.endTimeErrors().filter({ hasText: 'End time cannot be in the past' })).toHaveCount(1);
        });

        test('rejects a start time in the past', async ({ page }) => {
            const form = new InstanceFormPage(page);
            await form.openCreate();
            await form.fillTimes(fromNow(-HOUR_MILLISECONDS), fromNow(2 * DAY_MILLISECONDS));
            await expect(form.startTimeErrors()).toContainText('Start time cannot be more than 30 seconds in the past');
        });

        test('is refused by the training service when the start time is in the past', async ({
            apiAs,
            shared,
            createOwnPool,
            uniqueName,
        }) => {
            const poolId = await createOwnPool('paststart');
            const title = uniqueName('paststart');
            const creation = createTrainingInstance(apiAs('trainingOrganizer').training, {
                title,
                startTime: fromNow(-HOUR_MILLISECONDS),
                endTime: fromNow(DAY_MILLISECONDS),
                accessTokenPrefix: accessTokenPrefixFor(title),
                trainingDefinitionId: shared.trainingDefinition.id,
                poolId,
            });
            const error = await creation.then(
                () => undefined,
                (rejection: unknown) => rejection,
            );
            expect(error, 'creation with a past start time').toBeInstanceOf(ApiError);
            expect((error as ApiError).status).toBeGreaterThanOrEqual(400);
            expect((error as ApiError).status).toBeLessThan(500);
        });

        test('rejects an end time before the start time', async ({ page }) => {
            const form = new InstanceFormPage(page);
            await form.openCreate();
            await form.fillTimes(fromNow(3 * HOUR_MILLISECONDS), fromNow(HOUR_MILLISECONDS));
            await expect(form.endTimeErrors()).toContainText('Start time must be before end time');
            await expect(form.saveControl).toBeDisabled();
        });

        test('accepts an end time after the start time without errors', async ({ page }) => {
            const form = new InstanceFormPage(page);
            await form.openCreate();
            await form.fillTimes(fromNow(HOUR_MILLISECONDS), fromNow(2 * DAY_MILLISECONDS));
            await expect(form.startTimeErrors()).toHaveCount(0);
            await expect(form.endTimeErrors()).toHaveCount(0);
        });

        test('picks the end time in the date and time picker', async ({ page, checkpoint }) => {
            const form = new InstanceFormPage(page);
            await form.openCreate();
            await form.endTimeField().click();
            await expect(page.locator('owl-date-time-container')).toBeVisible();
            await checkpoint(page, 'end time picker open');
            await page.locator('owl-date-time-container').getByRole('button', { name: 'Set', exact: true }).click();
            await expect(form.endTimeInput).not.toHaveValue('');
        });
    });

    test.describe('save', () => {
        test('creates an instance from valid input and opens its edit page', async ({
            page,
            apiAs,
            shared,
            createOwnPool,
            uniqueName,
            checkpoint,
        }) => {
            const poolId = await createOwnPool('createvalid');
            const title = uniqueName('createvalid');
            const prefix = accessTokenPrefixFor(title);
            const form = new InstanceFormPage(page);
            await form.openCreate();
            await form.titleInput.fill(title);
            await form.fillTimes(fromNow(HOUR_MILLISECONDS), fromNow(2 * DAY_MILLISECONDS));
            await form.accessTokenPrefixInput.fill(prefix);
            await form.chooseResource(form.trainingDefinitionSelector, shared.trainingDefinition.title);
            await form.chooseResource(form.poolSelector, new RegExp(`^Pool ${poolId} - `));
            await expect(form.saveControl).toBeEnabled();
            await checkpoint(page, 'valid form filled');
            await form.save();
            await waitForNotification(page, 'Training instance was created');
            await expectUrlWhileLoading(page, /\/linear-instance\/\d+\/edit$/);
            await checkpoint(page, 'after save');
            const stored = await findInstanceByTitle(apiAs('trainingOrganizer').training, title);
            expect(stored).toBeDefined();
            expect(stored?.pool_id).toBe(poolId);
            expect(stored?.access_token.startsWith(`${prefix}-`)).toBe(true);
            expect(stored?.training_definition.id).toBe(shared.trainingDefinition.id);
            expect(stored?.show_stepper_bar).toBe(true);
            expect(stored?.backward_mode).toBe(true);
        });

        test('stores the toggles that were changed', async ({ page, apiAs, shared, createOwnPool, uniqueName }) => {
            const poolId = await createOwnPool('createtoggles');
            const title = uniqueName('createtoggles');
            const form = new InstanceFormPage(page);
            await form.openCreate();
            await form.titleInput.fill(title);
            await form.fillTimes(fromNow(HOUR_MILLISECONDS), fromNow(2 * DAY_MILLISECONDS));
            await form.accessTokenPrefixInput.fill(accessTokenPrefixFor(title));
            await form.chooseResource(form.trainingDefinitionSelector, shared.trainingDefinition.title);
            await form.chooseResource(form.poolSelector, new RegExp(`^Pool ${poolId} - `));
            await form.backwardModeToggle.click();
            await form.save();
            await waitForNotification(page, 'Training instance was created');
            const stored = await findInstanceByTitle(apiAs('trainingOrganizer').training, title);
            expect(stored?.backward_mode).toBe(false);
            expect(stored?.show_stepper_bar).toBe(true);
        });

        test('stores a title with special characters as literal text', async ({
            page,
            apiAs,
            shared,
            createOwnPool,
            uniqueName,
        }) => {
            const poolId = await createOwnPool('createspecial');
            const title = `${uniqueName('createspecial')} Žluťoučký kůň <b>x</b>`;
            const form = new InstanceFormPage(page);
            await form.openCreate();
            await form.titleInput.fill(title);
            await form.fillTimes(fromNow(HOUR_MILLISECONDS), fromNow(2 * DAY_MILLISECONDS));
            await form.accessTokenPrefixInput.fill(accessTokenPrefixFor(uniqueName('sp')));
            await form.chooseResource(form.trainingDefinitionSelector, shared.trainingDefinition.title);
            await form.chooseResource(form.poolSelector, new RegExp(`^Pool ${poolId} - `));
            await form.save();
            await waitForNotification(page, 'Training instance was created');
            await expectUrlWhileLoading(page, /\/linear-instance\/\d+\/edit$/);
            await expect(form.titleInput).toHaveValue(title);
            await expect(page.locator('b', { hasText: /^x$/ })).toHaveCount(0);
            const stored = await findInstanceByTitle(apiAs('trainingOrganizer').training, title);
            expect(stored?.title).toBe(title);
        });

        test('creates an instance with a title of exactly 255 characters', async ({
            page,
            apiAs,
            shared,
            createOwnPool,
            uniqueName,
        }) => {
            const poolId = await createOwnPool('createlongest');
            const stamp = uniqueName('createlongest');
            const title = `${stamp}${textOfLength(TITLE_LIMIT - stamp.length)}`;
            const form = new InstanceFormPage(page);
            await form.openCreate();
            await form.titleInput.fill(title);
            await form.fillTimes(fromNow(HOUR_MILLISECONDS), fromNow(2 * DAY_MILLISECONDS));
            await form.accessTokenPrefixInput.fill(textOfLength(TOKEN_PREFIX_LIMIT, 'tok'));
            await form.chooseResource(form.trainingDefinitionSelector, shared.trainingDefinition.title);
            await form.chooseResource(form.poolSelector, new RegExp(`^Pool ${poolId} - `));
            await form.save();
            await waitForNotification(page, 'Training instance was created');
            const stored = await findInstanceByTitle(apiAs('trainingOrganizer').training, title);
            expect(stored?.title.length).toBe(TITLE_LIMIT);
        });

        test('keeps Save disabled until a training definition and a pool are chosen', async ({
            page,
            shared,
            createOwnPool,
            uniqueName,
        }) => {
            const poolId = await createOwnPool('createrequired');
            const title = uniqueName('createrequired');
            const form = new InstanceFormPage(page);
            await form.openCreate();
            await form.titleInput.fill(title);
            await form.fillTimes(fromNow(HOUR_MILLISECONDS), fromNow(2 * DAY_MILLISECONDS));
            await form.accessTokenPrefixInput.fill(accessTokenPrefixFor(title));
            await expect(form.saveControl).toBeDisabled();
            await form.chooseResource(form.trainingDefinitionSelector, shared.trainingDefinition.title);
            await expect(form.saveControl).toBeDisabled();
            await form.chooseResource(form.poolSelector, new RegExp(`^Pool ${poolId} - `));
            await expect(form.saveControl).toBeEnabled();
        });

        test('shows the required message when the training definition was touched and left empty', async ({
            page,
        }) => {
            const form = new InstanceFormPage(page);
            await form.openCreate();
            await form.trainingDefinitionSelector.getByRole('combobox').click();
            await page.keyboard.press('Escape');
            await expect(page.getByText('This field is required')).toBeVisible();
        });
    });

    test.describe('leaving', () => {
        test('marks the form as unsaved after an edit', async ({ page }) => {
            const form = new InstanceFormPage(page);
            await form.openCreate();
            await expect(form.unsavedWarning).toHaveCount(0);
            await form.titleInput.fill('unsaved title');
            await expect(form.unsavedWarning).toBeVisible();
        });

        test('keeps the form when leaving is cancelled', async ({ page, checkpoint }) => {
            const form = new InstanceFormPage(page);
            await form.openCreate();
            await form.titleInput.fill('stay here');
            await navigationEntryByPath(page, '/linear-instance').first().click();
            const dialog = new ConfirmationDialog(page, 'Unsaved changes');
            await expect(dialog.title).toBeVisible();
            await checkpoint(page, 'unsaved changes dialog open');
            await dialog.cancel();
            await expect(dialog.root).toHaveCount(0);
            await expectUrlWhileLoading(page, /\/linear-instance\/create$/);
            await expect(form.titleInput).toHaveValue('stay here');
        });

        test('discards the form when leaving is confirmed', async ({ page }) => {
            const form = new InstanceFormPage(page);
            await form.openCreate();
            await form.titleInput.fill('discard me');
            await navigationEntryByPath(page, '/linear-instance').first().click();
            await new ConfirmationDialog(page, 'Unsaved changes').confirm();
            await expectUrlWhileLoading(page, /\/linear-instance$/);
        });

        test('leaves without a question while nothing was edited', async ({ page }) => {
            const form = new InstanceFormPage(page);
            await form.openCreate();
            await navigationEntryByPath(page, '/linear-instance').first().click();
            await expectUrlWhileLoading(page, /\/linear-instance$/);
        });

        test('collapses the form panel through its header', async ({ page }) => {
            const form = new InstanceFormPage(page);
            await form.openCreate();
            const header = expansionPanelHeader(page, 'Create Training Instance');
            await expect(header).toHaveAttribute('aria-expanded', 'true');
            await header.click();
            await expect(header).toHaveAttribute('aria-expanded', 'false');
        });
    });

    test.describe('access', () => {
        for (const role of ['trainingDesigner', 'trainee'] as const) {
            test(`sends the ${role} account away from /linear-instance/create`, async ({ openAs }) => {
                await expectRedirectedAway(openAs, role, '/linear-instance/create');
            });
        }
    });
});
