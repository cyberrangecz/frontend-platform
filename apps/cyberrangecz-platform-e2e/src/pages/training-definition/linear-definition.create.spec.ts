import { expect, test } from '../../support/fixtures';
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
const EDIT_PAGE_URL = /\/linear-definition\/\d+\/edit$/;

test.describe('linear-definition.create', () => {
    test.use({ account: 'trainingDesigner' });

    test('checks the create form without saving', async ({
        page,
        apiAs,
        uniqueName,
        checkpoint,
    }) => {
        test.slow();
        const editor = new DefinitionEditorPage(page);
        await editor.gotoCreate();

        await test.step('shows the create heading, an empty form and a disabled Save control', async () => {
            await expect
                .soft(pageTitle(page), 'page title')
                .toHaveText('Create Training Definition');
            await expect.soft(editor.title, 'title').toHaveValue('');
            await expect
                .soft(editor.description, 'description')
                .toHaveValue('');
            await expect
                .soft(
                    editor.predefinedLevelsCheckbox,
                    'predefined levels checkbox',
                )
                .not.toBeChecked();
            await expect.soft(editor.notes.items, 'notes').toHaveCount(0);
            await expect.soft(editor.outcomes.items, 'outcomes').toHaveCount(0);
            await expect.soft(editor.saveButton, 'Save control').toBeDisabled();
            await expect
                .soft(editor.unsavedChangesWarning, 'unsaved changes warning')
                .toBeHidden();
            await checkpoint(page, 'create page loaded');
        });

        await test.step('explains that levels need a saved definition and offers no level controls', async () => {
            await expect
                .soft(editor.levelsUnavailableHint, 'levels hint')
                .toBeVisible();
            await expect
                .soft(editor.levels.addButton, 'level controls')
                .toHaveCount(0);
        });

        await test.step('offers no Designers panel before the definition is saved', async () => {
            await expect
                .soft(
                    expansionPanelHeader(page, 'Designers'),
                    'Designers panel',
                )
                .toHaveCount(0);
        });

        await test.step('collapses and expands the Training Definition panel', async () => {
            const header = expansionPanelHeader(
                page,
                'Training Definition',
            ).first();
            await expect
                .soft(header, 'panel starts expanded')
                .toHaveAttribute('aria-expanded', 'true');
            await header.click();
            await expect
                .soft(header, 'panel collapsed')
                .toHaveAttribute('aria-expanded', 'false');
            await expect
                .soft(editor.title, 'title hidden while collapsed')
                .toBeHidden();
            await header.click();
            await expect
                .soft(header, 'panel expanded again')
                .toHaveAttribute('aria-expanded', 'true');
            await expect
                .soft(editor.title, 'title visible again')
                .toBeVisible();
        });

        await test.step('keeps Save disabled until a title is entered', async () => {
            await editor.title.fill(uniqueName('title-enables-save'));
            await expect
                .soft(editor.saveButton, 'Save with a title')
                .toBeEnabled();
            await editor.title.fill('');
            await expect
                .soft(editor.saveButton, 'Save without a title')
                .toBeDisabled();
        });

        await test.step('refuses a whitespace-only title', async () => {
            await editor.title.fill('   ');
            await editor.title.blur();
            await expect
                .soft(editor.titleErrors, 'title error')
                .toContainText('Title cannot be empty');
            await expect
                .soft(editor.saveButton, 'Save with a whitespace title')
                .toBeDisabled();
        });

        await test.step('stops accepting characters after the 255th', async () => {
            const title = uniqueName('title-over').padEnd(TITLE_LIMIT + 1, 'x');
            await editor.title.fill(title);
            await expect
                .soft(editor.title, 'title cut to the limit')
                .toHaveValue(title.slice(0, TITLE_LIMIT));
        });

        await test.step('empties the title with the clear button', async () => {
            await editor.title.fill('to be cleared');
            await editor.clearTitleButton.click();
            await expect.soft(editor.title, 'cleared title').toHaveValue('');
            await expect
                .soft(editor.saveButton, 'Save after clearing')
                .toBeDisabled();
        });

        await test.step('stops accepting characters after the 2048th', async () => {
            await editor.description.fill('d'.repeat(DESCRIPTION_LIMIT + 1));
            await expect
                .soft(editor.description, 'description cut to the limit')
                .toHaveValue('d'.repeat(DESCRIPTION_LIMIT));
        });

        await test.step('empties the description with the clear button', async () => {
            await editor.description.fill('to be cleared');
            await editor.clearDescriptionButton.click();
            await expect
                .soft(editor.description, 'cleared description')
                .toHaveValue('');
        });

        await test.step('removes every note with Delete all and disables the button on an empty list', async () => {
            await expect
                .soft(
                    editor.notes.deleteAllButton,
                    'Delete all on an empty list',
                )
                .toBeDisabled();
            await editor.notes.addItem('one');
            await editor.notes.addItem('two');
            await editor.notes.deleteAllButton.click();
            await expect
                .soft(editor.notes.items, 'notes after Delete all')
                .toHaveCount(0);
            await expect
                .soft(editor.notes.deleteAllButton, 'Delete all after clearing')
                .toBeDisabled();
        });

        await test.step('adds, edits and removes a note', async () => {
            await editor.notes.addItem('first note');
            await editor.notes.addItem('second note');
            await expectInputValues(editor.notes.items, [
                'first note',
                'second note',
            ]);
            await editor.notes.items.first().fill('edited note');
            await expect
                .soft(editor.notes.items.first(), 'edited note')
                .toHaveValue('edited note');
            await editor.notes.removeButton(0).click();
            await expectInputValues(editor.notes.items, ['second note']);
        });

        await test.step('adds, edits and removes a learning outcome', async () => {
            await editor.outcomes.addItem('first outcome');
            await editor.outcomes.addItem('second outcome');
            await expectInputValues(editor.outcomes.items, [
                'first outcome',
                'second outcome',
            ]);
            await editor.outcomes.items.last().fill('edited outcome');
            await expect
                .soft(editor.outcomes.items.last(), 'edited outcome')
                .toHaveValue('edited outcome');
            await editor.outcomes.removeButton(1).click();
            await expectInputValues(editor.outcomes.items, ['first outcome']);
        });

        await test.step('flags a whitespace-only note', async () => {
            await editor.notes.removeButton(0).click();
            await expect
                .soft(editor.notes.items, 'notes before the whitespace note')
                .toHaveCount(0);
            await editor.notes.addItem('   ');
            await expect
                .soft(editor.notes.errors, 'note error')
                .toHaveText('Notes must be at least 2 characters.');
        });

        const leftTitle = uniqueName('leave-confirm');
        await test.step('asks for confirmation and stays on the page after Cancel', async () => {
            await editor.title.fill(leftTitle);
            await breadcrumbLink(page, 'Training Definitions').click();
            const dialog = new ConfirmationDialog(page, 'Unsaved changes');
            await expect
                .soft(dialog.message, 'dialog message')
                .toContainText('There are unsaved changes');
            await checkpoint(page, 'unsaved changes dialog');
            await dialog.cancel();
            await expect.soft(dialog.root, 'dialog after Cancel').toBeHidden();
            await expect
                .soft(page, 'page after Cancel')
                .toHaveURL(/\/linear-definition\/create$/);
            await expect
                .soft(editor.title, 'title after Cancel')
                .toHaveValue(leftTitle);
        });

        await test.step('leaves the page after Leave and creates nothing', async () => {
            await breadcrumbLink(page, 'Training Definitions').click();
            await new ConfirmationDialog(page, 'Unsaved changes').confirm();
            await expect
                .soft(page, 'page after Leave')
                .toHaveURL(/\/linear-definition$/);
            expect(
                await fetchDefinitionByTitle(
                    apiAs('trainingDesigner'),
                    leftTitle,
                ),
                'definition created by a left form',
            ).toBeUndefined();
        });

        await test.step('leaves without asking when nothing was entered', async () => {
            await editor.gotoCreate();
            await breadcrumbLink(page, 'Training Definitions').click();
            await expect
                .soft(page, 'page after leaving a pristine form')
                .toHaveURL(/\/linear-definition$/);
        });
    });

    test('creates a definition with every field filled and predefined levels', async ({
        page,
        apiAs,
        uniqueName,
        checkpoint,
    }) => {
        test.slow();
        const title = `${SPECIAL_TEXT} ${uniqueName('create-full')}`.padEnd(
            TITLE_LIMIT,
            'x',
        );
        const description = SPECIAL_TEXT.padEnd(DESCRIPTION_LIMIT, 'd');
        const editor = new DefinitionEditorPage(page);
        await editor.gotoCreate();

        await test.step('fills the title, description, notes, outcome and predefined levels', async () => {
            await editor.title.fill(title);
            await expect.soft(editor.title, 'typed title').toHaveValue(title);
            await editor.description.fill(description);
            await expect
                .soft(editor.description, 'typed description')
                .toHaveValue(description);
            await editor.notes.addItem('Bring a laptop');
            await editor.notes.addItem(SPECIAL_TEXT);
            await editor.outcomes.addItem('Reads a packet capture');
            await editor.predefinedLevelsCheckbox.check();
            await editor.saveButton.click();
            await expect(page).toHaveURL(EDIT_PAGE_URL);
        });

        const api = apiAs('trainingDesigner');
        const detail = await fetchDefinitionDetailByTitle(api, title);

        await test.step('accepts a title of exactly 255 characters and saves it whole', async () => {
            expect.soft(detail.title, 'stored title').toHaveLength(TITLE_LIMIT);
            expect.soft(detail.title, 'stored title text').toBe(title);
            await expect.soft(editor.title, 'saved title').toHaveValue(title);
        });

        await test.step('shows special characters as literal text and saves them unchanged', async () => {
            await expect
                .soft(pageTitle(page), 'page title text')
                .toContainText('<b>x</b>');
            await expect
                .soft(
                    pageTitle(page).locator('b'),
                    'no bold element in the page title',
                )
                .toHaveCount(0);
        });

        await test.step('accepts a description of exactly 2048 characters', async () => {
            expect
                .soft(detail.description, 'stored description')
                .toBe(description);
            expect
                .soft(detail.description, 'stored description length')
                .toHaveLength(DESCRIPTION_LIMIT);
        });

        await test.step('shows special characters of the description as literal text', async () => {
            await expect
                .soft(editor.description, 'saved description')
                .toHaveValue(description);
        });

        await test.step('saves notes and outcomes with the definition', async () => {
            expect
                .soft(detail.prerequisites, 'stored notes')
                .toEqual(['Bring a laptop', SPECIAL_TEXT]);
            expect
                .soft(detail.outcomes, 'stored outcomes')
                .toEqual(['Reads a packet capture']);
            await expectInputValues(editor.notes.items, [
                'Bring a laptop',
                SPECIAL_TEXT,
            ]);
            await expectInputValues(editor.outcomes.items, [
                'Reads a packet capture',
            ]);
        });

        await test.step('creates predefined levels when the checkbox is ticked', async () => {
            expect
                .soft((detail.levels ?? []).length, 'stored level count')
                .toBeGreaterThan(0);
            await expect
                .soft(editor.levels.steps, 'level steps')
                .toHaveCount((detail.levels ?? []).length);
            await checkpoint(page, 'predefined levels created');
        });
    });

    test('creates a minimal definition and inspects the saved page', async ({
        page,
        apiAs,
        uniqueName,
        checkpoint,
    }) => {
        const title = uniqueName('save-minimal');
        const editor = new DefinitionEditorPage(page);
        await editor.gotoCreate();

        await test.step('creates an unreleased definition, announces it and opens its edit page', async () => {
            await editor.title.fill(title);
            await expect
                .soft(editor.unsavedChangesWarning, 'unsaved changes warning')
                .toBeVisible();
            await editor.saveButton.click();
            expect(
                (await waitForNotification(page, /was created/i)).kind,
                'notification kind',
            ).toBe('success');
            await expect(page).toHaveURL(EDIT_PAGE_URL);
            await expect
                .soft(pageTitle(page), 'page title')
                .toContainText(title);
            await expect
                .soft(editor.unsavedChangesWarning, 'warning after saving')
                .toBeHidden();
            await checkpoint(page, 'definition saved');
            expect(
                (
                    await requireDefinitionByTitle(
                        apiAs('trainingDesigner'),
                        title,
                    )
                ).state,
                'stored state',
            ).toBe('UNRELEASED');
        });

        await test.step('creates the definition without levels when the checkbox stays off', async () => {
            const detail = await fetchDefinitionDetailByTitle(
                apiAs('trainingDesigner'),
                title,
            );
            expect.soft(detail.levels ?? [], 'stored levels').toHaveLength(0);
            await expect
                .soft(editor.levels.emptyHint, 'empty levels hint')
                .toBeVisible();
        });

        await test.step('shows the checkbox only on the create page', async () => {
            await expect
                .soft(
                    editor.predefinedLevelsCheckbox,
                    'predefined levels checkbox',
                )
                .toHaveCount(0);
        });

        await test.step('offers the Designers panel and level controls once the definition is saved', async () => {
            await expect
                .soft(
                    expansionPanelHeader(page, 'Designers').first(),
                    'Designers panel',
                )
                .toBeVisible();
            await expect
                .soft(editor.levels.addButton, 'Add level control')
                .toBeEnabled();
        });

        await test.step('leaves without asking after the definition was saved', async () => {
            await breadcrumbLink(page, 'Training Definitions').click();
            await expect
                .soft(page, 'page after leaving')
                .toHaveURL(/\/linear-definition$/);
        });
    });
});
