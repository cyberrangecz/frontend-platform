import { expect, test } from '../../support/fixtures';
import { expectRedirectedAway } from '../../support/route-guard';
import { DefinitionEditorPage } from '../../support/pages/training-definition/definition-editor.page';
import { expectInputValues } from '../../support/pages/training-definition/input-values';
import {
    fetchDefinitionByTitle,
    fetchDefinitionDetailByTitle,
    requireDefinitionByTitle,
} from '../../support/pages/training-definition/training-definition-data';
import {
    breadcrumbLink,
    ConfirmationDialog,
    expansionPanelHeader,
    pageTitle,
    waitForNotification,
} from '../../support/ui';

const TITLE_LIMIT = 255;
const DESCRIPTION_LIMIT = 2048;
const SPECIAL_TEXT = 'Žluťoučký kůň <b>x</b>';

test.describe('linear-definition.create', () => {
    test.use({ account: 'trainingDesigner' });

    test.describe('initial state', () => {
        test('shows the create heading, an empty form and a disabled Save control', async ({ page, checkpoint }) => {
            const editor = new DefinitionEditorPage(page);
            await editor.gotoCreate();
            await expect(pageTitle(page)).toHaveText('Create Training Definition');
            await expect(editor.title).toHaveValue('');
            await expect(editor.description).toHaveValue('');
            await expect(editor.predefinedLevelsCheckbox).not.toBeChecked();
            await expect(editor.notes.items).toHaveCount(0);
            await expect(editor.outcomes.items).toHaveCount(0);
            await expect(editor.saveButton).toBeDisabled();
            await expect(editor.unsavedChangesWarning).toBeHidden();
            await checkpoint(page, 'create page loaded');
        });

        test('explains that levels need a saved definition and offers no level controls', async ({ page }) => {
            const editor = new DefinitionEditorPage(page);
            await editor.gotoCreate();
            await expect(editor.levelsUnavailableHint).toBeVisible();
            await expect(editor.levels.addButton).toHaveCount(0);
        });

        test('offers no Designers panel before the definition is saved', async ({ page }) => {
            const editor = new DefinitionEditorPage(page);
            await editor.gotoCreate();
            await expect(expansionPanelHeader(page, 'Designers')).toHaveCount(0);
        });

        test('collapses and expands the Training Definition panel', async ({ page }) => {
            const editor = new DefinitionEditorPage(page);
            await editor.gotoCreate();
            const header = expansionPanelHeader(page, 'Training Definition').first();
            await expect(header).toHaveAttribute('aria-expanded', 'true');
            await header.click();
            await expect(header).toHaveAttribute('aria-expanded', 'false');
            await expect(editor.title).toBeHidden();
            await header.click();
            await expect(header).toHaveAttribute('aria-expanded', 'true');
            await expect(editor.title).toBeVisible();
        });
    });

    test.describe('title', () => {
        test('keeps Save disabled until a title is entered', async ({ page, uniqueName }) => {
            const editor = new DefinitionEditorPage(page);
            await editor.gotoCreate();
            await editor.title.fill(uniqueName('title-enables-save'));
            await expect(editor.saveButton).toBeEnabled();
            await editor.title.fill('');
            await expect(editor.saveButton).toBeDisabled();
        });

        test('refuses a whitespace-only title', async ({ page }) => {
            const editor = new DefinitionEditorPage(page);
            await editor.gotoCreate();
            await editor.title.fill('   ');
            await editor.title.blur();
            await expect(editor.titleErrors).toContainText('Title cannot be empty');
            await expect(editor.saveButton).toBeDisabled();
        });

        test('accepts a title of exactly 255 characters and saves it whole', async ({
            page,
            apiAs,
            uniqueName,
        }) => {
            const title = uniqueName('title-limit').padEnd(TITLE_LIMIT, 'x');
            const editor = new DefinitionEditorPage(page);
            await editor.gotoCreate();
            await editor.title.fill(title);
            await expect(editor.title).toHaveValue(title);
            await editor.saveButton.click();
            await expect(page).toHaveURL(/\/linear-definition\/\d+\/edit$/);
            expect((await requireDefinitionByTitle(apiAs('trainingDesigner'), title)).title).toHaveLength(TITLE_LIMIT);
        });

        test('stops accepting characters after the 255th', async ({ page, uniqueName }) => {
            const title = uniqueName('title-over').padEnd(TITLE_LIMIT + 1, 'x');
            const editor = new DefinitionEditorPage(page);
            await editor.gotoCreate();
            await editor.title.fill(title);
            await expect(editor.title).toHaveValue(title.slice(0, TITLE_LIMIT));
        });

        test('shows special characters as literal text and saves them unchanged', async ({
            page,
            apiAs,
            uniqueName,
        }) => {
            const title = `${SPECIAL_TEXT} ${uniqueName('title-special')}`;
            const editor = new DefinitionEditorPage(page);
            await editor.gotoCreate();
            await editor.title.fill(title);
            await editor.saveButton.click();
            await expect(page).toHaveURL(/\/linear-definition\/\d+\/edit$/);
            await expect(editor.title).toHaveValue(title);
            await expect(pageTitle(page)).toContainText('<b>x</b>');
            await expect(pageTitle(page).locator('b')).toHaveCount(0);
            expect((await requireDefinitionByTitle(apiAs('trainingDesigner'), title)).title).toBe(title);
        });

        test('empties the title with the clear button', async ({ page }) => {
            const editor = new DefinitionEditorPage(page);
            await editor.gotoCreate();
            await editor.title.fill('to be cleared');
            await editor.clearTitleButton.click();
            await expect(editor.title).toHaveValue('');
            await expect(editor.saveButton).toBeDisabled();
        });
    });

    test.describe('description', () => {
        test('accepts a description of exactly 2048 characters', async ({ page, apiAs, uniqueName }) => {
            const title = uniqueName('description-limit');
            const description = 'd'.repeat(DESCRIPTION_LIMIT);
            const editor = new DefinitionEditorPage(page);
            await editor.gotoCreate();
            await editor.title.fill(title);
            await editor.description.fill(description);
            await expect(editor.description).toHaveValue(description);
            await editor.saveButton.click();
            await expect(page).toHaveURL(/\/linear-definition\/\d+\/edit$/);
            expect((await fetchDefinitionDetailByTitle(apiAs('trainingDesigner'), title)).description).toBe(description);
        });

        test('stops accepting characters after the 2048th', async ({ page }) => {
            const editor = new DefinitionEditorPage(page);
            await editor.gotoCreate();
            await editor.description.fill('d'.repeat(DESCRIPTION_LIMIT + 1));
            await expect(editor.description).toHaveValue('d'.repeat(DESCRIPTION_LIMIT));
        });

        test('shows special characters of the description as literal text', async ({ page, apiAs, uniqueName }) => {
            const title = uniqueName('description-special');
            const editor = new DefinitionEditorPage(page);
            await editor.gotoCreate();
            await editor.title.fill(title);
            await editor.description.fill(SPECIAL_TEXT);
            await editor.saveButton.click();
            await expect(page).toHaveURL(/\/linear-definition\/\d+\/edit$/);
            await expect(editor.description).toHaveValue(SPECIAL_TEXT);
            expect((await fetchDefinitionDetailByTitle(apiAs('trainingDesigner'), title)).description).toBe(SPECIAL_TEXT);
        });

        test('empties the description with the clear button', async ({ page }) => {
            const editor = new DefinitionEditorPage(page);
            await editor.gotoCreate();
            await editor.description.fill('to be cleared');
            await editor.clearDescriptionButton.click();
            await expect(editor.description).toHaveValue('');
        });
    });

    test.describe('notes for instructors and learning outcomes', () => {
        test('adds, edits and removes a note', async ({ page }) => {
            const editor = new DefinitionEditorPage(page);
            await editor.gotoCreate();
            await editor.notes.addItem('first note');
            await editor.notes.addItem('second note');
            await expectInputValues(editor.notes.items, ['first note', 'second note']);
            await editor.notes.items.first().fill('edited note');
            await expect(editor.notes.items.first()).toHaveValue('edited note');
            await editor.notes.removeButton(0).click();
            await expectInputValues(editor.notes.items, ['second note']);
        });

        test('adds, edits and removes a learning outcome', async ({ page }) => {
            const editor = new DefinitionEditorPage(page);
            await editor.gotoCreate();
            await editor.outcomes.addItem('first outcome');
            await editor.outcomes.addItem('second outcome');
            await expectInputValues(editor.outcomes.items, ['first outcome', 'second outcome']);
            await editor.outcomes.items.last().fill('edited outcome');
            await expect(editor.outcomes.items.last()).toHaveValue('edited outcome');
            await editor.outcomes.removeButton(1).click();
            await expectInputValues(editor.outcomes.items, ['first outcome']);
        });

        test('removes every note with Delete all and disables the button on an empty list', async ({ page }) => {
            const editor = new DefinitionEditorPage(page);
            await editor.gotoCreate();
            await expect(editor.notes.deleteAllButton).toBeDisabled();
            await editor.notes.addItem('one');
            await editor.notes.addItem('two');
            await editor.notes.deleteAllButton.click();
            await expect(editor.notes.items).toHaveCount(0);
            await expect(editor.notes.deleteAllButton).toBeDisabled();
        });

        test('flags a whitespace-only note', async ({ page }) => {
            const editor = new DefinitionEditorPage(page);
            await editor.gotoCreate();
            await editor.notes.addItem('   ');
            await expect(editor.notes.errors).toHaveText('Notes must be at least 2 characters.');
        });

        test('saves notes and outcomes with the definition', async ({ page, apiAs, uniqueName }) => {
            const title = uniqueName('notes-saved');
            const editor = new DefinitionEditorPage(page);
            await editor.gotoCreate();
            await editor.title.fill(title);
            await editor.notes.addItem('Bring a laptop');
            await editor.notes.addItem(SPECIAL_TEXT);
            await editor.outcomes.addItem('Reads a packet capture');
            await editor.saveButton.click();
            await expect(page).toHaveURL(/\/linear-definition\/\d+\/edit$/);
            const detail = await fetchDefinitionDetailByTitle(apiAs('trainingDesigner'), title);
            expect(detail.prerequisites).toEqual(['Bring a laptop', SPECIAL_TEXT]);
            expect(detail.outcomes).toEqual(['Reads a packet capture']);
            await expectInputValues(editor.notes.items, ['Bring a laptop', SPECIAL_TEXT]);
            await expectInputValues(editor.outcomes.items, ['Reads a packet capture']);
        });
    });

    test.describe('predefined levels', () => {
        test('creates the definition without levels when the checkbox stays off', async ({
            page,
            apiAs,
            uniqueName,
        }) => {
            const title = uniqueName('predefined-off');
            const editor = new DefinitionEditorPage(page);
            await editor.gotoCreate();
            await editor.title.fill(title);
            await editor.saveButton.click();
            await expect(page).toHaveURL(/\/linear-definition\/\d+\/edit$/);
            const detail = await fetchDefinitionDetailByTitle(apiAs('trainingDesigner'), title);
            expect(detail.levels ?? []).toHaveLength(0);
            await expect(editor.levels.emptyHint).toBeVisible();
        });

        test('creates predefined levels when the checkbox is ticked', async ({ page, apiAs, uniqueName, checkpoint }) => {
            const title = uniqueName('predefined-on');
            const editor = new DefinitionEditorPage(page);
            await editor.gotoCreate();
            await editor.title.fill(title);
            await editor.predefinedLevelsCheckbox.check();
            await editor.saveButton.click();
            await expect(page).toHaveURL(/\/linear-definition\/\d+\/edit$/);
            const detail = await fetchDefinitionDetailByTitle(apiAs('trainingDesigner'), title);
            expect((detail.levels ?? []).length).toBeGreaterThan(0);
            await expect(editor.levels.steps).toHaveCount((detail.levels ?? []).length);
            await checkpoint(page, 'predefined levels created');
        });

        test('shows the checkbox only on the create page', async ({ page, apiAs, uniqueName }) => {
            const title = uniqueName('predefined-edit-hidden');
            const editor = new DefinitionEditorPage(page);
            await editor.gotoCreate();
            await editor.title.fill(title);
            await editor.saveButton.click();
            await expect(page).toHaveURL(/\/linear-definition\/\d+\/edit$/);
            await expect(editor.predefinedLevelsCheckbox).toHaveCount(0);
            await requireDefinitionByTitle(apiAs('trainingDesigner'), title);
        });
    });

    test.describe('saving', () => {
        test('creates an unreleased definition, announces it and opens its edit page', async ({
            page,
            apiAs,
            uniqueName,
            checkpoint,
        }) => {
            const title = uniqueName('save-minimal');
            const editor = new DefinitionEditorPage(page);
            await editor.gotoCreate();
            await editor.title.fill(title);
            await expect(editor.unsavedChangesWarning).toBeVisible();
            await editor.saveButton.click();
            expect((await waitForNotification(page, /was created/i)).kind).toBe('success');
            await expect(page).toHaveURL(/\/linear-definition\/\d+\/edit$/);
            await expect(pageTitle(page)).toContainText(title);
            await expect(editor.unsavedChangesWarning).toBeHidden();
            await checkpoint(page, 'definition saved');
            expect((await requireDefinitionByTitle(apiAs('trainingDesigner'), title)).state).toBe('UNRELEASED');
        });

        test('offers the Designers panel and level controls once the definition is saved', async ({
            page,
            uniqueName,
        }) => {
            const editor = new DefinitionEditorPage(page);
            await editor.gotoCreate();
            await editor.title.fill(uniqueName('save-unlocks'));
            await editor.saveButton.click();
            await expect(page).toHaveURL(/\/linear-definition\/\d+\/edit$/);
            await expect(expansionPanelHeader(page, 'Designers').first()).toBeVisible();
            await expect(editor.levels.addButton).toBeEnabled();
        });
    });

    test.describe('leaving with unsaved changes', () => {
        test('asks for confirmation and stays on the page after Cancel', async ({ page, uniqueName, checkpoint }) => {
            const editor = new DefinitionEditorPage(page);
            await editor.gotoCreate();
            const title = uniqueName('leave-cancel');
            await editor.title.fill(title);
            await breadcrumbLink(page, 'Training Definitions').click();
            const dialog = new ConfirmationDialog(page, 'Unsaved changes');
            await expect(dialog.message).toContainText('There are unsaved changes');
            await checkpoint(page, 'unsaved changes dialog');
            await dialog.cancel();
            await expect(dialog.root).toBeHidden();
            await expect(page).toHaveURL(/\/linear-definition\/create$/);
            await expect(editor.title).toHaveValue(title);
        });

        test('leaves the page after Leave and creates nothing', async ({ page, apiAs, uniqueName }) => {
            const editor = new DefinitionEditorPage(page);
            await editor.gotoCreate();
            const title = uniqueName('leave-confirm');
            await editor.title.fill(title);
            await breadcrumbLink(page, 'Training Definitions').click();
            await new ConfirmationDialog(page, 'Unsaved changes').confirm();
            await expect(page).toHaveURL(/\/linear-definition$/);
            expect(await fetchDefinitionByTitle(apiAs('trainingDesigner'), title)).toBeUndefined();
        });

        test('leaves without asking when nothing was entered', async ({ page }) => {
            const editor = new DefinitionEditorPage(page);
            await editor.gotoCreate();
            await breadcrumbLink(page, 'Training Definitions').click();
            await expect(page).toHaveURL(/\/linear-definition$/);
        });

        test('leaves without asking after the definition was saved', async ({ page, uniqueName }) => {
            const editor = new DefinitionEditorPage(page);
            await editor.gotoCreate();
            await editor.title.fill(uniqueName('leave-after-save'));
            await editor.saveButton.click();
            await expect(page).toHaveURL(/\/linear-definition\/\d+\/edit$/);
            await expect(editor.unsavedChangesWarning).toBeHidden();
            await breadcrumbLink(page, 'Training Definitions').click();
            await expect(page).toHaveURL(/\/linear-definition$/);
        });
    });

    test.describe('access by role', () => {
        for (const role of ['trainingOrganizer', 'trainee'] as const) {
            test(`sends the ${role} account away from /linear-definition/create`, async ({ openAs }) => {
                await expectRedirectedAway(openAs, role, '/linear-definition/create');
            });
        }
    });
});
