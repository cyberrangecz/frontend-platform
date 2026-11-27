import type { Page } from '@playwright/test';
import { DAY_MILLISECONDS, fromNow, HOUR_MILLISECONDS } from '../../support/time';
import {
    accessTokenPrefixFor,
    readInstance,
    SECOND_ORGANIZER,
    TOKEN_PREFIX_LIMIT,
    textOfLength,
} from '../../support/pages/training-instance/instance-data';
import { InstanceFormPage } from '../../support/pages/training-instance/instance-form.page';
import { expect, test } from '../../support/pages/training-instance/training-instance-test';
import {
    ConfirmationDialog,
    UserAssign,
    expandPanel,
    navigationEntryByPath,
    expectNoErrorDialog,
    notificationPopups,
    pageTitle,
    waitForNotification,
    expectUrlWhileLoading,
} from '../../support/ui';

test.use({ account: 'trainingOrganizer' });

const TITLE_LIMIT = 255;
const MERGED_TEST_TIMEOUT_MILLISECONDS = 360_000;
const POPUP_CLOSE_TIMEOUT_MILLISECONDS = 30_000;

interface StoredOrganizer {
    sub: string;
}

/**
 * Presses Save, waits for the saved notification and for its popup to close, so the next save's wait
 * cannot be satisfied by this popup.
 */
async function saveAndAwaitConfirmation(page: Page, form: InstanceFormPage): Promise<void> {
    await form.save();
    await waitForNotification(page, 'Training instance was successfully saved');
    await expect(notificationPopups(page)).toHaveCount(0, { timeout: POPUP_CLOSE_TIMEOUT_MILLISECONDS });
}

test.describe('linear-instance.edit', () => {
    test('checks the display and the validation of the edit form without saving', async ({
        page,
        createInstance,
        shared,
        checkpoint,
    }) => {
        test.setTimeout(MERGED_TEST_TIMEOUT_MILLISECONDS);
        const instance = await createInstance({ purpose: 'editcheck' });
        const form = new InstanceFormPage(page);
        await form.openEdit(instance.id);

        await test.step('shows the stored values of the instance in the form', async () => {
            await expect.soft(pageTitle(page), 'page title').toContainText(instance.title);
            await expect.soft(form.formPanel, 'form panel').toContainText('Edit Training Instance');
            await expect.soft(form.titleInput, 'title').toHaveValue(instance.title);
            await expect.soft(form.accessTokenPrefixInput, 'access token prefix').toHaveValue(instance.accessTokenPrefix);
            await expect
                .soft(form.trainingDefinitionSelector, 'training definition')
                .toContainText(shared.trainingDefinition.title);
            await expect.soft(form.poolSelector, 'pool').toContainText(`Pool ${instance.poolId}`);
            await expect.soft(form.showStepperBarToggle, 'stepper bar toggle').toBeChecked();
            await expect.soft(form.backwardModeToggle, 'backward mode toggle').toBeChecked();
            await expect
                .soft(
                    page.getByText('Whenever you change the access token a new PIN will be generated'),
                    'access token hint',
                )
                .toBeVisible();
            await expect.soft(form.saveControl, 'Save control').toBeDisabled();
            await checkpoint(page, 'edit form loaded');
        });

        await test.step('opens without an error dialog', async () => {
            await expect.soft(page.getByRole('textbox', { name: 'Title' }), 'title field').toBeVisible();
            await expectNoErrorDialog(page);
        });

        await test.step('locks the training definition and the pool of an existing instance', async () => {
            await expect
                .soft(form.trainingDefinitionSelector.getByRole('combobox'), 'training definition selector')
                .toHaveAttribute('aria-disabled', 'true');
            await expect
                .soft(form.poolSelector.getByRole('combobox'), 'pool selector')
                .toHaveAttribute('aria-disabled', 'true');
        });

        await test.step('links the pool but not the training definition, which the organizer cannot open', async () => {
            await expect
                .soft(page.getByRole('link', { name: 'View selected pool' }), 'pool link')
                .toBeVisible();
            await expect
                .soft(page.getByRole('link', { name: 'View selected training definition' }), 'definition link')
                .toHaveCount(0);
        });

        await test.step('limits the title to 255 characters', async () => {
            await form.titleInput.fill('');
            await form.titleInput.focus();
            await page.keyboard.insertText(textOfLength(TITLE_LIMIT + 1));
            await expect.soft(form.titleInput, 'title').toHaveValue(textOfLength(TITLE_LIMIT));
            await form.titleInput.fill(instance.title);
        });

        await test.step('rejects an empty title and disables Save', async () => {
            await form.titleInput.fill('');
            await form.titleInput.blur();
            await expect.soft(form.titleErrors(), 'title errors').toHaveText('This field is required');
            await expect.soft(form.saveControl, 'Save control').toBeDisabled();
            await form.titleInput.fill(instance.title);
        });

        await test.step('rejects a whitespace-only title and disables Save', async () => {
            await form.titleInput.fill('    ');
            await form.titleInput.blur();
            await expect.soft(form.titleErrors(), 'title errors').toHaveText('This field is required');
            await expect.soft(form.saveControl, 'Save control').toBeDisabled();
            await form.titleInput.fill(instance.title);
        });

        await test.step('rejects an empty and a whitespace-only prefix', async () => {
            await form.accessTokenPrefixInput.fill('');
            await form.accessTokenPrefixInput.blur();
            await expect.soft(form.accessTokenErrors(), 'errors of the empty prefix').toHaveText('This field is required');
            await form.accessTokenPrefixInput.fill('   ');
            await expect
                .soft(form.accessTokenErrors(), 'errors of the whitespace-only prefix')
                .toHaveText('This field is required');
            await expect.soft(form.saveControl, 'Save control').toBeDisabled();
            await form.accessTokenPrefixInput.fill(instance.accessTokenPrefix);
        });

        await test.step('limits the prefix to 32 characters', async () => {
            await form.accessTokenPrefixInput.fill('');
            await form.accessTokenPrefixInput.focus();
            await page.keyboard.insertText(textOfLength(TOKEN_PREFIX_LIMIT + 1));
            await expect
                .soft(form.accessTokenPrefixInput, 'prefix')
                .toHaveValue(textOfLength(TOKEN_PREFIX_LIMIT));
            await form.accessTokenPrefixInput.fill(instance.accessTokenPrefix);
        });

        await test.step('rejects an end time before the start time', async () => {
            await form.fillTimes(null, new Date(instance.startTime.getTime() - 10 * 60_000));
            await expect
                .soft(form.endTimeErrors(), 'end time errors')
                .toContainText('Start time must be before end time');
            await expect.soft(form.saveControl, 'Save control').toBeDisabled();
            await form.fillTimes(null, instance.endTime);
        });

        await test.step('rejects an end time in the past', async () => {
            await form.fillTimes(null, fromNow(-HOUR_MILLISECONDS));
            await expect
                .soft(form.endTimeErrors().filter({ hasText: 'End time cannot be in the past' }), 'past end time error')
                .toHaveCount(1);
        });
    });

    test('saves every editable field of the instance and checks leaving', async ({
        page,
        apiAs,
        createInstance,
        uniqueName,
        checkpoint,
    }) => {
        test.setTimeout(MERGED_TEST_TIMEOUT_MILLISECONDS);
        const training = apiAs('trainingOrganizer').training;
        const instance = await createInstance({ purpose: 'editsave' });
        const form = new InstanceFormPage(page);
        await form.openEdit(instance.id);

        await test.step('saves a changed title', async () => {
            const newTitle = uniqueName('edittitle-renamed');
            await form.titleInput.fill(newTitle);
            await expect(form.unsavedWarning).toBeVisible();
            await expect(form.saveControl).toBeEnabled();
            await saveAndAwaitConfirmation(page, form);
            await checkpoint(page, 'after save');
            await expect(form.unsavedWarning).toHaveCount(0);
            expect((await readInstance(training, instance.id)).title).toBe(newTitle);
        });

        await test.step('saves a title with special characters as literal text', async () => {
            const newTitle = `${uniqueName('editspecial')} Žluťoučký kůň <b>x</b>`;
            await form.titleInput.fill(newTitle);
            await saveAndAwaitConfirmation(page, form);
            await expect(form.titleInput).toHaveValue(newTitle);
            await expect(page.locator('b', { hasText: /^x$/ })).toHaveCount(0);
            expect((await readInstance(training, instance.id)).title).toBe(newTitle);
        });

        await test.step('saves a title of exactly 255 characters', async () => {
            const stamp = uniqueName('editlongest');
            const newTitle = `${stamp}${textOfLength(TITLE_LIMIT - stamp.length)}`;
            await form.titleInput.fill(newTitle);
            await saveAndAwaitConfirmation(page, form);
            expect((await readInstance(training, instance.id)).title).toHaveLength(TITLE_LIMIT);
        });

        await test.step('saves a changed prefix and generates a new PIN', async () => {
            const newPrefix = accessTokenPrefixFor(uniqueName('tk'));
            await form.accessTokenPrefixInput.fill(newPrefix);
            await saveAndAwaitConfirmation(page, form);
            const stored = await readInstance(training, instance.id);
            expect(stored.access_token.startsWith(`${newPrefix}-`)).toBe(true);
            expect(stored.access_token).not.toBe(instance.accessToken);
        });

        const newEnd = new Date(instance.endTime.getTime() + DAY_MILLISECONDS);

        await test.step('saves a changed end time', async () => {
            await form.fillTimes(null, newEnd);
            await saveAndAwaitConfirmation(page, form);
            const stored = await readInstance(training, instance.id);
            expect(Math.abs(new Date(stored.end_time).getTime() - newEnd.getTime())).toBeLessThan(60_000);
        });

        await test.step('saves a changed start time', async () => {
            const newStart = new Date(instance.startTime.getTime() + HOUR_MILLISECONDS);
            await form.fillTimes(newStart, newEnd);
            await saveAndAwaitConfirmation(page, form);
            const stored = await readInstance(training, instance.id);
            expect(Math.abs(new Date(stored.start_time).getTime() - newStart.getTime())).toBeLessThan(60_000);
        });

        await test.step('saves the toggles that were changed', async () => {
            await form.showStepperBarToggle.click();
            await expect(form.backwardModeToggle).toBeDisabled();
            await expect(form.managedToggle).toBeEnabled();
            await form.managedToggle.click();
            await saveAndAwaitConfirmation(page, form);
            const stored = await readInstance(training, instance.id);
            expect(stored.show_stepper_bar).toBe(false);
            expect(stored.backward_mode).toBe(false);
            expect(stored.managed).toBe(false);
        });

        const leaveToOverview = (): Promise<void> => navigationEntryByPath(page, '/linear-instance').first().click();
        const titleBeforeLeaving = (await readInstance(training, instance.id)).title;
        const withSuffix = (suffix: string): string =>
            `${titleBeforeLeaving.slice(0, TITLE_LIMIT - suffix.length)}${suffix}`;

        await test.step('keeps the edits when leaving is cancelled', async () => {
            await form.titleInput.fill(withSuffix('-changed'));
            await leaveToOverview();
            const dialog = new ConfirmationDialog(page, 'Unsaved changes');
            await expect(dialog.title).toBeVisible();
            await dialog.cancel();
            await expectUrlWhileLoading(page, new RegExp(`/linear-instance/${instance.id}/edit$`));
            await expect(form.titleInput).toHaveValue(withSuffix('-changed'));
        });

        await test.step('discards the edits when leaving is confirmed', async () => {
            await form.titleInput.fill(withSuffix('-discarded'));
            await leaveToOverview();
            await new ConfirmationDialog(page, 'Unsaved changes').confirm();
            await expectUrlWhileLoading(page, /\/linear-instance$/);
            expect((await readInstance(training, instance.id)).title).toBe(titleBeforeLeaving);
        });

        await test.step('leaves without a question once the edits are saved', async () => {
            await form.openEdit(instance.id);
            await form.titleInput.fill(withSuffix('-saved'));
            await saveAndAwaitConfirmation(page, form);
            await leaveToOverview();
            await expectUrlWhileLoading(page, /\/linear-instance$/);
        });
    });

    test('assigns and removes organizers of an instance', async ({ page, apiAs, createInstance, checkpoint }) => {
        test.setTimeout(MERGED_TEST_TIMEOUT_MILLISECONDS);
        const instance = await createInstance({ purpose: 'editorganizers' });
        const training = apiAs('trainingOrganizer').training;
        const form = new InstanceFormPage(page);
        await form.openEdit(instance.id);
        await expandPanel(page, 'Organizers');
        const assign = UserAssign.in(form.organizersPanel);
        const organizerLogins = async (): Promise<string[]> =>
            (await training.getAll<StoredOrganizer>(`/training-instances/${instance.id}/organizers`)).map(
                (organizer) => organizer.sub,
            );

        await test.step('shows the organizers panel with the creator assigned', async () => {
            await expect.soft(assign.assignedTable.rows.first(), 'creator row').toBeVisible();
            await expect.soft(assign.assignedTable.headerCell('Login'), 'login column').toBeVisible();
            await checkpoint(page, 'organizers panel open');
        });

        await test.step('adds an organizer and removes it again', async () => {
            await expect(assign.addButton).toBeDisabled();
            await assign.chooseCandidate(page, SECOND_ORGANIZER.search);
            await expect(assign.addButton).toBeEnabled();
            await assign.addChosen();
            await expect(assign.assignedTable.rowByText(SECOND_ORGANIZER.search)).toBeVisible();
            await checkpoint(page, 'organizer added');
            await expect.poll(organizerLogins).toContain(SECOND_ORGANIZER.login);
            await assign.removeAssigned(SECOND_ORGANIZER.search);
            await expect(assign.assignedTable.rowByText(SECOND_ORGANIZER.search)).toHaveCount(0);
            await expect.poll(organizerLogins).not.toContain(SECOND_ORGANIZER.login);
        });

        await test.step('disables Delete until an organizer row is selected', async () => {
            await expect.soft(assign.deleteButton, 'Delete before selecting').toBeDisabled();
            const table = assign.assignedTable;
            const creatorCheckbox = table.rowCheckbox(table.rows.first());
            await creatorCheckbox.check();
            await expect.soft(assign.deleteButton, 'Delete with a row selected').toBeEnabled();
            await creatorCheckbox.uncheck();
            await expect.soft(assign.deleteButton, 'Delete after unselecting').toBeDisabled();
        });
    });
});
