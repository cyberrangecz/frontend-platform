import { DAY_MILLISECONDS, fromNow, HOUR_MILLISECONDS } from '../../support/time';
import { expectRedirectedAway } from '../../support/route-guard';
import {
    accessTokenPrefixFor,
    readInstance,
    SECOND_ORGANIZER,
    TOKEN_PREFIX_LIMIT,
    textOfLength,
    waitForInstanceStart,
} from '../../support/pages/training-instance/instance-data';
import { InstanceFormPage } from '../../support/pages/training-instance/instance-form.page';
import { expect, test } from '../../support/pages/training-instance/training-instance-test';
import {
    ConfirmationDialog,
    UserAssign,
    expandPanel,
    navigationEntryByPath,
    expectNoErrorDialog,
    pageTitle,
    waitForNotification,
    expectUrlWhileLoading,
    waitForPageReady,
} from '../../support/ui';

test.use({ account: 'trainingOrganizer' });

const TITLE_LIMIT = 255;

interface StoredOrganizer {
    sub: string;
}

test.describe('linear-instance.edit', () => {
    test('shows the stored values of the instance in the form', async ({ page, createInstance, shared, checkpoint }) => {
        const instance = await createInstance({ purpose: 'editshow' });
        const form = new InstanceFormPage(page);
        await form.openEdit(instance.id);
        await expect(pageTitle(page)).toContainText(instance.title);
        await expect(form.formPanel).toContainText('Edit Training Instance');
        await expect(form.titleInput).toHaveValue(instance.title);
        await expect(form.accessTokenPrefixInput).toHaveValue(instance.accessTokenPrefix);
        await expect(form.trainingDefinitionSelector).toContainText(shared.trainingDefinition.title);
        await expect(form.poolSelector).toContainText(`Pool ${instance.poolId}`);
        await expect(form.showStepperBarToggle).toBeChecked();
        await expect(form.backwardModeToggle).toBeChecked();
        await expect(page.getByText('Whenever you change the access token a new PIN will be generated')).toBeVisible();
        await expect(form.saveControl).toBeDisabled();
        await checkpoint(page, 'edit form loaded');
    });

    test('opens without an error dialog', async ({ page, createInstance }) => {
        const instance = await createInstance({ purpose: 'editnoerror' });
        await page.goto(`/linear-instance/${instance.id}/edit`);
        await waitForPageReady(page);
        await expect(page.getByRole('textbox', { name: 'Title' })).toBeVisible();
        await expectNoErrorDialog(page);
    });

    test('locks the training definition and the pool of an existing instance', async ({ page, createInstance }) => {
        const instance = await createInstance({ purpose: 'editlocked' });
        const form = new InstanceFormPage(page);
        await form.openEdit(instance.id);
        await expect(form.trainingDefinitionSelector.getByRole('combobox')).toHaveAttribute('aria-disabled', 'true');
        await expect(form.poolSelector.getByRole('combobox')).toHaveAttribute('aria-disabled', 'true');
    });

    test('links the pool but not the training definition, which the organizer cannot open', async ({
        page,
        createInstance,
    }) => {
        const instance = await createInstance({ purpose: 'editlinks' });
        const form = new InstanceFormPage(page);
        await form.openEdit(instance.id);
        await expect(page.getByRole('link', { name: 'View selected pool' })).toBeVisible();
        await expect(page.getByRole('link', { name: 'View selected training definition' })).toHaveCount(0);
    });

    test('shows the organizers panel with the creator assigned', async ({ page, createInstance, checkpoint }) => {
        const instance = await createInstance({ purpose: 'editorganizers' });
        const form = new InstanceFormPage(page);
        await form.openEdit(instance.id);
        await expandPanel(page, 'Organizers');
        const assign = UserAssign.in(form.organizersPanel);
        await expect(assign.assignedTable.rows.first()).toBeVisible();
        await expect(assign.assignedTable.headerCell('Login')).toBeVisible();
        await checkpoint(page, 'organizers panel open');
    });

    test.describe('title', () => {
        test('saves a changed title', async ({ page, apiAs, createInstance, uniqueName, checkpoint }) => {
            const instance = await createInstance({ purpose: 'edittitle' });
            const newTitle = uniqueName('edittitle-renamed');
            const form = new InstanceFormPage(page);
            await form.openEdit(instance.id);
            await form.titleInput.fill(newTitle);
            await expect(form.unsavedWarning).toBeVisible();
            await expect(form.saveControl).toBeEnabled();
            await form.save();
            await waitForNotification(page, 'Training instance was successfully saved');
            await checkpoint(page, 'after save');
            await expect(form.unsavedWarning).toHaveCount(0);
            expect((await readInstance(apiAs('trainingOrganizer').training, instance.id)).title).toBe(newTitle);
        });

        test('saves a title with special characters as literal text', async ({
            page,
            apiAs,
            createInstance,
            uniqueName,
        }) => {
            const instance = await createInstance({ purpose: 'editspecial' });
            const newTitle = `${uniqueName('editspecial')} Žluťoučký kůň <b>x</b>`;
            const form = new InstanceFormPage(page);
            await form.openEdit(instance.id);
            await form.titleInput.fill(newTitle);
            await form.save();
            await waitForNotification(page, 'Training instance was successfully saved');
            await expect(form.titleInput).toHaveValue(newTitle);
            await expect(page.locator('b', { hasText: /^x$/ })).toHaveCount(0);
            expect((await readInstance(apiAs('trainingOrganizer').training, instance.id)).title).toBe(newTitle);
        });

        test('saves a title of exactly 255 characters', async ({ page, apiAs, createInstance, uniqueName }) => {
            const instance = await createInstance({ purpose: 'editlongest' });
            const stamp = uniqueName('editlongest');
            const newTitle = `${stamp}${textOfLength(TITLE_LIMIT - stamp.length)}`;
            const form = new InstanceFormPage(page);
            await form.openEdit(instance.id);
            await form.titleInput.fill(newTitle);
            await form.save();
            await waitForNotification(page, 'Training instance was successfully saved');
            expect((await readInstance(apiAs('trainingOrganizer').training, instance.id)).title).toHaveLength(TITLE_LIMIT);
        });

        test('limits the title to 255 characters', async ({ page, createInstance }) => {
            const instance = await createInstance({ purpose: 'editlimit' });
            const form = new InstanceFormPage(page);
            await form.openEdit(instance.id);
            await form.titleInput.fill('');
            await form.titleInput.focus();
            await page.keyboard.insertText(textOfLength(TITLE_LIMIT + 1));
            await expect(form.titleInput).toHaveValue(textOfLength(TITLE_LIMIT));
        });

        test('rejects an empty title and disables Save', async ({ page, createInstance }) => {
            const instance = await createInstance({ purpose: 'editempty' });
            const form = new InstanceFormPage(page);
            await form.openEdit(instance.id);
            await form.titleInput.fill('');
            await form.titleInput.blur();
            await expect(form.titleErrors()).toHaveText('This field is required');
            await expect(form.saveControl).toBeDisabled();
        });

        test('rejects a whitespace-only title and disables Save', async ({ page, createInstance }) => {
            const instance = await createInstance({ purpose: 'editblank' });
            const form = new InstanceFormPage(page);
            await form.openEdit(instance.id);
            await form.titleInput.fill('    ');
            await form.titleInput.blur();
            await expect(form.titleErrors()).toHaveText('This field is required');
            await expect(form.saveControl).toBeDisabled();
        });
    });

    test.describe('access token prefix', () => {
        test('saves a changed prefix and generates a new PIN', async ({ page, apiAs, createInstance, uniqueName }) => {
            const instance = await createInstance({ purpose: 'edittoken' });
            const newPrefix = accessTokenPrefixFor(uniqueName('tk'));
            const form = new InstanceFormPage(page);
            await form.openEdit(instance.id);
            await form.accessTokenPrefixInput.fill(newPrefix);
            await form.save();
            await waitForNotification(page, 'Training instance was successfully saved');
            const stored = await readInstance(apiAs('trainingOrganizer').training, instance.id);
            expect(stored.access_token.startsWith(`${newPrefix}-`)).toBe(true);
            expect(stored.access_token).not.toBe(instance.accessToken);
        });

        test('rejects an empty and a whitespace-only prefix', async ({ page, createInstance }) => {
            const instance = await createInstance({ purpose: 'edittokenempty' });
            const form = new InstanceFormPage(page);
            await form.openEdit(instance.id);
            await form.accessTokenPrefixInput.fill('');
            await form.accessTokenPrefixInput.blur();
            await expect(form.accessTokenErrors()).toHaveText('This field is required');
            await form.accessTokenPrefixInput.fill('   ');
            await expect(form.accessTokenErrors()).toHaveText('This field is required');
            await expect(form.saveControl).toBeDisabled();
        });

        test('limits the prefix to 32 characters', async ({ page, createInstance }) => {
            const instance = await createInstance({ purpose: 'edittokenlimit' });
            const form = new InstanceFormPage(page);
            await form.openEdit(instance.id);
            await form.accessTokenPrefixInput.fill('');
            await form.accessTokenPrefixInput.focus();
            await page.keyboard.insertText(textOfLength(TOKEN_PREFIX_LIMIT + 1));
            await expect(form.accessTokenPrefixInput).toHaveValue(textOfLength(TOKEN_PREFIX_LIMIT));
        });
    });

    test.describe('times and toggles', () => {
        test('saves a changed end time', async ({ page, apiAs, createInstance }) => {
            const instance = await createInstance({ purpose: 'editend' });
            const newEnd = new Date(instance.endTime.getTime() + DAY_MILLISECONDS);
            const form = new InstanceFormPage(page);
            await form.openEdit(instance.id);
            await form.fillTimes(null, newEnd);
            await form.save();
            await waitForNotification(page, 'Training instance was successfully saved');
            const stored = await readInstance(apiAs('trainingOrganizer').training, instance.id);
            expect(Math.abs(new Date(stored.end_time).getTime() - newEnd.getTime())).toBeLessThan(60_000);
        });

        test('rejects an end time before the start time', async ({ page, createInstance }) => {
            const instance = await createInstance({ purpose: 'editendbefore' });
            const form = new InstanceFormPage(page);
            await form.openEdit(instance.id);
            await form.fillTimes(null, new Date(instance.startTime.getTime() - 10 * 60_000));
            await expect(form.endTimeErrors()).toContainText('Start time must be before end time');
            await expect(form.saveControl).toBeDisabled();
        });

        test('rejects an end time in the past', async ({ page, createInstance }) => {
            const instance = await createInstance({ purpose: 'editendpast' });
            const form = new InstanceFormPage(page);
            await form.openEdit(instance.id);
            await form.fillTimes(null, fromNow(-HOUR_MILLISECONDS));
            await expect(form.endTimeErrors().filter({ hasText: 'End time cannot be in the past' })).toHaveCount(1);
        });

        test('saves a changed start time', async ({ page, apiAs, createInstance }) => {
            const instance = await createInstance({ purpose: 'editstart' });
            const newStart = new Date(instance.startTime.getTime() + HOUR_MILLISECONDS);
            const form = new InstanceFormPage(page);
            await form.openEdit(instance.id);
            await form.fillTimes(newStart, instance.endTime);
            await form.save();
            await waitForNotification(page, 'Training instance was successfully saved');
            const stored = await readInstance(apiAs('trainingOrganizer').training, instance.id);
            expect(Math.abs(new Date(stored.start_time).getTime() - newStart.getTime())).toBeLessThan(60_000);
        });

        test('saves the toggles that were changed', async ({ page, apiAs, createInstance }) => {
            const instance = await createInstance({ purpose: 'edittoggles' });
            const form = new InstanceFormPage(page);
            await form.openEdit(instance.id);
            await form.showStepperBarToggle.click();
            await expect(form.backwardModeToggle).toBeDisabled();
            await form.save();
            await waitForNotification(page, 'Training instance was successfully saved');
            const stored = await readInstance(apiAs('trainingOrganizer').training, instance.id);
            expect(stored.show_stepper_bar).toBe(false);
            expect(stored.backward_mode).toBe(false);
        });

        test('locks the start time, the prefix and the toggles once the instance has started', async ({
            page,
            createInstance,
        }) => {
            const instance = await createInstance({ purpose: 'editstarted', startsInMilliseconds: 10_000 });
            await waitForInstanceStart(instance);
            const form = new InstanceFormPage(page);
            await form.openEdit(instance.id);
            await expect(form.startTimeInput).toBeDisabled();
            await expect(form.accessTokenPrefixInput).toBeDisabled();
            await expect(form.showStepperBarToggle).toBeDisabled();
            await expect(form.backwardModeToggle).toBeDisabled();
            await expect(form.titleInput).toBeEnabled();
            await expect(form.endTimeInput).toBeEnabled();
        });
    });

    test.describe('organizers', () => {
        test('adds an organizer and removes it again', async ({ page, apiAs, createInstance, checkpoint }) => {
            const instance = await createInstance({ purpose: 'editassign' });
            const form = new InstanceFormPage(page);
            await form.openEdit(instance.id);
            await expandPanel(page, 'Organizers');
            const assign = UserAssign.in(form.organizersPanel);
            await expect(assign.addButton).toBeDisabled();
            await assign.chooseCandidate(page, SECOND_ORGANIZER.search);
            await expect(assign.addButton).toBeEnabled();
            await assign.addChosen();
            await expect(assign.assignedTable.rowByText(SECOND_ORGANIZER.search)).toBeVisible();
            await checkpoint(page, 'organizer added');
            const training = apiAs('trainingOrganizer').training;
            await expect
                .poll(async () =>
                    (await training.getAll<StoredOrganizer>(`/training-instances/${instance.id}/organizers`)).map(
                        (organizer) => organizer.sub,
                    ),
                )
                .toContain(SECOND_ORGANIZER.login);
            await assign.removeAssigned(SECOND_ORGANIZER.search);
            await expect(assign.assignedTable.rowByText(SECOND_ORGANIZER.search)).toHaveCount(0);
            await expect
                .poll(async () =>
                    (await training.getAll<StoredOrganizer>(`/training-instances/${instance.id}/organizers`)).map(
                        (organizer) => organizer.sub,
                    ),
                )
                .not.toContain(SECOND_ORGANIZER.login);
        });

        test('disables Delete until an organizer row is selected', async ({ page, createInstance }) => {
            const instance = await createInstance({ purpose: 'editdelete' });
            const form = new InstanceFormPage(page);
            await form.openEdit(instance.id);
            await expandPanel(page, 'Organizers');
            const assign = UserAssign.in(form.organizersPanel);
            await expect(assign.deleteButton).toBeDisabled();
            const table = assign.assignedTable;
            await table.rowCheckbox(table.rows.first()).check();
            await expect(assign.deleteButton).toBeEnabled();
        });
    });

    test.describe('leaving', () => {
        test('keeps the edits when leaving is cancelled', async ({ page, createInstance }) => {
            const instance = await createInstance({ purpose: 'editstay' });
            const form = new InstanceFormPage(page);
            await form.openEdit(instance.id);
            await form.titleInput.fill(`${instance.title}-changed`);
            await navigationEntryByPath(page, '/linear-instance').first().click();
            const dialog = new ConfirmationDialog(page, 'Unsaved changes');
            await expect(dialog.title).toBeVisible();
            await dialog.cancel();
            await expectUrlWhileLoading(page, new RegExp(`/linear-instance/${instance.id}/edit$`));
            await expect(form.titleInput).toHaveValue(`${instance.title}-changed`);
        });

        test('discards the edits when leaving is confirmed', async ({ page, apiAs, createInstance }) => {
            const instance = await createInstance({ purpose: 'editleave' });
            const form = new InstanceFormPage(page);
            await form.openEdit(instance.id);
            await form.titleInput.fill(`${instance.title}-discarded`);
            await navigationEntryByPath(page, '/linear-instance').first().click();
            await new ConfirmationDialog(page, 'Unsaved changes').confirm();
            await expectUrlWhileLoading(page, /\/linear-instance$/);
            expect((await readInstance(apiAs('trainingOrganizer').training, instance.id)).title).toBe(instance.title);
        });

        test('leaves without a question once the edits are saved', async ({ page, createInstance }) => {
            const instance = await createInstance({ purpose: 'editsavedleave' });
            const form = new InstanceFormPage(page);
            await form.openEdit(instance.id);
            await form.titleInput.fill(`${instance.title}-saved`);
            await form.save();
            await waitForNotification(page, 'Training instance was successfully saved');
            await navigationEntryByPath(page, '/linear-instance').first().click();
            await expectUrlWhileLoading(page, /\/linear-instance$/);
        });
    });

    test.describe('access', () => {
        for (const role of ['trainingDesigner', 'trainee'] as const) {
            test(`sends the ${role} account away from /linear-instance/:id/edit`, async ({ openAs, createInstance }) => {
                const instance = await createInstance({ purpose: `editaccess-${role}` });
                await expectRedirectedAway(openAs, role, `/linear-instance/${instance.id}/edit`);
            });
        }
    });
});
