import type { Locator, Page } from '@playwright/test';
import { expect, test } from '../../support/fixtures';
import type { Api } from '../../support/api/api-client';
import {
    SHARED_TRAINING_HINTS,
    SHARED_TRAINING_LEVEL_ORDER,
    SHARED_TRAINING_LEVEL_TITLES,
} from '../../support/scenario/shared-training-loader';
import { DefinitionEditorPage } from '../../support/pages/training-definition/definition-editor.page';
import { expectInputValues } from '../../support/pages/training-definition/input-values';
import { QUESTION_STEP_ICON } from '../../support/pages/training-definition/level-forms';
import {
    changeDefinitionState,
    createEmptyDefinition,
    type DefinitionDto,
    type DefinitionLevelDto,
    fetchAuthorLogins,
    fetchDefinition,
    importFullDefinition,
    SECOND_DESIGNER,
} from '../../support/pages/training-definition/training-definition-data';
import {
    breadcrumbLink,
    ConfirmationDialog,
    dragWithMouse,
    errorDialog,
    notificationPopups,
    pageTitle,
    waitForNotification,
} from '../../support/ui';

const LEVEL_INDEX = {
    info: 0,
    access: 1,
    firstTraining: 2,
    secondTraining: 3,
    variantTraining: 4,
    assessment: 5,
} as const;
const LEVEL_COUNT = SHARED_TRAINING_LEVEL_ORDER.length;
const SPECIAL_TEXT = 'Žluťoučký kůň <b>x</b>';
const TITLES = SHARED_TRAINING_LEVEL_TITLES;

async function levelByTitle(
    api: Api,
    definitionId: number,
    title: string,
): Promise<DefinitionLevelDto> {
    const definition = await fetchDefinition(api, definitionId);
    const level = definition.levels?.find(
        (candidate) => candidate.title === title,
    );
    if (!level) {
        throw new Error(
            `Definition ${definitionId} holds no level titled "${title}"`,
        );
    }
    return level;
}

/** Saves the definition once no earlier "saved" popup is left, so the wait sees the notification of this save. */
async function saveAndWait(editor: DefinitionEditorPage): Promise<void> {
    await expect(
        notificationPopups(editor.page).filter({ hasText: /saved/i }),
    ).toHaveCount(0);
    await editor.saveButton.click();
    await waitForNotification(editor.page, /saved/i);
}

/** Dispatches a paste event carrying the text to the input. */
async function pasteInto(input: Locator, text: string): Promise<void> {
    await input.evaluate((element, pastedText) => {
        const clipboardData = new DataTransfer();
        clipboardData.setData('text/plain', pastedText);
        const pasteEvent = new Event('paste', {
            bubbles: true,
            cancelable: true,
        });
        Object.defineProperty(pasteEvent, 'clipboardData', {
            value: clipboardData,
        });
        element.dispatchEvent(pasteEvent);
    }, text);
}

interface Prepared {
    editor: DefinitionEditorPage;
    definition: DefinitionDto;
    title: string;
    api: Api;
}

async function openFullDefinition(
    page: Page,
    api: Api,
    title: string,
    levelIndex?: number,
): Promise<Prepared> {
    const definition = await importFullDefinition(api, title);
    const editor = new DefinitionEditorPage(page);
    await editor.gotoEdit(definition.id);
    await expect(editor.levels.steps).toHaveCount(LEVEL_COUNT);
    if (levelIndex !== undefined) {
        await editor.openLevel(levelIndex);
    }
    return { editor, definition, title, api };
}

test.describe('linear-definition.edit', () => {
    test.use({ account: 'trainingDesigner' });

    test('checks the designers panel', async ({
        page,
        apiAs,
        uniqueName,
        checkpoint,
    }) => {
        const api = apiAs('trainingDesigner');
        const definition = await createEmptyDefinition(
            api,
            uniqueName('designers'),
        );
        const editor = new DefinitionEditorPage(page);
        await editor.gotoEdit(definition.id);
        const candidate = new RegExp(SECOND_DESIGNER.login);
        const designerSearch = editor.designers.searchInput;

        await test.step('lists the current designer and starts with Add and Delete disabled', async () => {
            await expect
                .soft(editor.designers.assignedTable.rows, 'assigned designers')
                .toHaveCount(1);
            await expect.soft(editor.designers.addButton, 'Add').toBeDisabled();
            await expect
                .soft(editor.designers.deleteButton, 'Delete')
                .toBeDisabled();
            await checkpoint(page, 'designers panel');
        });

        await test.step('collapses and expands the Designers panel', async () => {
            const header = page.locator('mat-expansion-panel-header', {
                hasText: 'Designers',
            });
            await header.click();
            await expect
                .soft(editor.designers.root, 'panel while collapsed')
                .toBeHidden();
            await header.click();
            await expect
                .soft(editor.designers.root, 'panel while expanded')
                .toBeVisible();
        });

        await test.step('finds a designer by first name alone', async () => {
            await designerSearch.fill(
                SECOND_DESIGNER.search.split(' ')[0] ?? '',
            );
            await expect
                .soft(
                    page.getByRole('option', { name: SECOND_DESIGNER.search }),
                    'designer option',
                )
                .toBeVisible();
            await designerSearch.fill('');
            await page.keyboard.press('Escape');
        });

        await test.step('finds the platform own user accounts by name', async () => {
            await designerSearch.fill('User2');
            await expect
                .soft(
                    page
                        .getByRole('option')
                        .filter({ hasNotText: 'No results found' })
                        .first(),
                    'user option',
                )
                .toBeVisible();
            await designerSearch.fill('');
            await page.keyboard.press('Escape');
        });

        await test.step('warns about unsaved designers once a candidate is chosen', async () => {
            await editor.designers.chooseCandidate(
                page,
                SECOND_DESIGNER.search,
                candidate,
            );
            await expect
                .soft(editor.designersWarning, 'unsaved designers warning')
                .toBeVisible();
            await expect.soft(editor.designers.addButton, 'Add').toBeEnabled();
        });

        await test.step('assigns a second designer', async () => {
            await editor.designers.addChosen();
            await expect
                .soft(
                    editor.designers.assignedTable.rowByText(
                        SECOND_DESIGNER.login,
                    ),
                    'assigned row',
                )
                .toBeVisible();
            await expect
                .soft(editor.designersWarning, 'warning after adding')
                .toBeHidden();
            await checkpoint(page, 'designer assigned');
            await expect
                .poll(() => fetchAuthorLogins(api, definition.id), {
                    message: 'stored authors',
                })
                .toContain(SECOND_DESIGNER.login);
        });

        await test.step('unassigns a designer', async () => {
            await editor.designers.removeAssigned(SECOND_DESIGNER.login);
            await expect
                .soft(
                    editor.designers.assignedTable.rowByText(
                        SECOND_DESIGNER.login,
                    ),
                    'assigned row',
                )
                .toHaveCount(0);
            await expect
                .poll(() => fetchAuthorLogins(api, definition.id), {
                    message: 'stored authors',
                })
                .not.toContain(SECOND_DESIGNER.login);
        });

        await test.step('keeps the last designer and tells the user why', async () => {
            await editor.designers.assignedTable.selectAllCheckbox.check();
            await editor.designers.deleteButton.click();
            await expect
                .soft(
                    notificationPopups(page).filter({
                        hasText: 'cannot remove yourself',
                    }),
                    'refusal notice',
                )
                .toBeVisible();
            expect
                .soft(
                    (await fetchAuthorLogins(api, definition.id)).length,
                    'stored authors',
                )
                .toBeGreaterThan(0);
        });
    });

    test('checks the definition fields, the unsaved changes guard and the locked states', async ({
        page,
        apiAs,
        uniqueName,
        shared,
        checkpoint,
    }) => {
        test.slow();
        const api = apiAs('trainingDesigner');
        const originalTitle = uniqueName('fields');
        const definition = await createEmptyDefinition(api, originalTitle, {
            prerequisites: ['one note', 'two note'],
            outcomes: ['one outcome'],
        });
        const editor = new DefinitionEditorPage(page);
        await editor.gotoEdit(definition.id);
        const editUrl = new RegExp(`/linear-definition/${definition.id}/edit$`);
        const unsavedChangesDialog = new ConfirmationDialog(
            page,
            'Unsaved changes',
        );

        await test.step('collapses and expands the Training Definition panel', async () => {
            const header = page
                .locator('mat-expansion-panel-header', {
                    hasText: 'Training Definition',
                })
                .first();
            await header.click();
            await expect
                .soft(editor.title, 'title while collapsed')
                .toBeHidden();
            await header.click();
            await expect
                .soft(editor.title, 'title while expanded')
                .toBeVisible();
        });

        await test.step('disables Save for an empty title and for a whitespace-only title', async () => {
            await editor.title.fill('');
            await expect
                .soft(editor.saveButton, 'Save with an empty title')
                .toBeDisabled();
            await editor.title.fill('   ');
            await editor.title.blur();
            await expect
                .soft(editor.titleErrors, 'title error')
                .toContainText('Title cannot be empty');
            await expect
                .soft(editor.saveButton, 'Save with a whitespace title')
                .toBeDisabled();
            await editor.title.fill(originalTitle);
        });

        await test.step('refuses a single-character note and outcome with a message', async () => {
            await editor.notes.addItem('x');
            await editor.outcomes.addItem('y');
            await expect
                .soft(editor.notes.errors, 'note error')
                .toHaveText('Notes must be at least 2 characters.');
            await expect
                .soft(editor.outcomes.errors, 'outcome error')
                .toHaveText('Outcomes must be at least 2 characters.');
            await expect
                .soft(editor.saveButton, 'Save with short entries')
                .toBeDisabled();
            await editor.notes.removeButton(2).click();
            await editor.outcomes.removeButton(1).click();
        });

        await test.step('does not keep a whitespace-only note as an entry', async () => {
            await editor.title.fill(uniqueName('fields-blank-note-edited'));
            await editor.notes.addItem('   ');
            await expect
                .soft(editor.notes.errors, 'note error')
                .toHaveText('Notes must be at least 2 characters.');
            await expect
                .soft(editor.saveButton, 'Save with a blank note')
                .toBeDisabled();
            await editor.notes.removeButton(2).click();
        });

        await test.step('saves edited, added and removed notes and outcomes', async () => {
            await editor.notes.removeButton(0).click();
            await editor.notes.addItem('third note');
            await editor.outcomes.items.first().fill('changed outcome');
            await editor.outcomes.addItem('second outcome');
            await saveAndWait(editor);
            const saved = await fetchDefinition(api, definition.id);
            expect
                .soft(saved.prerequisites, 'stored notes')
                .toEqual(['two note', 'third note']);
            expect
                .soft(saved.outcomes, 'stored outcomes')
                .toEqual(['changed outcome', 'second outcome']);
        });

        await test.step('stores notes and outcomes trimmed', async () => {
            await editor.notes.addItem('  ab  ');
            await editor.outcomes.addItem('  cd  ');
            await saveAndWait(editor);
            const saved = await fetchDefinition(api, definition.id);
            expect
                .soft(saved.prerequisites, 'stored notes')
                .toEqual(['two note', 'third note', 'ab']);
            expect
                .soft(saved.outcomes, 'stored outcomes')
                .toEqual(['changed outcome', 'second outcome', 'cd']);
        });

        await test.step('saves a title of exactly 255 characters and stops typing at the 256th', async () => {
            const longTitle = uniqueName('fields-limit-long').padEnd(256, 'x');
            await editor.title.fill(longTitle);
            await expect
                .soft(editor.title, 'title cut to the limit')
                .toHaveValue(longTitle.slice(0, 255));
            await saveAndWait(editor);
            expect
                .soft(
                    (await fetchDefinition(api, definition.id)).title,
                    'stored title',
                )
                .toBe(longTitle.slice(0, 255));
        });

        await test.step('keeps special characters of the title as literal text after saving', async () => {
            const special = `${SPECIAL_TEXT} ${uniqueName('fields-special-title')}`;
            await editor.title.fill(special);
            await saveAndWait(editor);
            await page.reload();
            await expect
                .soft(editor.title, 'reloaded title')
                .toHaveValue(special);
            await expect
                .soft(
                    pageTitle(page).locator('b'),
                    'no bold element in the page title',
                )
                .toHaveCount(0);
            expect
                .soft(
                    (await fetchDefinition(api, definition.id)).title,
                    'stored title',
                )
                .toBe(special);
        });

        const newTitle = uniqueName('fields-edited');
        await test.step('saves a new title and description', async () => {
            await editor.title.fill(newTitle);
            await editor.description.fill('A new description');
            await expect
                .soft(editor.unsavedChangesWarning, 'unsaved changes warning')
                .toBeVisible();
            await expect.soft(editor.saveButton, 'Save').toBeEnabled();
            await saveAndWait(editor);
            await expect
                .soft(editor.unsavedChangesWarning, 'warning after saving')
                .toBeHidden();
            await expect
                .soft(editor.saveButton, 'Save after saving')
                .toBeDisabled();
            const saved = await fetchDefinition(api, definition.id);
            expect.soft(saved.title, 'stored title').toBe(newTitle);
            expect
                .soft(saved.description, 'stored description')
                .toBe('A new description');
        });

        await test.step('asks before leaving and keeps the edit after Cancel', async () => {
            const edited = uniqueName('guard-cancel-edited');
            await editor.title.fill(edited);
            await breadcrumbLink(page, 'Training Definitions').click();
            await expect
                .soft(unsavedChangesDialog.message, 'dialog message')
                .toContainText('There are unsaved changes');
            await checkpoint(page, 'guard dialog');
            await unsavedChangesDialog.cancel();
            await expect.soft(page, 'page after Cancel').toHaveURL(editUrl);
            await expect
                .soft(editor.title, 'title after Cancel')
                .toHaveValue(edited);
        });

        await test.step('discards the edit when leaving is confirmed', async () => {
            await breadcrumbLink(page, 'Training Definitions').click();
            await unsavedChangesDialog.confirm();
            await expect
                .soft(page, 'page after Leave')
                .toHaveURL(/\/linear-definition$/);
            expect
                .soft(
                    (await fetchDefinition(api, definition.id)).title,
                    'stored title',
                )
                .toBe(newTitle);
        });

        await test.step('leaves without asking when the edit was saved', async () => {
            await editor.gotoEdit(definition.id);
            await editor.title.fill(uniqueName('guard-saved-edited'));
            await saveAndWait(editor);
            await breadcrumbLink(page, 'Training Definitions').click();
            await expect
                .soft(page, 'page after leaving')
                .toHaveURL(/\/linear-definition$/);
        });

        await test.step('does not offer editing of a released definition', async () => {
            const released = await createEmptyDefinition(
                api,
                uniqueName('released-locked'),
            );
            await changeDefinitionState(api, released.id, 'RELEASED');
            await editor.gotoEdit(released.id);
            await expect.soft(editor.title, 'title').toBeDisabled();
            await expect.soft(editor.saveButton, 'Save').toBeDisabled();
            await expect
                .soft(
                    page.getByText(
                        'Editing is disabled: the definition is released.',
                    ),
                    'lock message',
                )
                .toBeVisible();
        });

        await test.step('does not offer editing of a definition used by a training instance', async () => {
            await editor.gotoEdit(shared.trainingDefinition.id);
            await expect.soft(editor.title, 'title').toBeDisabled();
            await expect.soft(editor.saveButton, 'Save').toBeDisabled();
            await expect
                .soft(editor.levels.addButton, 'Add level')
                .toBeDisabled();
            await expect
                .soft(editor.levels.deleteButton, 'Delete level')
                .toBeDisabled();
        });
    });

    test('checks the levels overview and the level list operations', async ({
        page,
        apiAs,
        uniqueName,
        checkpoint,
    }) => {
        test.slow();
        const api = apiAs('trainingDesigner');
        const { editor, definition, title } = await openFullDefinition(
            page,
            api,
            uniqueName('levels'),
        );
        let levelCount = LEVEL_COUNT;
        const storedLevelTitles = async (): Promise<string[] | undefined> =>
            (await fetchDefinition(api, definition.id)).levels
                ?.slice()
                .sort((left, right) => left.order - right.order)
                .map((level) => level.title);

        await test.step('shows the edit heading, the saved values and the level count', async () => {
            await expect
                .soft(pageTitle(page), 'page title')
                .toContainText(`Edit ${title}`);
            await expect.soft(editor.title, 'title').toHaveValue(title);
            await expect
                .soft(editor.description, 'description')
                .toHaveValue(
                    'Shared training definition of the e2e suite run.',
                );
            await expectInputValues(editor.notes.items, ['A terminal']);
            await expectInputValues(editor.outcomes.items, [
                'A finished training run',
            ]);
            await expect
                .soft(editor.levelsCountInfo, 'level count')
                .toContainText(`${LEVEL_COUNT} level(s)`);
            await expect.soft(editor.saveButton, 'Save').toBeDisabled();
            await checkpoint(page, 'edit page loaded');
        });

        await test.step('lists the levels in order with their types', async () => {
            await expect
                .soft(editor.levels.stepsOfKind('Info Level'), 'info levels')
                .toHaveCount(1);
            await expect
                .soft(
                    editor.levels.stepsOfKind('Access Level'),
                    'access levels',
                )
                .toHaveCount(1);
            await expect
                .soft(
                    editor.levels.stepsOfKind('Training Level'),
                    'training levels',
                )
                .toHaveCount(3);
            await expect
                .soft(
                    editor.levels.stepsOfKind('Assessment Level'),
                    'assessment levels',
                )
                .toHaveCount(1);
            await checkpoint(page, 'levels listed');
        });

        await test.step('offers the four level kinds in the Add menu', async () => {
            await editor.levels.addButton.click();
            await expect
                .soft(editor.levels.addMenuEntries, 'Add menu entries')
                .toHaveText([
                    /Training Level$/,
                    /Access Level$/,
                    /Assessment Level$/,
                    /Info Level$/,
                ]);
            await page.keyboard.press('Escape');
        });

        await test.step('selects the level of a clicked step and shows its form', async () => {
            await editor.openLevel(LEVEL_INDEX.access);
            await expect
                .soft(editor.accessLevel.title, 'access level title')
                .toHaveValue(TITLES.access);
            await editor.openLevel(LEVEL_INDEX.firstTraining);
            await expect
                .soft(editor.trainingLevel.title, 'training level title')
                .toHaveValue(TITLES.firstTraining);
            await editor.openLevel(LEVEL_INDEX.assessment);
            await expect
                .soft(editor.assessmentLevel.title, 'assessment level title')
                .toHaveValue(TITLES.assessment);
            await editor.openLevel(LEVEL_INDEX.info);
            await expect
                .soft(editor.infoLevel.title, 'info level title')
                .toHaveValue(TITLES.info);
        });

        await test.step('asks before leaving after a level was changed', async () => {
            await editor.infoLevel.title.fill(uniqueName('guard-level-title'));
            await expect
                .soft(editor.unsavedChangesWarning, 'unsaved changes warning')
                .toBeVisible();
            await breadcrumbLink(page, 'Training Definitions').click();
            const dialog = new ConfirmationDialog(page, 'Unsaved changes');
            await expect
                .soft(dialog.root, 'unsaved changes dialog')
                .toBeVisible();
            await dialog.cancel();
            await expect
                .soft(dialog.root, 'unsaved changes dialog after cancel')
                .toBeHidden();
            await editor.infoLevel.title.fill(TITLES.info);
        });

        await test.step('moves a level to another position by dragging its step', async () => {
            const draggedLevel = await levelByTitle(
                api,
                definition.id,
                TITLES.firstTraining,
            );
            await dragWithMouse(
                editor.levels.step(LEVEL_INDEX.firstTraining),
                editor.levels.step(LEVEL_INDEX.secondTraining),
            );
            await expect
                .soft(
                    editor.levels.step(LEVEL_INDEX.secondTraining),
                    'dragged step position',
                )
                .toHaveAttribute('data-cy', String(draggedLevel.id));
            await saveAndWait(editor);
            await expect
                .poll(storedLevelTitles, { message: 'stored level order' })
                .toEqual([
                    TITLES.info,
                    TITLES.access,
                    TITLES.secondTraining,
                    TITLES.firstTraining,
                    TITLES.variantTraining,
                    TITLES.assessment,
                ]);
        });

        await test.step('shows a renamed level title in the stepper after saving', async () => {
            await editor.openLevel(LEVEL_INDEX.info);
            await editor.infoLevel.title.fill('Renamed');
            await saveAndWait(editor);
            await expect
                .soft(editor.levels.step(LEVEL_INDEX.info), 'info step')
                .toContainText('Renamed');
        });

        await test.step('does not create the level on the server before Save', async () => {
            await editor.levels.add('Info Level');
            levelCount += 1;
            await expect
                .soft(editor.levels.steps, 'steps')
                .toHaveCount(levelCount);
            await expect
                .soft(editor.unsavedChangesWarning, 'unsaved changes warning')
                .toBeVisible();
            expect
                .soft(
                    (await fetchDefinition(api, definition.id)).levels,
                    'stored levels',
                )
                .toHaveLength(LEVEL_COUNT);
        });

        const addedKinds = [
            ['Info Level', 'INFO_LEVEL'],
            ['Access Level', 'ACCESS_LEVEL'],
            ['Training Level', 'TRAINING_LEVEL'],
            ['Assessment Level', 'ASSESSMENT_LEVEL'],
        ] as const;
        for (const [kind, levelType] of addedKinds) {
            await test.step(`adds a ${kind} to the end of the list`, async () => {
                if (levelType !== 'INFO_LEVEL') {
                    await editor.levels.add(kind);
                    levelCount += 1;
                }
                await expect
                    .soft(editor.levels.steps, 'steps')
                    .toHaveCount(levelCount);
                await expect
                    .soft(editor.levelsCountInfo, 'level count')
                    .toContainText(`${levelCount} level(s)`);
                await expect.soft(editor.saveButton, 'Save').toBeEnabled();
                await saveAndWait(editor);
                await expect
                    .poll(
                        async () =>
                            (
                                await fetchDefinition(api, definition.id)
                            ).levels?.at(-1)?.level_type,
                        {
                            message: 'type of the last stored level',
                        },
                    )
                    .toBe(levelType);
            });
        }

        await test.step('keeps the level when deleting is cancelled', async () => {
            await editor.openLevel(LEVEL_INDEX.info);
            await editor.levels.deleteButton.click();
            const dialog = new ConfirmationDialog(page, 'Delete Level');
            await expect.soft(dialog.root, 'delete dialog').toBeVisible();
            await dialog.cancel();
            await expect
                .soft(editor.levels.steps, 'steps')
                .toHaveCount(levelCount);
            expect
                .soft(
                    (await fetchDefinition(api, definition.id)).levels,
                    'stored levels',
                )
                .toHaveLength(levelCount);
        });

        await test.step('deletes the selected level after confirmation', async () => {
            await editor.levels.deleteButton.click();
            await checkpoint(page, 'delete level confirmation');
            await new ConfirmationDialog(page, 'Delete Level').confirm();
            levelCount -= 1;
            await expect
                .soft(editor.levels.steps, 'steps')
                .toHaveCount(levelCount);
            await expect.soft(editor.saveButton, 'Save').toBeEnabled();
            await saveAndWait(editor);
            await expect
                .poll(storedLevelTitles, { message: 'stored level titles' })
                .not.toContain('Renamed');
        });

        await test.step('deletes every level and then shows the empty hint with Delete disabled', async () => {
            await editor.openLevel(0);
            for (let remaining = levelCount; remaining > 0; remaining--) {
                await editor.levels.deleteButton.click();
                await new ConfirmationDialog(page, 'Delete Level').confirm();
                await expect
                    .soft(editor.levels.steps, 'steps')
                    .toHaveCount(remaining - 1);
            }
            await expect
                .soft(editor.levels.emptyHint, 'empty hint')
                .toBeVisible();
            await expect
                .soft(editor.levels.deleteButton, 'Delete')
                .toBeDisabled();
        });
    });

    test('checks the info and access level forms', async ({
        page,
        apiAs,
        uniqueName,
    }) => {
        test.slow();
        const { editor, definition, api } = await openFullDefinition(
            page,
            apiAs('trainingDesigner'),
            uniqueName('info-access'),
            LEVEL_INDEX.info,
        );

        await test.step('disables Save for an empty and for a whitespace-only title', async () => {
            await editor.infoLevel.title.fill('');
            await expect
                .soft(editor.infoLevel.errors.first(), 'title error')
                .toBeVisible();
            await expect
                .soft(editor.saveButton, 'Save with an empty title')
                .toBeDisabled();
            await editor.infoLevel.title.fill('   ');
            await expect
                .soft(editor.saveButton, 'Save with a whitespace title')
                .toBeDisabled();
        });

        await test.step('keeps special characters of title and content as literal text', async () => {
            await editor.infoLevel.title.fill(SPECIAL_TEXT);
            await editor.infoLevel.content.fill(SPECIAL_TEXT);
            await saveAndWait(editor);
            const level = await levelByTitle(api, definition.id, SPECIAL_TEXT);
            expect.soft(level['content'], 'stored content').toBe(SPECIAL_TEXT);
            await expect
                .soft(
                    editor.levels.step(LEVEL_INDEX.info).locator('b'),
                    'no bold element',
                )
                .toHaveCount(0);
        });

        await test.step('saves a new title and content', async () => {
            await editor.openLevel(LEVEL_INDEX.info);
            await editor.infoLevel.title.fill('Briefing renamed');
            await editor.infoLevel.content.fill('**new** content');
            await saveAndWait(editor);
            const level = await levelByTitle(
                api,
                definition.id,
                'Briefing renamed',
            );
            expect
                .soft(level['content'], 'stored content')
                .toBe('**new** content');
        });

        await test.step('shows the passkey length against the limit of 50 and stops at 50 characters', async () => {
            await editor.openLevel(LEVEL_INDEX.access);
            await editor.accessLevel.passkey.fill('p'.repeat(51));
            await expect
                .soft(editor.accessLevel.passkey, 'passkey cut to the limit')
                .toHaveValue('p'.repeat(50));
            await expect
                .soft(editor.accessLevel.passkeyCounter, 'passkey counter')
                .toContainText('50/50');
        });

        await test.step('disables Save for an empty passkey and shows an error', async () => {
            await editor.accessLevel.passkey.fill('');
            await editor.accessLevel.passkey.blur();
            await expect
                .soft(editor.accessLevel.errors.first(), 'passkey error')
                .toBeVisible();
            await expect
                .soft(editor.saveButton, 'Save with an empty passkey')
                .toBeDisabled();
        });

        await test.step('disables Save for an empty title', async () => {
            await editor.accessLevel.passkey.fill('valid-passkey');
            await editor.accessLevel.title.fill('');
            await expect
                .soft(editor.saveButton, 'Save with an empty title')
                .toBeDisabled();
            await editor.accessLevel.title.fill(TITLES.access);
        });

        await test.step('keeps special characters of the passkey as literal text', async () => {
            await editor.accessLevel.passkey.fill('Žluťoučký <b>x</b>');
            await saveAndWait(editor);
            expect
                .soft(
                    (await levelByTitle(api, definition.id, TITLES.access))[
                        'passkey'
                    ],
                    'stored passkey',
                )
                .toBe('Žluťoučký <b>x</b>');
        });

        await test.step('saves the title without leading and trailing spaces', async () => {
            await editor.openLevel(LEVEL_INDEX.access);
            await editor.accessLevel.title.fill('  Spaced title  ');
            await saveAndWait(editor);
            const level = (await fetchDefinition(api, definition.id)).levels?.[
                LEVEL_INDEX.access
            ];
            expect.soft(level?.title, 'stored title').toBe('Spaced title');
        });

        await test.step('saves a new title, passkey and both contents', async () => {
            await editor.openLevel(LEVEL_INDEX.access);
            await editor.accessLevel.title.fill('Access renamed');
            await editor.accessLevel.passkey.fill('new-passkey');
            await editor.accessLevel.cloudContent.fill('cloud text');
            await editor.accessLevel.localContent.fill('local text');
            await saveAndWait(editor);
            const level = await levelByTitle(
                api,
                definition.id,
                'Access renamed',
            );
            expect.soft(level['passkey'], 'stored passkey').toBe('new-passkey');
            expect
                .soft(level['cloud_content'], 'stored cloud content')
                .toBe('cloud text');
            expect
                .soft(level['local_content'], 'stored local content')
                .toBe('local text');
        });
    });

    test('checks the training level form', async ({
        page,
        apiAs,
        uniqueName,
        checkpoint,
    }) => {
        test.slow();
        const { editor, definition, api } = await openFullDefinition(
            page,
            apiAs('trainingDesigner'),
            uniqueName('training'),
            LEVEL_INDEX.firstTraining,
        );
        const form = editor.trainingLevel;

        await test.step('shows the values of the saved level', async () => {
            await expect
                .soft(form.title, 'title')
                .toHaveValue(TITLES.firstTraining);
            await expect
                .soft(form.estimatedDuration, 'estimated duration')
                .toHaveValue('5');
            await expect.soft(form.points, 'points').toHaveValue('20');
            await expect
                .soft(form.incorrectAnswerLimit, 'incorrect answer limit')
                .toHaveValue('5');
            await expect
                .soft(form.staticAnswer, 'static answer')
                .toHaveValue('e2e-flag-one');
            await expect
                .soft(form.variantAnswers, 'variant answers')
                .not.toBeChecked();
            await expect
                .soft(form.solutionRevealGrantsZeroPoints, 'solution reveal')
                .toBeChecked();
            await expect
                .soft(form.commandsRequired, 'commands required')
                .not.toBeChecked();
            await checkpoint(page, 'training level loaded');
        });

        const numericFields = [
            {
                field: 'estimatedDuration',
                invalidValues: ['0', '-1', 'abc'],
                boundaryValues: ['1'],
            },
            {
                field: 'minimalSolveTime',
                invalidValues: ['-1'],
                boundaryValues: ['0'],
            },
            {
                field: 'points',
                invalidValues: ['101', '-1'],
                boundaryValues: ['100'],
            },
            {
                field: 'incorrectAnswerLimit',
                invalidValues: ['0', '101'],
                boundaryValues: ['1', '100'],
            },
        ] as const;
        for (const { field, invalidValues, boundaryValues } of numericFields) {
            for (const value of invalidValues) {
                await test.step(`disables Save for ${field} set to ${value}`, async () => {
                    await form[field].fill(value);
                    await expect.soft(editor.saveButton, 'Save').toBeDisabled();
                });
            }
            for (const value of boundaryValues) {
                await test.step(`accepts the boundary value ${value} in ${field}`, async () => {
                    await form[field].fill(value);
                    await expect.soft(editor.saveButton, 'Save').toBeEnabled();
                });
            }
        }

        await test.step('disables Save for an empty and a whitespace-only title', async () => {
            await form.title.fill('');
            await expect
                .soft(editor.saveButton, 'Save with an empty title')
                .toBeDisabled();
            await form.title.fill('   ');
            await expect
                .soft(editor.saveButton, 'Save with a whitespace title')
                .toBeDisabled();
            await form.title.fill(TITLES.firstTraining);
        });

        await test.step('disables Save for an empty static answer and stops it at 50 characters', async () => {
            await form.staticAnswer.fill('');
            await expect
                .soft(editor.saveButton, 'Save with an empty answer')
                .toBeDisabled();
            await form.staticAnswer.fill('a'.repeat(51));
            await expect
                .soft(form.staticAnswer, 'answer cut to the limit')
                .toHaveValue('a'.repeat(50));
        });

        await test.step('empties the answer input when Variant Answers is ticked and cleared again', async () => {
            await form.variantAnswers.check();
            await form.variantAnswers.uncheck();
            await expect
                .soft(form.staticAnswer, 'static answer')
                .toHaveValue('');
            await expect
                .soft(editor.saveButton, 'Save with an empty answer')
                .toBeDisabled();
        });

        await test.step('empties the variable name when Variant Answers is cleared and ticked again', async () => {
            await form.variantAnswers.check();
            await form.answerVariableName.fill('kept_name');
            await form.variantAnswers.uncheck();
            await form.variantAnswers.check();
            await expect
                .soft(form.answerVariableName, 'variable name')
                .toHaveValue('');
        });

        await test.step('swaps the static answer for a variable name when Variant Answers is ticked', async () => {
            await expect
                .soft(form.staticAnswer, 'static answer input')
                .toHaveCount(0);
            await form.answerVariableName.fill('flag_variable');
            await saveAndWait(editor);
            const level = await levelByTitle(
                api,
                definition.id,
                TITLES.firstTraining,
            );
            expect
                .soft(level['variant_answers'], 'stored variant flag')
                .toBe(true);
            expect
                .soft(level['answer_variable_name'], 'stored variable name')
                .toBe('flag_variable');
        });

        await test.step('keeps special characters of content, solution and answer as literal text', async () => {
            await editor.openLevel(LEVEL_INDEX.firstTraining);
            await form.variantAnswers.uncheck();
            await form.content.fill(SPECIAL_TEXT);
            await form.solution.fill(SPECIAL_TEXT);
            await form.staticAnswer.fill('Žluťoučký');
            await saveAndWait(editor);
            const level = await levelByTitle(
                api,
                definition.id,
                TITLES.firstTraining,
            );
            expect.soft(level['content'], 'stored content').toBe(SPECIAL_TEXT);
            expect
                .soft(level['solution'], 'stored solution')
                .toBe(SPECIAL_TEXT);
            expect.soft(level['answer'], 'stored answer').toBe('Žluťoučký');
        });

        await test.step('saves every edited field', async () => {
            await editor.openLevel(LEVEL_INDEX.firstTraining);
            await form.title.fill('Training renamed');
            await form.estimatedDuration.fill('12');
            await form.minimalSolveTime.fill('3');
            await form.content.fill('new level content');
            await form.solution.fill('new level solution');
            await form.points.fill('40');
            await form.incorrectAnswerLimit.fill('7');
            await form.staticAnswer.fill('new-answer');
            await form.solutionRevealGrantsZeroPoints.uncheck();
            await form.commandsRequired.check();
            await saveAndWait(editor);
            const level = await levelByTitle(
                api,
                definition.id,
                'Training renamed',
            );
            expect
                .soft(level['estimated_duration'], 'stored duration')
                .toBe(12);
            expect
                .soft(
                    level['minimal_possible_solve_time'],
                    'stored minimal solve time',
                )
                .toBe(3);
            expect
                .soft(level['content'], 'stored content')
                .toBe('new level content');
            expect
                .soft(level['solution'], 'stored solution')
                .toBe('new level solution');
            expect.soft(level['max_score'], 'stored points').toBe(40);
            expect
                .soft(level['incorrect_answer_limit'], 'stored limit')
                .toBe(7);
            expect.soft(level['answer'], 'stored answer').toBe('new-answer');
            expect
                .soft(level['solution_penalized'], 'stored solution penalty')
                .toBe(false);
            expect
                .soft(level['commands_required'], 'stored commands flag')
                .toBe(true);
        });

        await test.step('saves the second training level independently of the first', async () => {
            await editor.openLevel(LEVEL_INDEX.secondTraining);
            await form.points.fill('30');
            await saveAndWait(editor);
            expect
                .soft(
                    (
                        await levelByTitle(
                            api,
                            definition.id,
                            TITLES.secondTraining,
                        )
                    )['max_score'],
                    'second level points',
                )
                .toBe(30);
            expect
                .soft(
                    (
                        await levelByTitle(
                            api,
                            definition.id,
                            'Training renamed',
                        )
                    )['max_score'],
                    'first level points',
                )
                .toBe(40);
        });

        await test.step('accepts the boundary value 0 in points on a level without hints', async () => {
            await editor.openLevel(LEVEL_INDEX.firstTraining);
            const hints = form.hints;
            await hints.open();
            for (
                let remaining = SHARED_TRAINING_HINTS.length;
                remaining > 0;
                remaining--
            ) {
                await hints.deleteButton.click();
                await new ConfirmationDialog(page, 'Delete Hint').confirm();
                await expect
                    .soft(hints.steps, 'hint steps')
                    .toHaveCount(remaining - 1);
            }
            await form.points.fill('0');
            await expect.soft(editor.saveButton, 'Save').toBeEnabled();
        });
    });

    test('checks the hints panel', async ({
        page,
        apiAs,
        uniqueName,
        checkpoint,
    }) => {
        test.slow();
        const { editor, definition, api } = await openFullDefinition(
            page,
            apiAs('trainingDesigner'),
            uniqueName('hints'),
            LEVEL_INDEX.firstTraining,
        );
        const hints = editor.trainingLevel.hints;
        const storedHints = async (): Promise<
            {
                title: string;
                hint_penalty: number;
                content: string;
                order: number;
            }[]
        > =>
            (
                (await levelByTitle(api, definition.id, TITLES.firstTraining))[
                    'hints'
                ] as {
                    title: string;
                    hint_penalty: number;
                    content: string;
                    order: number;
                }[]
            )
                .slice()
                .sort((left, right) => left.order - right.order);

        await test.step('lists the hints of the level and their count', async () => {
            await expect
                .soft(hints.summary, 'hint summary')
                .toContainText('2 hint(s)');
            await hints.open();
            await expect.soft(hints.steps, 'hint steps').toHaveCount(2);
            await expect
                .soft(hints.title, 'hint title')
                .toHaveValue('Look around');
            await expect.soft(hints.penalty, 'hint penalty').toHaveValue('2');
            await checkpoint(page, 'hints panel open');
        });

        const invalidPenalties = [
            ['a penalty above what the level score allows', '18'],
            ['a negative penalty', '-1'],
            ['a fractional penalty', '5.7'],
        ] as const;
        for (const [description, value] of invalidPenalties) {
            await test.step(`disables Save for ${description}`, async () => {
                await hints.penalty.fill(value);
                await expect.soft(editor.saveButton, 'Save').toBeDisabled();
            });
        }

        await test.step('accepts the largest penalty the level score allows', async () => {
            await hints.penalty.fill('17');
            await expect.soft(editor.saveButton, 'Save').toBeEnabled();
            await hints.penalty.fill('2');
        });

        await test.step('keeps the hint when deleting is cancelled', async () => {
            await hints.deleteButton.click();
            const deleteDialog = new ConfirmationDialog(page, 'Delete Hint');
            await deleteDialog.cancel();
            await expect
                .soft(deleteDialog.root, 'delete hint dialog after cancel')
                .toBeHidden();
            await expect.soft(hints.steps, 'hint steps').toHaveCount(2);
        });

        await test.step('reorders hints by dragging a step', async () => {
            await dragWithMouse(hints.steps.first(), hints.steps.last());
            await expect
                .soft(hints.steps.first(), 'first hint step')
                .toContainText('Read');
            await saveAndWait(editor);
            expect
                .soft(
                    (await storedHints()).map((hint) => hint.title),
                    'stored hint order',
                )
                .toEqual(['Read the file', 'Look around']);
        });

        await test.step('disables Save for an empty hint title', async () => {
            await hints.steps.first().click();
            await hints.title.fill('');
            await expect
                .soft(editor.saveButton, 'Save with an empty hint title')
                .toBeDisabled();
        });

        await test.step('names the hint of a step after its edited title', async () => {
            await hints.title.fill('Renamed hint');
            await expect
                .soft(hints.steps.first(), 'first hint step')
                .toContainText('Renamed');
        });

        await test.step('saves an edited hint title, penalty and content', async () => {
            await hints.title.fill('Edited hint');
            await hints.penalty.fill('4');
            await hints.content.fill('Edited hint content');
            await saveAndWait(editor);
            expect
                .soft((await storedHints())[0], 'first stored hint')
                .toMatchObject({
                    title: 'Edited hint',
                    hint_penalty: 4,
                    content: 'Edited hint content',
                });
        });

        await test.step('keeps special characters of the hint title and content as literal text', async () => {
            await hints.steps.first().click();
            await hints.title.fill(SPECIAL_TEXT);
            await hints.content.fill(SPECIAL_TEXT);
            await saveAndWait(editor);
            expect
                .soft((await storedHints())[0], 'first stored hint')
                .toMatchObject({ title: SPECIAL_TEXT, content: SPECIAL_TEXT });
        });

        await test.step('adds a hint', async () => {
            await hints.addButton.click();
            await expect.soft(hints.steps, 'hint steps').toHaveCount(3);
            await expect
                .soft(hints.summary, 'hint summary')
                .toContainText('3 hint(s)');
        });

        await test.step('saves a newly added hint', async () => {
            await hints.title.fill('Third hint');
            await hints.penalty.fill('1');
            await hints.content.fill('Third content');
            await saveAndWait(editor);
            expect.soft(await storedHints(), 'stored hints').toHaveLength(3);
        });

        await test.step('deletes the open hint after confirmation', async () => {
            const titlesBefore = (await storedHints()).map(
                (hint) => hint.title,
            );
            await hints.steps.first().click();
            await hints.deleteButton.click();
            await new ConfirmationDialog(page, 'Delete Hint').confirm();
            await expect.soft(hints.steps, 'hint steps').toHaveCount(2);
            await saveAndWait(editor);
            expect
                .soft(
                    (await storedHints()).map((hint) => hint.title),
                    'stored hint titles',
                )
                .toEqual(titlesBefore.slice(1));
        });
    });

    test('checks the MITRE techniques and expected commands panels', async ({
        page,
        apiAs,
        uniqueName,
    }) => {
        test.slow();
        const { editor, definition, api } = await openFullDefinition(
            page,
            apiAs('trainingDesigner'),
            uniqueName('mitre-commands'),
            LEVEL_INDEX.firstTraining,
        );
        const mitre = editor.trainingLevel.mitre;
        const commands = editor.trainingLevel.commands;
        const storedLevel = (): Promise<DefinitionLevelDto> =>
            levelByTitle(api, definition.id, TITLES.firstTraining);

        await test.step('reports a level without techniques', async () => {
            await expect
                .soft(mitre.summary, 'technique summary')
                .toContainText('no techniques');
            await mitre.open();
        });

        await test.step('adds nothing for typed text outside the TACTIC.TECHNIQUE format', async () => {
            await mitre.typeAndConfirm('not-a-technique');
            await expect.soft(mitre.chips, 'chips').toHaveCount(0);
            await expect
                .soft(page.getByRole('option'), 'suggestions')
                .toHaveCount(0);
            await mitre.input.fill('');
        });

        await test.step('offers no suggestion for a well-formed technique that is not in the catalogue', async () => {
            await mitre.typeAndConfirm('TA9999.T9999');
            await expect.soft(mitre.chips, 'chips').toHaveCount(0);
            await expect
                .soft(mitre.suggestion('TA9999.T9999'), 'suggestion')
                .toHaveCount(0);
            await mitre.input.fill('');
        });

        await test.step('adds nothing for several techniques pasted separated by comma, semicolon and line break', async () => {
            await pasteInto(
                mitre.input,
                'TA0009.T1005, TA0007.T1083;TA0043.T1595\nTA0001.T1190',
            );
            await expect.soft(mitre.chips, 'chips').toHaveCount(0);
        });

        await test.step('suggests catalogue techniques while typing and adds the chosen one', async () => {
            await mitre.input.fill('T1005');
            const option = page
                .getByRole('option', { name: /T1005 - / })
                .first();
            await expect.soft(option, 'suggestion').toBeVisible();
            await option.click();
            await expect.soft(mitre.chips, 'chips').toHaveCount(1);
            await expect
                .soft(mitre.chips.first(), 'chip')
                .toContainText('T1005');
        });

        await test.step('removes a technique with its chip button', async () => {
            await mitre.removeButton(mitre.chips.first()).click();
            await expect.soft(mitre.chips, 'chips').toHaveCount(0);
            await expect
                .soft(mitre.summary, 'technique summary')
                .toContainText('no techniques');
        });

        await test.step('adds a technique picked from the suggestions', async () => {
            await mitre.pick('TA0009.T1005');
            await expect.soft(mitre.chips, 'chips').toHaveCount(1);
            await expect
                .soft(mitre.chips.first(), 'chip')
                .toContainText('TA0009.T1005');
            await expect
                .soft(mitre.summary, 'technique summary')
                .toContainText('1 technique');
        });

        await test.step('closes the suggestion list after a technique was picked', async () => {
            await expect
                .soft(page.getByRole('option'), 'suggestions')
                .toHaveCount(0);
        });

        await test.step('saves the picked technique', async () => {
            await saveAndWait(editor);
            const techniques = (await storedLevel())['mitre_techniques'] as {
                technique_key: string;
            }[];
            expect
                .soft(
                    techniques.map((entry) => entry.technique_key),
                    'stored techniques',
                )
                .toEqual(['TA0009.T1005']);
        });

        await test.step('shows an already added technique as a disabled suggestion', async () => {
            await editor.openLevel(LEVEL_INDEX.firstTraining);
            await mitre.open();
            await mitre.input.scrollIntoViewIfNeeded();
            await mitre.input.fill('TA0009.T1005');
            const option = mitre.suggestion('TA0009.T1005');
            await expect
                .soft(option, 'suggestion')
                .toHaveAttribute('aria-disabled', 'true');
            await option.click({ force: true });
            await expect.soft(mitre.chips, 'chips').toHaveCount(1);
            await mitre.input.fill('');
        });

        await test.step('reports a level without expected commands', async () => {
            await expect
                .soft(commands.summary, 'command summary')
                .toContainText('no expected commands');
            await commands.open();
        });

        await test.step('adds commands with Enter and with a comma and saves them', async () => {
            await commands.addByTyping('ls -la');
            await commands.input.pressSequentially('cat flag.txt,');
            await expect.soft(commands.chips, 'chips').toHaveCount(2);
            await expect
                .soft(commands.summary, 'command summary')
                .toContainText('2 expected command(s)');
            await saveAndWait(editor);
            expect
                .soft(
                    (await storedLevel())['expected_commands'],
                    'stored commands',
                )
                .toEqual(['ls -la', 'cat flag.txt']);
        });

        await test.step('refuses the same command twice', async () => {
            await editor.openLevel(LEVEL_INDEX.firstTraining);
            await commands.open();
            await commands.addByTyping('uname');
            await commands.addByTyping('uname');
            await expect.soft(commands.chips, 'chips').toHaveCount(3);
        });

        await test.step('refuses a command equal to an added one after trimming', async () => {
            await commands.addByTyping('  ls -la  ');
            await expect.soft(commands.chips, 'chips').toHaveCount(3);
        });

        await test.step('adds several commands pasted separated by comma, semicolon and line break', async () => {
            await pasteInto(commands.input, 'ls, pwd;whoami\nid');
            await expect.soft(commands.chips, 'chips').toHaveCount(7);
        });

        await test.step('removes a command with its chip button', async () => {
            await commands.removeButton(commands.chips.first()).click();
            await expect.soft(commands.chips, 'chips').toHaveCount(6);
            await expect
                .soft(commands.chips.first(), 'first chip')
                .toContainText('cat flag.txt');
        });

        await test.step('keeps special characters of a command as literal text', async () => {
            await commands.addByTyping('echo <b>x</b>');
            await expect
                .soft(commands.chips.last().locator('b'), 'no bold element')
                .toHaveCount(0);
            await saveAndWait(editor);
            expect
                .soft(
                    (await storedLevel())['expected_commands'],
                    'stored commands',
                )
                .toContain('echo <b>x</b>');
        });
    });

    test('checks the assessment level and its questions', async ({
        page,
        apiAs,
        uniqueName,
        checkpoint,
    }) => {
        test.slow();
        const { editor, definition, api } = await openFullDefinition(
            page,
            apiAs('trainingDesigner'),
            uniqueName('assessment'),
            LEVEL_INDEX.assessment,
        );
        const form = editor.assessmentLevel;
        const questions = form.questions;
        const storedQuestions = async <Question>(
            title: string,
        ): Promise<Question[]> =>
            (await levelByTitle(api, definition.id, title))[
                'questions'
            ] as Question[];
        const reopenFirstQuestion = async (): Promise<void> => {
            await editor.openLevel(LEVEL_INDEX.assessment);
            await questions.open();
            await questions.steps.first().click();
        };
        let originalMinimalSolveTime = '';

        await test.step('shows the saved values and the Test mode', async () => {
            originalMinimalSolveTime = await form.minimalSolveTime.inputValue();
            await expect
                .soft(form.title, 'title')
                .toHaveValue(TITLES.assessment);
            await expect
                .soft(form.estimatedDuration, 'estimated duration')
                .toHaveValue('3');
            await expect
                .soft(form.instructions, 'instructions')
                .toHaveText('Answer every question.');
            await expect.soft(form.testSwitch, 'Test mode').toBeChecked();
            await checkpoint(page, 'assessment level loaded');
        });

        await test.step('lists the three questions of the level', async () => {
            await questions.open();
            await expect.soft(questions.steps, 'question steps').toHaveCount(3);
            await expect
                .soft(questions.summary, 'question summary')
                .toContainText('3 question(s)');
            await checkpoint(page, 'questions listed');
        });

        await test.step('offers the three question kinds in the Add menu', async () => {
            await questions.addButton.click();
            await expect
                .soft(page.getByRole('menuitem'), 'Add menu entries')
                .toHaveText([
                    /Free Form Question$/,
                    /Multiple Choice Question$/,
                    /Extended Matching Items Questions$/,
                ]);
            await page.keyboard.press('Escape');
        });

        await test.step('disables the Required checkbox of a question in Test mode', async () => {
            await expect
                .soft(questions.requiredCheckbox, 'Required checkbox')
                .toBeDisabled();
        });

        const invalidQuestionValues = [
            ['points', '101'],
            ['points', '-1'],
            ['penalty', '101'],
            ['penalty', '-1'],
        ] as const;
        const validQuestionValues = { points: '8', penalty: '2' } as const;
        for (const [field, value] of invalidQuestionValues) {
            await test.step(`disables Save for question ${field} set to ${value}`, async () => {
                await questions[field].fill(value);
                await expect.soft(editor.saveButton, 'Save').toBeDisabled();
                await questions[field].fill(validQuestionValues[field]);
            });
        }

        await test.step('saves a changed question title, points and penalty', async () => {
            await questions.title.fill(
                'Which transport protocol is reliable, really?',
            );
            await questions.points.fill('8');
            await questions.penalty.fill('2');
            await saveAndWait(editor);
            const [first] = await storedQuestions<{
                text: string;
                points: number;
                penalty: number;
            }>(TITLES.assessment);
            expect
                .soft(first, 'first stored question')
                .toMatchObject({
                    text: 'Which transport protocol is reliable, really?',
                    points: 8,
                    penalty: 2,
                });
        });

        await test.step('keeps special characters of a question title as literal text', async () => {
            await reopenFirstQuestion();
            await questions.title.fill(SPECIAL_TEXT);
            await saveAndWait(editor);
            const [first] = await storedQuestions<{ text: string }>(
                TITLES.assessment,
            );
            expect.soft(first?.text, 'stored question text').toBe(SPECIAL_TEXT);
        });

        await test.step('reorders questions by dragging a step', async () => {
            await dragWithMouse(
                questions.steps.first(),
                questions.steps.last(),
            );
            await expect
                .poll(() => questions.stepIcons(), {
                    message: 'question step icons',
                })
                .toEqual([
                    QUESTION_STEP_ICON.MCQ,
                    QUESTION_STEP_ICON.EMI,
                    QUESTION_STEP_ICON.FFQ,
                ]);
            await saveAndWait(editor);
            const types = (
                await storedQuestions<{ question_type: string; order: number }>(
                    TITLES.assessment,
                )
            )
                .slice()
                .sort((left, right) => left.order - right.order)
                .map((question) => question.question_type);
            expect
                .soft(types, 'stored question order')
                .toEqual(['MCQ', 'EMI', 'FFQ']);
        });

        const addedKinds = [
            'Free Form Question',
            'Multiple Choice Question',
            'Extended Matching Items Questions',
        ] as const;
        for (const kind of addedKinds) {
            await test.step(`adds a ${kind}`, async () => {
                await questions.add(kind);
                await expect
                    .soft(questions.steps, 'question steps')
                    .toHaveCount(4);
                await expect
                    .soft(questions.summary, 'question summary')
                    .toContainText('4 question(s)');
                await questions.deleteButton.click();
                await new ConfirmationDialog(page, 'Delete question').confirm();
                await expect
                    .soft(questions.steps, 'question steps after deleting it')
                    .toHaveCount(3);
            });
        }

        await test.step('keeps the identifiers of the remaining questions when a question was added, deleted and saved', async () => {
            const before = await storedQuestions<{ id: number }>(
                TITLES.assessment,
            );
            await questions.add('Free Form Question');
            await questions.deleteButton.click();
            await new ConfirmationDialog(page, 'Delete question').confirm();
            await saveAndWait(editor);
            const after = await storedQuestions<{ id: number }>(
                TITLES.assessment,
            );
            expect
                .soft(
                    after.map((question) => question.id),
                    'stored question identifiers',
                )
                .toEqual(before.map((question) => question.id));
        });

        await test.step('keeps the question when deleting is cancelled', async () => {
            await questions.deleteButton.click();
            await new ConfirmationDialog(page, 'Delete question').cancel();
            await expect.soft(questions.steps, 'question steps').toHaveCount(3);
        });

        await test.step('deletes the open question after confirmation and saves the remaining two', async () => {
            await questions.deleteButton.click();
            await new ConfirmationDialog(page, 'Delete question').confirm();
            await expect.soft(questions.steps, 'question steps').toHaveCount(2);
            await saveAndWait(editor);
            expect
                .soft(
                    await storedQuestions(TITLES.assessment),
                    'stored questions',
                )
                .toHaveLength(2);
        });

        await test.step('disables Save for an empty and a whitespace-only title', async () => {
            await form.title.fill('');
            await expect
                .soft(editor.saveButton, 'Save with an empty title')
                .toBeDisabled();
            await form.title.fill('   ');
            await expect
                .soft(editor.saveButton, 'Save with a whitespace title')
                .toBeDisabled();
            await form.title.fill(TITLES.assessment);
        });

        const invalidLevelValues = [
            ['estimatedDuration', '0'],
            ['estimatedDuration', '-1'],
            ['minimalSolveTime', '-1'],
        ] as const;
        const validLevelValues = {
            estimatedDuration: '3',
            minimalSolveTime: originalMinimalSolveTime,
        } as const;
        for (const [field, value] of invalidLevelValues) {
            await test.step(`disables Save for ${field} set to ${value}`, async () => {
                await form[field].fill(value);
                await expect.soft(editor.saveButton, 'Save').toBeDisabled();
                await form[field].fill(validLevelValues[field]);
            });
        }

        await test.step('keeps special characters of title and instructions as literal text', async () => {
            await form.estimatedDuration.fill('3');
            await form.minimalSolveTime.fill(originalMinimalSolveTime);
            await form.title.fill(SPECIAL_TEXT);
            await form.instructions.fill(SPECIAL_TEXT);
            await saveAndWait(editor);
            expect
                .soft(
                    (await levelByTitle(api, definition.id, SPECIAL_TEXT))[
                        'instructions'
                    ],
                    'stored instructions',
                )
                .toBe(SPECIAL_TEXT);
        });

        await test.step('saves a new title, durations and instructions', async () => {
            await editor.openLevel(LEVEL_INDEX.assessment);
            await form.title.fill('Assessment renamed');
            await form.estimatedDuration.fill('9');
            await form.minimalSolveTime.fill('2');
            await form.instructions.fill('New instructions');
            await saveAndWait(editor);
            const level = await levelByTitle(
                api,
                definition.id,
                'Assessment renamed',
            );
            expect.soft(level['estimated_duration'], 'stored duration').toBe(9);
            expect
                .soft(
                    level['minimal_possible_solve_time'],
                    'stored minimal solve time',
                )
                .toBe(2);
            expect
                .soft(level['instructions'], 'stored instructions')
                .toBe('New instructions');
        });

        await test.step('names the problem in the interface instead of failing on save when a new Test question has no answer', async () => {
            await form.testSwitch.setChecked(true);
            await questions.open();
            await questions.add('Multiple Choice Question');
            await expect.soft(editor.saveButton, 'Save').toBeDisabled();
            await expect.soft(errorDialog(page), 'error dialog').toHaveCount(0);
        });
    });

    test('checks the free form, multiple choice and matching questions', async ({
        page,
        apiAs,
        uniqueName,
    }) => {
        test.slow();
        const { editor, definition, api } = await openFullDefinition(
            page,
            apiAs('trainingDesigner'),
            uniqueName('question-kinds'),
            LEVEL_INDEX.assessment,
        );
        const questions = editor.assessmentLevel.questions;
        await questions.open();
        const openQuestion = async (index: number): Promise<void> => {
            await editor.openLevel(LEVEL_INDEX.assessment);
            await questions.open();
            await questions.steps.nth(index).click();
        };

        await openQuestion(0);

        await test.step('lists the accepted answers of the question', async () => {
            await expectInputValues(questions.acceptedAnswers, ['tcp']);
        });

        await test.step('adds and saves an accepted answer', async () => {
            await questions.addAnswerButton.click();
            await expect(questions.acceptedAnswers).toHaveCount(2);
            await questions.acceptedAnswers.last().fill('TCP');
            await expect
                .soft(questions.acceptedAnswers, 'accepted answers')
                .toHaveCount(2);
            await expect.soft(editor.saveButton, 'Save').toBeEnabled();
        });

        await test.step('shows an error and disables Save when a Test question has no answer', async () => {
            await questions.removeAnswerButtons.first().click();
            await questions.removeAnswerButtons.first().click();
            await expect
                .soft(questions.acceptedAnswers, 'accepted answers')
                .toHaveCount(0);
            await expect
                .soft(questions.errors, 'question error')
                .toContainText('Test question must have correct answers.');
            await expect.soft(editor.saveButton, 'Save').toBeDisabled();
            await questions.addAnswerButton.click();
            await questions.acceptedAnswers.last().fill('tcp');
        });

        await openQuestion(1);

        await test.step('lists the choices with the correct one ticked', async () => {
            await expectInputValues(questions.choiceTexts, [
                'SSH',
                'DNS',
                'NTP',
            ]);
            await expect
                .soft(questions.choiceCorrectCheckboxes.nth(0), 'first choice')
                .toBeChecked();
            await expect
                .soft(questions.choiceCorrectCheckboxes.nth(1), 'second choice')
                .not.toBeChecked();
        });

        await test.step('adds a choice and saves it', async () => {
            await questions.addChoiceButton.click();
            await expect(questions.choiceTexts).toHaveCount(4);
            await questions.choiceTexts.last().fill('FTP');
            await saveAndWait(editor);
            const level = await levelByTitle(
                api,
                definition.id,
                TITLES.assessment,
            );
            const stored = (
                level['questions'] as {
                    question_type: string;
                    choices: { text: string }[];
                }[]
            ).find((question) => question.question_type === 'MCQ');
            expect
                .soft(
                    stored?.choices.map((choice) => choice.text),
                    'stored choices',
                )
                .toEqual(['SSH', 'DNS', 'NTP', 'FTP']);
        });

        await test.step('deletes a choice with its delete button', async () => {
            await openQuestion(1);
            await questions.deleteChoiceButtons.last().click();
            await expectInputValues(questions.choiceTexts, [
                'SSH',
                'DNS',
                'NTP',
            ]);
        });

        await test.step('shows an error and disables Save when no choice is correct', async () => {
            await questions.choiceCorrectCheckboxes.nth(0).uncheck();
            await expect
                .soft(questions.errors, 'question error')
                .toContainText(
                    'Test question must have selected correct answers',
                );
            await expect.soft(editor.saveButton, 'Save').toBeDisabled();
            await questions.choiceCorrectCheckboxes.nth(0).check();
        });

        await test.step('clears every correct mark with Clear answers', async () => {
            await questions.clearChoiceAnswersButton.click();
            await expect
                .soft(questions.choiceCorrectCheckboxes.nth(0), 'first choice')
                .not.toBeChecked();
            await expect.soft(editor.saveButton, 'Save').toBeDisabled();
            await questions.choiceCorrectCheckboxes.nth(0).check();
        });

        await test.step('shows an error and disables Save for an empty choice text', async () => {
            await questions.choiceTexts.nth(1).fill('');
            await questions.choiceTexts.nth(1).blur();
            await expect
                .soft(questions.errors, 'question error')
                .toContainText('Option text cannot be empty');
            await expect.soft(editor.saveButton, 'Save').toBeDisabled();
            await questions.choiceTexts.nth(1).fill('DNS');
        });

        await test.step('keeps special characters of a choice as literal text', async () => {
            await questions.choiceTexts.nth(1).fill(SPECIAL_TEXT);
            await expect
                .soft(questions.questionCard.locator('b'), 'no bold element')
                .toHaveCount(0);
            await expect.soft(editor.saveButton, 'Save').toBeEnabled();
        });

        await openQuestion(2);

        await test.step('lists the options, the statements and the correct matches', async () => {
            await expectInputValues(questions.matchingOptions, ['SSH', 'HTTP']);
            await expectInputValues(questions.matchingStatements, [
                'Port 22',
                'Port 80',
            ]);
            await expect
                .soft(
                    questions.questionCard.locator(
                        'input[type="radio"]:checked',
                    ),
                    'checked matches',
                )
                .toHaveCount(2);
        });

        await test.step('adds and deletes an option', async () => {
            await questions.addOptionButton.click();
            await expect
                .soft(questions.matchingOptions, 'options')
                .toHaveCount(3);
            await questions.deleteOptionButtons.last().click();
            await expect
                .soft(questions.matchingOptions, 'options after deleting')
                .toHaveCount(2);
        });

        await test.step('adds and deletes a statement', async () => {
            await questions.addStatementButton.click();
            await expect
                .soft(questions.matchingStatements, 'statements')
                .toHaveCount(3);
            await questions.deleteStatementButtons.last().click();
            await expect
                .soft(questions.matchingStatements, 'statements after deleting')
                .toHaveCount(2);
        });

        await test.step('marks a statement with its correct option and clears the marks with Clear Answers', async () => {
            await questions.clearMatchingAnswersButton.click();
            await expect
                .soft(editor.saveButton, 'Save without matches')
                .toBeDisabled();
            await questions.matchingRadios.nth(0).check();
            await questions.matchingRadios.nth(3).check();
            await expect
                .soft(editor.saveButton, 'Save with matches')
                .toBeEnabled();
        });

        await test.step('explains a blank option or statement', async () => {
            await questions.matchingOptions.first().fill('');
            await questions.matchingOptions.first().blur();
            await expect
                .soft(questions.errors.first(), 'option error')
                .toBeVisible();
            await questions.matchingOptions.first().fill('SSH');
            await questions.matchingStatements.first().fill('');
            await questions.matchingStatements.first().blur();
            await expect
                .soft(questions.errors.first(), 'statement error')
                .toBeVisible();
            await questions.matchingStatements.first().fill('Port 22');
        });

        await test.step('refuses an option longer than 255 characters with a message', async () => {
            await questions.matchingOptions.first().fill('o'.repeat(256));
            await questions.matchingOptions.first().blur();
            await expect.soft(editor.saveButton, 'Save').toBeDisabled();
            await expect
                .soft(questions.errors.first(), 'option error')
                .toBeVisible();
            await questions.matchingOptions.first().fill('SSH');
        });

        await test.step('offers the Add option button again after an option is deleted at the option limit', async () => {
            for (
                let added = 0;
                added < 20 && (await questions.addOptionButton.isVisible());
                added++
            ) {
                await questions.addOptionButton.click();
            }
            await expect
                .soft(questions.addOptionButton, 'Add option at the limit')
                .toBeHidden();
            await questions.deleteOptionButtons.last().click();
            await expect
                .soft(questions.addOptionButton, 'Add option below the limit')
                .toBeVisible();
        });
    });
});
