import { DAY_MILLISECONDS, fromNow, HOUR_MILLISECONDS } from '../../support/time';
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
} from '../../support/ui';

test.use({ account: 'trainingOrganizer' });

const TITLE_LIMIT = 255;
const MERGED_TEST_TIMEOUT_MILLISECONDS = 240_000;

test.describe('linear-instance.create', () => {
    test('checks the content, selectors, toggles and leaving of the create form', async ({
        page,
        shared,
        checkpoint,
    }) => {
        test.setTimeout(MERGED_TEST_TIMEOUT_MILLISECONDS);
        const form = new InstanceFormPage(page);
        const trainingDefinitionCombobox = form.trainingDefinitionSelector.getByRole('combobox');
        const searchInput = page.getByPlaceholder('Search Training Definitions');
        const leaveToOverview = (): Promise<void> => navigationEntryByPath(page, '/linear-instance').first().click();
        await form.openCreate();

        await test.step('leaves without a question while nothing was edited', async () => {
            await leaveToOverview();
            await expectUrlWhileLoading(page, /\/linear-instance$/);
            await form.openCreate();
        });

        await test.step('shows the empty create form with Save disabled', async () => {
            await expect.soft(pageTitle(page), 'page title').toHaveText('Create Training Instance');
            await expect.soft(form.formPanel, 'form panel').toContainText('Create Training Instance');
            await expect.soft(form.titleInput, 'title').toHaveValue('');
            await expect.soft(form.endTimeInput, 'end time').toHaveValue('');
            await expect.soft(form.accessTokenPrefixInput, 'access token prefix').toHaveValue('access');
            await expect.soft(form.trainingDefinitionSelector, 'training definition selector').toBeVisible();
            await expect.soft(form.poolSelector, 'pool selector').toBeVisible();
            await expect.soft(form.saveControl, 'Save control').toBeDisabled();
            await expect.soft(form.organizersPanel, 'organizers panel').toHaveCount(0);
            await checkpoint(page, 'empty create form');
        });

        await test.step('opens without an error dialog', async () => {
            await expect.soft(page.getByRole('textbox', { name: 'Title' }), 'title field').toBeVisible();
            await expectNoErrorDialog(page);
        });

        await test.step('shows the field hints', async () => {
            await expect
                .soft(
                    page.getByText('When trainees can access training runs - Defaults to current time'),
                    'start time hint',
                )
                .toBeVisible();
            await expect
                .soft(page.getByText('Trainees cannot access training runs after end time expires'), 'end time hint')
                .toBeVisible();
            await expect
                .soft(page.getByText('Generated PIN code will be added to your token'), 'access token hint')
                .toBeVisible();
        });

        await test.step('starts with the stepper bar shown, backward mode on and the instance managed', async () => {
            await expect.soft(form.managedToggle, 'managed toggle').toBeChecked();
            await expect.soft(form.showStepperBarToggle, 'stepper bar toggle').toBeChecked();
            await expect.soft(form.backwardModeToggle, 'backward mode toggle').toBeChecked();
            await expect.soft(form.backwardModeToggle, 'backward mode toggle').toBeEnabled();
        });

        await test.step('does not offer the Local Environment toggle while local mode is disabled', async () => {
            await expect.soft(form.localEnvironmentToggle, 'local environment toggle').toHaveCount(0);
        });

        await test.step('marks the form as unsaved after an edit', async () => {
            await expect.soft(form.unsavedWarning, 'unsaved warning before an edit').toHaveCount(0);
            await form.titleInput.fill('unsaved title');
            await expect.soft(form.unsavedWarning, 'unsaved warning after an edit').toBeVisible();
        });

        await test.step('turns backward mode off and disables it when the stepper bar is hidden', async () => {
            await expect.soft(form.backwardModeToggle, 'backward mode toggle').toBeChecked();
            await form.showStepperBarToggle.click();
            await expect.soft(form.showStepperBarToggle, 'stepper bar toggle').not.toBeChecked();
            await expect.soft(form.backwardModeToggle, 'backward mode toggle').not.toBeChecked();
            await expect.soft(form.backwardModeToggle, 'backward mode toggle').toBeDisabled();
            await form.showStepperBarToggle.click();
            await expect.soft(form.backwardModeToggle, 'backward mode toggle').toBeEnabled();
        });

        await test.step('lists the released and unreleased training definitions in the selector', async () => {
            await trainingDefinitionCombobox.click();
            await expect
                .soft(page.getByRole('option', { name: shared.trainingDefinition.title }), 'training definition option')
                .toBeVisible();
            await checkpoint(page, 'training definition options open');
        });

        await test.step('narrows the training definition options by the search text', async () => {
            await searchInput.fill(shared.trainingDefinition.title);
            await expect
                .soft(page.getByRole('option', { name: shared.trainingDefinition.title }), 'matching option')
                .toBeVisible();
            await searchInput.fill('no-such-training-definition');
            await expect.soft(page.getByRole('option', { disabled: false }), 'options').toHaveCount(0);
            await expect.soft(page.getByText('No Training Definitions'), 'empty message').toBeVisible();
        });

        await test.step('shows the required message when the training definition was touched and left empty', async () => {
            await page.keyboard.press('Escape');
            await expect.soft(page.getByText('This field is required'), 'required message').toBeVisible();
        });

        await test.step('collapses the form panel through its header', async () => {
            const header = expansionPanelHeader(page, 'Create Training Instance');
            await expect.soft(header, 'panel header').toHaveAttribute('aria-expanded', 'true');
            await header.click();
            await expect.soft(header, 'panel header').toHaveAttribute('aria-expanded', 'false');
            await header.click();
            await expect(header).toHaveAttribute('aria-expanded', 'true');
        });

        await test.step('keeps the form when leaving is cancelled', async () => {
            await form.titleInput.fill('stay here');
            await leaveToOverview();
            const dialog = new ConfirmationDialog(page, 'Unsaved changes');
            await expect(dialog.title).toBeVisible();
            await checkpoint(page, 'unsaved changes dialog open');
            await dialog.cancel();
            await expect(dialog.root).toHaveCount(0);
            await expectUrlWhileLoading(page, /\/linear-instance\/create$/);
            await expect.soft(form.titleInput, 'title after cancelling').toHaveValue('stay here');
        });

        await test.step('discards the form when leaving is confirmed', async () => {
            await form.titleInput.fill('discard me');
            await leaveToOverview();
            await new ConfirmationDialog(page, 'Unsaved changes').confirm();
            await expectUrlWhileLoading(page, /\/linear-instance$/);
        });
    });

    test('checks the field validation of the create form', async ({ page, checkpoint }) => {
        test.setTimeout(MERGED_TEST_TIMEOUT_MILLISECONDS);
        const form = new InstanceFormPage(page);
        await form.openCreate();

        await test.step('rejects an empty title after it was cleared', async () => {
            await form.titleInput.fill('x');
            await form.titleInput.fill('');
            await form.titleInput.blur();
            await expect.soft(form.titleErrors(), 'title errors').toHaveText('This field is required');
        });

        await test.step('rejects a whitespace-only title', async () => {
            await form.titleInput.fill('   ');
            await form.titleInput.blur();
            await expect.soft(form.titleErrors(), 'title errors').toHaveText('This field is required');
            await expect.soft(form.saveControl, 'Save control').toBeDisabled();
        });

        await test.step('limits the title to 255 characters', async () => {
            await expect
                .soft(form.titleInput, 'title length limit')
                .toHaveAttribute('maxlength', String(TITLE_LIMIT));
            await form.titleInput.fill('');
            await form.titleInput.focus();
            await page.keyboard.insertText(textOfLength(TITLE_LIMIT + 1));
            await expect.soft(form.titleInput, 'title').toHaveValue(textOfLength(TITLE_LIMIT));
        });

        await test.step('clears the title through the clear button', async () => {
            await form.titleInput.fill('to be cleared');
            await form.titleInput.locator('xpath=ancestor::mat-form-field').getByRole('button').click();
            await expect.soft(form.titleInput, 'title').toHaveValue('');
        });

        await test.step('rejects an empty prefix after it was cleared', async () => {
            await form.accessTokenPrefixInput.fill('x');
            await form.accessTokenPrefixInput.fill('');
            await form.accessTokenPrefixInput.blur();
            await expect.soft(form.accessTokenErrors(), 'prefix errors').toHaveText('This field is required');
        });

        await test.step('rejects a whitespace-only prefix', async () => {
            await form.accessTokenPrefixInput.fill('   ');
            await form.accessTokenPrefixInput.blur();
            await expect.soft(form.accessTokenErrors(), 'prefix errors').toHaveText('This field is required');
        });

        await test.step('limits the prefix to 32 characters', async () => {
            await expect
                .soft(form.accessTokenPrefixInput, 'prefix length limit')
                .toHaveAttribute('maxlength', String(TOKEN_PREFIX_LIMIT));
            await form.accessTokenPrefixInput.fill('');
            await page.keyboard.insertText(textOfLength(TOKEN_PREFIX_LIMIT + 1));
            await expect
                .soft(form.accessTokenPrefixInput, 'prefix')
                .toHaveValue(textOfLength(TOKEN_PREFIX_LIMIT));
        });

        await test.step('requires an end time', async () => {
            await form.endTimeInput.focus();
            await form.endTimeInput.blur();
            await expect.soft(form.endTimeErrors(), 'end time errors').toHaveText('This field is required');
        });

        await test.step('picks the end time in the date and time picker', async () => {
            await form.endTimeField().click();
            await expect(page.locator('owl-date-time-container')).toBeVisible();
            await checkpoint(page, 'end time picker open');
            await page.locator('owl-date-time-container').getByRole('button', { name: 'Set', exact: true }).click();
            await expect.soft(form.endTimeInput, 'end time').not.toHaveValue('');
        });

        await test.step('rejects an end time in the past', async () => {
            await form.fillTimes(null, fromNow(-HOUR_MILLISECONDS));
            await expect
                .soft(form.endTimeErrors().filter({ hasText: 'End time cannot be in the past' }), 'past end time error')
                .toHaveCount(1);
        });

        await test.step('rejects a start time in the past', async () => {
            await form.fillTimes(fromNow(-HOUR_MILLISECONDS), fromNow(2 * DAY_MILLISECONDS));
            await expect
                .soft(form.startTimeErrors(), 'start time errors')
                .toContainText('Start time cannot be more than 30 seconds in the past');
        });

        await test.step('rejects an end time before the start time', async () => {
            await form.fillTimes(fromNow(3 * HOUR_MILLISECONDS), fromNow(HOUR_MILLISECONDS));
            await expect
                .soft(form.endTimeErrors(), 'end time errors')
                .toContainText('Start time must be before end time');
            await expect.soft(form.saveControl, 'Save control').toBeDisabled();
        });

        await test.step('accepts an end time after the start time without errors', async () => {
            await form.fillTimes(fromNow(HOUR_MILLISECONDS), fromNow(2 * DAY_MILLISECONDS));
            await expect.soft(form.startTimeErrors(), 'start time errors').toHaveCount(0);
            await expect.soft(form.endTimeErrors(), 'end time errors').toHaveCount(0);
        });
    });

    test('creates instances from the form, checking the selectors and the stored values', async ({
        page,
        apiAs,
        shared,
        createOwnPool,
        uniqueName,
        checkpoint,
    }) => {
        test.setTimeout(MERGED_TEST_TIMEOUT_MILLISECONDS);
        const training = apiAs('trainingOrganizer').training;
        const poolId = await createOwnPool('createvalid');
        const poolOption = new RegExp(`^Pool ${poolId} - `);
        const title = uniqueName('createvalid');
        const prefix = accessTokenPrefixFor(title);
        const form = new InstanceFormPage(page);
        await form.openCreate();

        await test.step('hints that only unlocked pools are available until the selector is touched', async () => {
            await expect
                .soft(page.getByText('Only unlocked pools are available'), 'unlocked pools hint')
                .toBeVisible();
        });

        await test.step('lists an unlocked pool of the organizer in the pool selector', async () => {
            await form.poolSelector.getByRole('combobox').click();
            await expect.soft(page.getByRole('option', { name: poolOption }), 'pool option').toBeVisible();
            await page.keyboard.press('Escape');
        });

        await test.step('links the selected pool but not the training definition, which the organizer cannot open', async () => {
            const definitionLink = page.getByRole('link', { name: 'View selected training definition' });
            await expect.soft(definitionLink, 'definition link before choosing').toHaveCount(0);
            await form.titleInput.fill(title);
            await form.fillTimes(fromNow(HOUR_MILLISECONDS), fromNow(2 * DAY_MILLISECONDS));
            await form.accessTokenPrefixInput.fill(prefix);
            await test.step('keeps Save disabled until a training definition and a pool are chosen', async () => {
                await expect.soft(form.saveControl, 'Save control before choosing').toBeDisabled();
                await form.chooseResource(form.trainingDefinitionSelector, shared.trainingDefinition.title);
                await expect.soft(form.saveControl, 'Save control with a definition only').toBeDisabled();
                await form.chooseResource(form.poolSelector, poolOption);
                await expect.soft(form.saveControl, 'Save control with both chosen').toBeEnabled();
            });
            await expect
                .soft(form.trainingDefinitionSelector, 'chosen training definition')
                .toContainText(shared.trainingDefinition.title);
            await expect.soft(definitionLink, 'definition link after choosing').toHaveCount(0);
            await expect
                .soft(page.getByRole('link', { name: 'View selected pool' }), 'pool link')
                .toBeVisible();
        });

        await test.step('creates an instance from valid input and opens its edit page', async () => {
            await checkpoint(page, 'valid form filled');
            await form.save();
            await waitForNotification(page, 'Training instance was created');
            await expectUrlWhileLoading(page, /\/linear-instance\/\d+\/edit$/);
            await checkpoint(page, 'after save');
            const stored = await findInstanceByTitle(training, title);
            expect.soft(stored, 'stored instance').toBeDefined();
            expect.soft(stored?.pool_id, 'stored pool').toBe(poolId);
            expect.soft(stored?.access_token.startsWith(`${prefix}-`), 'stored token prefix').toBe(true);
            expect.soft(stored?.training_definition.id, 'stored training definition').toBe(shared.trainingDefinition.id);
            expect.soft(stored?.show_stepper_bar, 'stored stepper bar').toBe(true);
            expect.soft(stored?.backward_mode, 'stored backward mode').toBe(true);
            expect.soft(stored?.managed, 'stored managed').toBe(true);
        });

        const edgePoolId = await createOwnPool('createedge');
        const stamp = uniqueName('createedge');
        const specialTitle = `${stamp} Žluťoučký kůň <b>x</b> `;
        const edgeTitle = `${specialTitle}${textOfLength(TITLE_LIMIT - specialTitle.length)}`;
        const longPrefix = textOfLength(TOKEN_PREFIX_LIMIT, 'tok');

        await test.step('is refused by the training service when the start time is in the past', async () => {
            const pastPoolId = await createOwnPool('paststart');
            const pastTitle = uniqueName('paststart');
            const error = await createTrainingInstance(training, {
                title: pastTitle,
                startTime: fromNow(-HOUR_MILLISECONDS),
                endTime: fromNow(DAY_MILLISECONDS),
                accessTokenPrefix: accessTokenPrefixFor(pastTitle),
                trainingDefinitionId: shared.trainingDefinition.id,
                poolId: pastPoolId,
            }).then(
                () => undefined,
                (rejection: unknown) => rejection,
            );
            expect.soft(error, 'creation with a past start time').toBeInstanceOf(ApiError);
            expect.soft((error as ApiError).status, 'refusal status').toBeGreaterThanOrEqual(400);
            expect.soft((error as ApiError).status, 'refusal status').toBeLessThan(500);
        });

        await test.step('creates an instance with a title of exactly 255 characters', async () => {
            await form.openCreate();
            await form.titleInput.fill(edgeTitle);
            await form.fillTimes(fromNow(HOUR_MILLISECONDS), fromNow(2 * DAY_MILLISECONDS));
            await form.accessTokenPrefixInput.fill(longPrefix);
            await form.chooseResource(form.trainingDefinitionSelector, shared.trainingDefinition.title);
            await form.chooseResource(form.poolSelector, new RegExp(`^Pool ${edgePoolId} - `));
            await form.backwardModeToggle.click();
            await form.managedToggle.click();
            await expect.soft(form.managedToggle, 'managed toggle').not.toBeChecked();
            await form.save();
            await waitForNotification(page, 'Training instance was created');
            await expectUrlWhileLoading(page, /\/linear-instance\/\d+\/edit$/);
            const stored = await findInstanceByTitle(training, edgeTitle);
            expect.soft(stored?.title.length, 'stored title length').toBe(TITLE_LIMIT);
            expect.soft(stored?.access_token.startsWith(`${longPrefix}-`), 'stored 32-character prefix').toBe(true);
        });

        await test.step('stores a title with special characters as literal text', async () => {
            await expect.soft(form.titleInput, 'title on the edit page').toHaveValue(edgeTitle);
            await expect.soft(page.locator('b', { hasText: /^x$/ }), 'rendered markup').toHaveCount(0);
            const stored = await findInstanceByTitle(training, edgeTitle);
            expect.soft(stored?.title, 'stored title').toBe(edgeTitle);
        });

        await test.step('stores the toggles that were changed', async () => {
            const stored = await findInstanceByTitle(training, edgeTitle);
            expect.soft(stored?.backward_mode, 'stored backward mode').toBe(false);
            expect.soft(stored?.show_stepper_bar, 'stored stepper bar').toBe(true);
            expect.soft(stored?.managed, 'stored managed').toBe(false);
        });
    });
});
