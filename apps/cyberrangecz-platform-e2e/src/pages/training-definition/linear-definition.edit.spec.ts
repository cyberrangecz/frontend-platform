import type { Page } from '@playwright/test';
import { expect, test } from '../../support/fixtures';
import { expectRedirectedAway } from '../../support/route-guard';
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

async function levelByTitle(api: Api, definitionId: number, title: string): Promise<DefinitionLevelDto> {
    const definition = await fetchDefinition(api, definitionId);
    const level = definition.levels?.find((candidate) => candidate.title === title);
    if (!level) {
        throw new Error(`Definition ${definitionId} holds no level titled "${title}"`);
    }
    return level;
}

async function saveAndWait(editor: DefinitionEditorPage): Promise<void> {
    await editor.saveButton.click();
    await waitForNotification(editor.page, /saved/i);
}

interface Prepared {
    editor: DefinitionEditorPage;
    definition: DefinitionDto;
    title: string;
    api: Api;
}

test.describe('linear-definition.edit', () => {
    test.use({ account: 'trainingDesigner' });

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

    test.describe('definition fields', () => {
        test('shows the edit heading, the saved values and the level count', async ({
            page,
            apiAs,
            uniqueName,
            checkpoint,
        }) => {
            const api = apiAs('trainingDesigner');
            const { editor, title } = await openFullDefinition(page, api, uniqueName('fields-loaded'));
            await expect(pageTitle(page)).toContainText(`Edit ${title}`);
            await expect(editor.title).toHaveValue(title);
            await expect(editor.description).toHaveValue('Shared training definition of the e2e suite run.');
            await expectInputValues(editor.notes.items, ['A terminal']);
            await expectInputValues(editor.outcomes.items, ['A finished training run']);
            await expect(editor.levelsCountInfo).toContainText(`${LEVEL_COUNT} level(s)`);
            await expect(editor.saveButton).toBeDisabled();
            await checkpoint(page, 'edit page loaded');
        });

        test('saves a new title and description', async ({ page, apiAs, uniqueName }) => {
            const api = apiAs('trainingDesigner');
            const definition = await createEmptyDefinition(api, uniqueName('fields-edit'));
            const editor = new DefinitionEditorPage(page);
            await editor.gotoEdit(definition.id);
            const newTitle = uniqueName('fields-edited');
            await editor.title.fill(newTitle);
            await editor.description.fill('A new description');
            await expect(editor.unsavedChangesWarning).toBeVisible();
            await expect(editor.saveButton).toBeEnabled();
            await saveAndWait(editor);
            await expect(editor.unsavedChangesWarning).toBeHidden();
            await expect(editor.saveButton).toBeDisabled();
            const saved = await fetchDefinition(api, definition.id);
            expect(saved.title).toBe(newTitle);
            expect(saved.description).toBe('A new description');
        });

        test('disables Save for an empty title and for a whitespace-only title', async ({
            page,
            apiAs,
            uniqueName,
        }) => {
            const definition = await createEmptyDefinition(apiAs('trainingDesigner'), uniqueName('fields-required'));
            const editor = new DefinitionEditorPage(page);
            await editor.gotoEdit(definition.id);
            await editor.title.fill('');
            await expect(editor.saveButton).toBeDisabled();
            await editor.title.fill('   ');
            await editor.title.blur();
            await expect(editor.titleErrors).toContainText('Title cannot be empty');
            await expect(editor.saveButton).toBeDisabled();
        });

        test('saves a title of exactly 255 characters and stops typing at the 256th', async ({
            page,
            apiAs,
            uniqueName,
        }) => {
            const api = apiAs('trainingDesigner');
            const definition = await createEmptyDefinition(api, uniqueName('fields-limit'));
            const editor = new DefinitionEditorPage(page);
            await editor.gotoEdit(definition.id);
            const longTitle = uniqueName('fields-limit-long').padEnd(256, 'x');
            await editor.title.fill(longTitle);
            await expect(editor.title).toHaveValue(longTitle.slice(0, 255));
            await saveAndWait(editor);
            expect((await fetchDefinition(api, definition.id)).title).toBe(longTitle.slice(0, 255));
        });

        test('keeps special characters of the title as literal text after saving', async ({
            page,
            apiAs,
            uniqueName,
        }) => {
            const api = apiAs('trainingDesigner');
            const definition = await createEmptyDefinition(api, uniqueName('fields-special'));
            const editor = new DefinitionEditorPage(page);
            await editor.gotoEdit(definition.id);
            const special = `${SPECIAL_TEXT} ${uniqueName('fields-special-title')}`;
            await editor.title.fill(special);
            await saveAndWait(editor);
            await page.reload();
            await expect(editor.title).toHaveValue(special);
            await expect(pageTitle(page).locator('b')).toHaveCount(0);
            expect((await fetchDefinition(api, definition.id)).title).toBe(special);
        });

        test('saves edited, added and removed notes and outcomes', async ({ page, apiAs, uniqueName }) => {
            const api = apiAs('trainingDesigner');
            const definition = await createEmptyDefinition(api, uniqueName('fields-lists'), {
                prerequisites: ['one note', 'two note'],
                outcomes: ['one outcome'],
            });
            const editor = new DefinitionEditorPage(page);
            await editor.gotoEdit(definition.id);
            await editor.notes.removeButton(0).click();
            await editor.notes.addItem('third note');
            await editor.outcomes.items.first().fill('changed outcome');
            await editor.outcomes.addItem('second outcome');
            await saveAndWait(editor);
            const saved = await fetchDefinition(api, definition.id);
            expect(saved.prerequisites).toEqual(['two note', 'third note']);
            expect(saved.outcomes).toEqual(['changed outcome', 'second outcome']);
        });

        test('refuses a single-character note and outcome with a message', async ({ page, apiAs, uniqueName }) => {
            const definition = await createEmptyDefinition(apiAs('trainingDesigner'), uniqueName('fields-single-char'));
            const editor = new DefinitionEditorPage(page);
            await editor.gotoEdit(definition.id);
            await editor.notes.addItem('x');
            await editor.outcomes.addItem('y');
            await expect(editor.notes.errors).toHaveText('Notes must be at least 2 characters.');
            await expect(editor.outcomes.errors).toHaveText('Outcomes must be at least 2 characters.');
            await expect(editor.saveButton).toBeDisabled();
        });

        test('stores notes and outcomes trimmed', async ({ page, apiAs, uniqueName }) => {
            const api = apiAs('trainingDesigner');
            const definition = await createEmptyDefinition(api, uniqueName('fields-trimmed'));
            const editor = new DefinitionEditorPage(page);
            await editor.gotoEdit(definition.id);
            await editor.notes.addItem('  ab  ');
            await editor.outcomes.addItem('  cd  ');
            await saveAndWait(editor);
            const saved = await fetchDefinition(api, definition.id);
            expect(saved.prerequisites).toEqual(['ab']);
            expect(saved.outcomes).toEqual(['cd']);
        });

        test('does not keep a whitespace-only note as an entry', async ({ page, apiAs, uniqueName }) => {
            const api = apiAs('trainingDesigner');
            const definition = await createEmptyDefinition(api, uniqueName('fields-blank-note'));
            const editor = new DefinitionEditorPage(page);
            await editor.gotoEdit(definition.id);
            await editor.title.fill(uniqueName('fields-blank-note-edited'));
            await editor.notes.addItem('   ');
            await expect(editor.notes.errors).toHaveText('Notes must be at least 2 characters.');
            await expect(editor.saveButton).toBeDisabled();
        });

        test('collapses and expands the Training Definition panel', async ({ page, apiAs, uniqueName }) => {
            const definition = await createEmptyDefinition(apiAs('trainingDesigner'), uniqueName('fields-panel'));
            const editor = new DefinitionEditorPage(page);
            await editor.gotoEdit(definition.id);
            const header = page.locator('mat-expansion-panel-header', { hasText: 'Training Definition' }).first();
            await header.click();
            await expect(editor.title).toBeHidden();
            await header.click();
            await expect(editor.title).toBeVisible();
        });
    });

    test.describe('released definition', () => {
        test('does not offer editing of a released definition', async ({ page, apiAs, uniqueName }) => {
            const api = apiAs('trainingDesigner');
            const definition = await createEmptyDefinition(api, uniqueName('released-locked'));
            await changeDefinitionState(api, definition.id, 'RELEASED');
            const editor = new DefinitionEditorPage(page);
            await editor.gotoEdit(definition.id);
            await expect(editor.title).toBeDisabled();
            await expect(editor.saveButton).toBeDisabled();
            await expect(page.getByText('Editing is disabled: the definition is released.')).toBeVisible();
        });

        test('does not offer editing of a definition used by a training instance', async ({ page, shared }) => {
            const editor = new DefinitionEditorPage(page);
            await editor.gotoEdit(shared.trainingDefinition.id);
            await expect(editor.title).toBeDisabled();
            await expect(editor.saveButton).toBeDisabled();
            await expect(editor.levels.addButton).toBeDisabled();
            await expect(editor.levels.deleteButton).toBeDisabled();
        });
    });

    test.describe('unsaved changes guard', () => {
        test('asks before leaving and keeps the edit after Cancel', async ({
            page,
            apiAs,
            uniqueName,
            checkpoint,
        }) => {
            const definition = await createEmptyDefinition(apiAs('trainingDesigner'), uniqueName('guard-cancel'));
            const editor = new DefinitionEditorPage(page);
            await editor.gotoEdit(definition.id);
            const edited = uniqueName('guard-cancel-edited');
            await editor.title.fill(edited);
            await breadcrumbLink(page, 'Training Definitions').click();
            const dialog = new ConfirmationDialog(page, 'Unsaved changes');
            await expect(dialog.message).toContainText('There are unsaved changes');
            await checkpoint(page, 'guard dialog');
            await dialog.cancel();
            await expect(page).toHaveURL(new RegExp(`/linear-definition/${definition.id}/edit$`));
            await expect(editor.title).toHaveValue(edited);
        });

        test('discards the edit when leaving is confirmed', async ({ page, apiAs, uniqueName }) => {
            const api = apiAs('trainingDesigner');
            const original = uniqueName('guard-leave');
            const definition = await createEmptyDefinition(api, original);
            const editor = new DefinitionEditorPage(page);
            await editor.gotoEdit(definition.id);
            await editor.title.fill(uniqueName('guard-leave-edited'));
            await breadcrumbLink(page, 'Training Definitions').click();
            await new ConfirmationDialog(page, 'Unsaved changes').confirm();
            await expect(page).toHaveURL(/\/linear-definition$/);
            expect((await fetchDefinition(api, definition.id)).title).toBe(original);
        });

        test('leaves without asking when the edit was saved', async ({ page, apiAs, uniqueName }) => {
            const definition = await createEmptyDefinition(apiAs('trainingDesigner'), uniqueName('guard-saved'));
            const editor = new DefinitionEditorPage(page);
            await editor.gotoEdit(definition.id);
            await editor.title.fill(uniqueName('guard-saved-edited'));
            await saveAndWait(editor);
            await breadcrumbLink(page, 'Training Definitions').click();
            await expect(page).toHaveURL(/\/linear-definition$/);
        });

        test('asks before leaving after a level was changed', async ({ page, apiAs, uniqueName }) => {
            const { editor } = await openFullDefinition(page, apiAs('trainingDesigner'), uniqueName('guard-level'), LEVEL_INDEX.info);
            await editor.infoLevel.title.fill(uniqueName('guard-level-title'));
            await expect(editor.unsavedChangesWarning).toBeVisible();
            await breadcrumbLink(page, 'Training Definitions').click();
            await expect(new ConfirmationDialog(page, 'Unsaved changes').root).toBeVisible();
        });
    });

    test.describe('levels overview', () => {
        test('lists the levels in order with their types', async ({ page, apiAs, uniqueName, checkpoint }) => {
            const { editor } = await openFullDefinition(page, apiAs('trainingDesigner'), uniqueName('levels-list'));
            await expect(editor.levels.stepsOfKind('Info Level')).toHaveCount(1);
            await expect(editor.levels.stepsOfKind('Access Level')).toHaveCount(1);
            await expect(editor.levels.stepsOfKind('Training Level')).toHaveCount(3);
            await expect(editor.levels.stepsOfKind('Assessment Level')).toHaveCount(1);
            await checkpoint(page, 'levels listed');
        });

        test('offers the four level kinds in the Add menu', async ({ page, apiAs, uniqueName }) => {
            const { editor } = await openFullDefinition(page, apiAs('trainingDesigner'), uniqueName('levels-menu'));
            await editor.levels.addButton.click();
            await expect(editor.levels.addMenuEntries).toHaveText([
                /Training Level$/,
                /Access Level$/,
                /Assessment Level$/,
                /Info Level$/,
            ]);
        });

        for (const [kind, levelType] of [
            ['Info Level', 'INFO_LEVEL'],
            ['Access Level', 'ACCESS_LEVEL'],
            ['Training Level', 'TRAINING_LEVEL'],
            ['Assessment Level', 'ASSESSMENT_LEVEL'],
        ] as const) {
            test(`adds a ${kind} to the end of the list`, async ({ page, apiAs, uniqueName }) => {
                const { editor, definition, api } = await openFullDefinition(page, apiAs('trainingDesigner'), uniqueName(`levels-add-${levelType.toLowerCase()}`));
                await editor.levels.add(kind);
                await expect(editor.levels.steps).toHaveCount(LEVEL_COUNT + 1);
                await expect(editor.levelsCountInfo).toContainText(`${LEVEL_COUNT + 1} level(s)`);
                await expect(editor.saveButton).toBeEnabled();
                await saveAndWait(editor);
                await expect
                    .poll(async () => (await fetchDefinition(api, definition.id)).levels?.at(-1)?.level_type)
                    .toBe(levelType);
            });
        }

        test('does not create the level on the server before Save', async ({ page, apiAs, uniqueName }) => {
            const { editor, definition, api } = await openFullDefinition(page, apiAs('trainingDesigner'), uniqueName('levels-add-unsaved'));
            await editor.levels.add('Info Level');
            await expect(editor.levels.steps).toHaveCount(LEVEL_COUNT + 1);
            await expect(editor.unsavedChangesWarning).toBeVisible();
            expect((await fetchDefinition(api, definition.id)).levels).toHaveLength(LEVEL_COUNT);
        });

        test('keeps the level when deleting is cancelled', async ({ page, apiAs, uniqueName }) => {
            const { editor, definition, api } = await openFullDefinition(page, apiAs('trainingDesigner'), uniqueName('levels-delete-cancel'), LEVEL_INDEX.info);
            await editor.levels.deleteButton.click();
            const dialog = new ConfirmationDialog(page, 'Delete Level');
            await expect(dialog.root).toBeVisible();
            await dialog.cancel();
            await expect(editor.levels.steps).toHaveCount(LEVEL_COUNT);
            expect((await fetchDefinition(api, definition.id)).levels).toHaveLength(LEVEL_COUNT);
        });

        test('deletes the selected level after confirmation', async ({ page, apiAs, uniqueName, checkpoint }) => {
            const { editor, definition, api } = await openFullDefinition(page, apiAs('trainingDesigner'), uniqueName('levels-delete'), LEVEL_INDEX.info);
            await editor.levels.deleteButton.click();
            await checkpoint(page, 'delete level confirmation');
            await new ConfirmationDialog(page, 'Delete Level').confirm();
            await expect(editor.levels.steps).toHaveCount(LEVEL_COUNT - 1);
            await expect(editor.saveButton).toBeEnabled();
            await saveAndWait(editor);
            await expect
                .poll(async () => (await fetchDefinition(api, definition.id)).levels?.map((level) => level.title))
                .not.toContain(TITLES.info);
        });

        test('deletes every level and then shows the empty hint with Delete disabled', async ({
            page,
            apiAs,
            uniqueName,
        }) => {
            const { editor } = await openFullDefinition(page, apiAs('trainingDesigner'), uniqueName('levels-delete-all'), 0);
            for (let remaining = LEVEL_COUNT; remaining > 0; remaining--) {
                await editor.levels.deleteButton.click();
                await new ConfirmationDialog(page, 'Delete Level').confirm();
                await expect(editor.levels.steps).toHaveCount(remaining - 1);
            }
            await expect(editor.levels.emptyHint).toBeVisible();
            await expect(editor.levels.deleteButton).toBeDisabled();
        });

        test('moves a level to another position by dragging its step', async ({ page, apiAs, uniqueName }) => {
            const { editor, definition, api } = await openFullDefinition(page, apiAs('trainingDesigner'), uniqueName('levels-reorder'));
            await dragWithMouse(editor.levels.step(LEVEL_INDEX.firstTraining), editor.levels.step(LEVEL_INDEX.secondTraining));
            await saveAndWait(editor);
            await expect
                .poll(async () =>
                    (await fetchDefinition(api, definition.id)).levels
                        ?.slice()
                        .sort((left, right) => left.order - right.order)
                        .map((level) => level.title),
                )
                .toEqual([
                    TITLES.info,
                    TITLES.access,
                    TITLES.secondTraining,
                    TITLES.firstTraining,
                    TITLES.variantTraining,
                    TITLES.assessment,
                ]);
        });

        test('selects the level of a clicked step and shows its form', async ({ page, apiAs, uniqueName }) => {
            const { editor } = await openFullDefinition(page, apiAs('trainingDesigner'), uniqueName('levels-select'));
            await editor.openLevel(LEVEL_INDEX.access);
            await expect(editor.accessLevel.title).toHaveValue(TITLES.access);
            await editor.openLevel(LEVEL_INDEX.firstTraining);
            await expect(editor.trainingLevel.title).toHaveValue(TITLES.firstTraining);
            await editor.openLevel(LEVEL_INDEX.assessment);
            await expect(editor.assessmentLevel.title).toHaveValue(TITLES.assessment);
            await editor.openLevel(LEVEL_INDEX.info);
            await expect(editor.infoLevel.title).toHaveValue(TITLES.info);
        });

        test('shows a renamed level title in the stepper after saving', async ({ page, apiAs, uniqueName }) => {
            const { editor } = await openFullDefinition(page, apiAs('trainingDesigner'), uniqueName('levels-rename'), LEVEL_INDEX.info);
            await editor.infoLevel.title.fill('Renamed');
            await saveAndWait(editor);
            await expect(editor.levels.step(LEVEL_INDEX.info)).toContainText('Renamed');
        });
    });

    test.describe('info level', () => {
        test('saves a new title and content', async ({ page, apiAs, uniqueName }) => {
            const { editor, definition, api } = await openFullDefinition(page, apiAs('trainingDesigner'), uniqueName('info-edit'), LEVEL_INDEX.info);
            await editor.infoLevel.title.fill('Briefing renamed');
            await editor.infoLevel.content.fill('**new** content');
            await saveAndWait(editor);
            const level = await levelByTitle(api, definition.id, 'Briefing renamed');
            expect(level['content']).toBe('**new** content');
        });

        test('disables Save for an empty and for a whitespace-only title', async ({ page, apiAs, uniqueName }) => {
            const { editor } = await openFullDefinition(page, apiAs('trainingDesigner'), uniqueName('info-required'), LEVEL_INDEX.info);
            await editor.infoLevel.title.fill('');
            await expect(editor.infoLevel.errors.first()).toBeVisible();
            await expect(editor.saveButton).toBeDisabled();
            await editor.infoLevel.title.fill('   ');
            await expect(editor.saveButton).toBeDisabled();
        });

        test('keeps special characters of title and content as literal text', async ({ page, apiAs, uniqueName }) => {
            const { editor, definition, api } = await openFullDefinition(page, apiAs('trainingDesigner'), uniqueName('info-special'), LEVEL_INDEX.info);
            await editor.infoLevel.title.fill(SPECIAL_TEXT);
            await editor.infoLevel.content.fill(SPECIAL_TEXT);
            await saveAndWait(editor);
            const level = await levelByTitle(api, definition.id, SPECIAL_TEXT);
            expect(level['content']).toBe(SPECIAL_TEXT);
            await expect(editor.levels.step(LEVEL_INDEX.info).locator('b')).toHaveCount(0);
        });
    });

    test.describe('access level', () => {
        test('saves a new title, passkey and both contents', async ({ page, apiAs, uniqueName }) => {
            const { editor, definition, api } = await openFullDefinition(page, apiAs('trainingDesigner'), uniqueName('access-edit'), LEVEL_INDEX.access);
            await editor.accessLevel.title.fill('Access renamed');
            await editor.accessLevel.passkey.fill('new-passkey');
            await editor.accessLevel.cloudContent.fill('cloud text');
            await editor.accessLevel.localContent.fill('local text');
            await saveAndWait(editor);
            const level = await levelByTitle(api, definition.id, 'Access renamed');
            expect(level['passkey']).toBe('new-passkey');
            expect(level['cloud_content']).toBe('cloud text');
            expect(level['local_content']).toBe('local text');
        });

        test('shows the passkey length against the limit of 50 and stops at 50 characters', async ({
            page,
            apiAs,
            uniqueName,
        }) => {
            const { editor } = await openFullDefinition(page, apiAs('trainingDesigner'), uniqueName('access-limit'), LEVEL_INDEX.access);
            await editor.accessLevel.passkey.fill('p'.repeat(51));
            await expect(editor.accessLevel.passkey).toHaveValue('p'.repeat(50));
            await expect(editor.accessLevel.passkeyCounter).toContainText('50/50');
        });

        test('disables Save for an empty passkey and shows an error', async ({ page, apiAs, uniqueName }) => {
            const { editor } = await openFullDefinition(page, apiAs('trainingDesigner'), uniqueName('access-passkey-empty'), LEVEL_INDEX.access);
            await editor.accessLevel.passkey.fill('');
            await editor.accessLevel.passkey.blur();
            await expect(editor.accessLevel.errors.first()).toBeVisible();
            await expect(editor.saveButton).toBeDisabled();
        });

        test('disables Save for an empty title', async ({ page, apiAs, uniqueName }) => {
            const { editor } = await openFullDefinition(page, apiAs('trainingDesigner'), uniqueName('access-title-empty'), LEVEL_INDEX.access);
            await editor.accessLevel.title.fill('');
            await expect(editor.saveButton).toBeDisabled();
        });

        test('keeps special characters of the passkey as literal text', async ({ page, apiAs, uniqueName }) => {
            const { editor, definition, api } = await openFullDefinition(page, apiAs('trainingDesigner'), uniqueName('access-special'), LEVEL_INDEX.access);
            await editor.accessLevel.passkey.fill('Žluťoučký <b>x</b>');
            await saveAndWait(editor);
            expect((await levelByTitle(api, definition.id, TITLES.access))['passkey']).toBe('Žluťoučký <b>x</b>');
        });

        test('saves the title without leading and trailing spaces', async ({ page, apiAs, uniqueName }) => {
            const { editor, definition, api } = await openFullDefinition(page, apiAs('trainingDesigner'), uniqueName('access-spaces'), LEVEL_INDEX.access);
            await editor.accessLevel.title.fill('  Spaced title  ');
            await saveAndWait(editor);
            const level = (await fetchDefinition(api, definition.id)).levels?.[LEVEL_INDEX.access];
            expect(level?.title).toBe('Spaced title');
        });
    });

    test.describe('training level', () => {
        test('shows the values of the saved level', async ({ page, apiAs, uniqueName, checkpoint }) => {
            const { editor } = await openFullDefinition(page, apiAs('trainingDesigner'), uniqueName('training-loaded'), LEVEL_INDEX.firstTraining);
            const form = editor.trainingLevel;
            await expect(form.title).toHaveValue(TITLES.firstTraining);
            await expect(form.estimatedDuration).toHaveValue('5');
            await expect(form.points).toHaveValue('20');
            await expect(form.incorrectAnswerLimit).toHaveValue('5');
            await expect(form.staticAnswer).toHaveValue('e2e-flag-one');
            await expect(form.variantAnswers).not.toBeChecked();
            await expect(form.solutionPenalized).toBeChecked();
            await expect(form.commandsRequired).not.toBeChecked();
            await checkpoint(page, 'training level loaded');
        });

        test('saves every edited field', async ({ page, apiAs, uniqueName }) => {
            const { editor, definition, api } = await openFullDefinition(page, apiAs('trainingDesigner'), uniqueName('training-edit'), LEVEL_INDEX.firstTraining);
            const form = editor.trainingLevel;
            await form.title.fill('Training renamed');
            await form.estimatedDuration.fill('12');
            await form.minimalSolveTime.fill('3');
            await form.content.fill('new level content');
            await form.solution.fill('new level solution');
            await form.points.fill('40');
            await form.incorrectAnswerLimit.fill('7');
            await form.staticAnswer.fill('new-answer');
            await form.solutionPenalized.uncheck();
            await form.commandsRequired.check();
            await saveAndWait(editor);
            const level = await levelByTitle(api, definition.id, 'Training renamed');
            expect(level['estimated_duration']).toBe(12);
            expect(level['minimal_possible_solve_time']).toBe(3);
            expect(level['content']).toBe('new level content');
            expect(level['solution']).toBe('new level solution');
            expect(level['max_score']).toBe(40);
            expect(level['incorrect_answer_limit']).toBe(7);
            expect(level['answer']).toBe('new-answer');
            expect(level['solution_penalized']).toBe(false);
            expect(level['commands_required']).toBe(true);
        });

        test('disables Save for an empty and a whitespace-only title', async ({ page, apiAs, uniqueName }) => {
            const { editor } = await openFullDefinition(page, apiAs('trainingDesigner'), uniqueName('training-title'), LEVEL_INDEX.firstTraining);
            await editor.trainingLevel.title.fill('');
            await expect(editor.saveButton).toBeDisabled();
            await editor.trainingLevel.title.fill('   ');
            await expect(editor.saveButton).toBeDisabled();
        });

        for (const [field, value] of [
            ['estimatedDuration', '0'],
            ['estimatedDuration', '-1'],
            ['estimatedDuration', 'abc'],
            ['minimalSolveTime', '-1'],
            ['points', '101'],
            ['points', '-1'],
            ['incorrectAnswerLimit', '0'],
            ['incorrectAnswerLimit', '101'],
        ] as const) {
            test(`disables Save for ${field} set to ${value}`, async ({ page, apiAs, uniqueName }) => {
                const { editor } = await openFullDefinition(page, apiAs('trainingDesigner'), uniqueName(`training-invalid-${field}-${value}`), LEVEL_INDEX.firstTraining);
                await editor.trainingLevel[field].fill(value);
                await expect(editor.saveButton).toBeDisabled();
            });
        }

        for (const [field, value] of [
            ['estimatedDuration', '1'],
            ['minimalSolveTime', '0'],
            ['points', '100'],
            ['incorrectAnswerLimit', '1'],
            ['incorrectAnswerLimit', '100'],
        ] as const) {
            test(`accepts the boundary value ${value} in ${field}`, async ({ page, apiAs, uniqueName }) => {
                const { editor } = await openFullDefinition(page, apiAs('trainingDesigner'), uniqueName(`training-boundary-${field}-${value}`), LEVEL_INDEX.firstTraining);
                await editor.trainingLevel[field].fill(value);
                await expect(editor.saveButton).toBeEnabled();
            });
        }

        test('accepts the boundary value 0 in points on a level without hints', async ({ page, apiAs, uniqueName }) => {
            const { editor } = await openFullDefinition(page, apiAs('trainingDesigner'), uniqueName('training-boundary-points-0'), LEVEL_INDEX.firstTraining);
            const hints = editor.trainingLevel.hints;
            await hints.open();
            for (let remaining = SHARED_TRAINING_HINTS.length; remaining > 0; remaining--) {
                await hints.deleteButton.click();
                await new ConfirmationDialog(page, 'Delete Hint').confirm();
                await expect(hints.steps).toHaveCount(remaining - 1);
            }
            await editor.trainingLevel.points.fill('0');
            await expect(editor.saveButton).toBeEnabled();
        });

        test('disables Save for an empty static answer and stops it at 50 characters', async ({
            page,
            apiAs,
            uniqueName,
        }) => {
            const { editor } = await openFullDefinition(page, apiAs('trainingDesigner'), uniqueName('training-answer'), LEVEL_INDEX.firstTraining);
            await editor.trainingLevel.staticAnswer.fill('');
            await expect(editor.saveButton).toBeDisabled();
            await editor.trainingLevel.staticAnswer.fill('a'.repeat(51));
            await expect(editor.trainingLevel.staticAnswer).toHaveValue('a'.repeat(50));
        });

        test('swaps the static answer for a variable name when Variant Answers is ticked', async ({
            page,
            apiAs,
            uniqueName,
        }) => {
            const { editor, definition, api } = await openFullDefinition(page, apiAs('trainingDesigner'), uniqueName('training-variant'), LEVEL_INDEX.firstTraining);
            const form = editor.trainingLevel;
            await form.variantAnswers.check();
            await expect(form.staticAnswer).toHaveCount(0);
            await form.answerVariableName.fill('flag_variable');
            await saveAndWait(editor);
            const level = await levelByTitle(api, definition.id, TITLES.firstTraining);
            expect(level['variant_answers']).toBe(true);
            expect(level['answer_variable_name']).toBe('flag_variable');
        });

        test('empties the answer input when Variant Answers is ticked and cleared again', async ({
            page,
            apiAs,
            uniqueName,
        }) => {
            const { editor } = await openFullDefinition(page, apiAs('trainingDesigner'), uniqueName('training-variant-toggle'), LEVEL_INDEX.firstTraining);
            const form = editor.trainingLevel;
            await form.variantAnswers.check();
            await form.variantAnswers.uncheck();
            await expect(form.staticAnswer).toHaveValue('');
            await expect(editor.saveButton).toBeDisabled();
        });

        test('empties the variable name when Variant Answers is cleared and ticked again', async ({
            page,
            apiAs,
            uniqueName,
        }) => {
            const { editor } = await openFullDefinition(page, apiAs('trainingDesigner'), uniqueName('training-variant-name'), LEVEL_INDEX.firstTraining);
            const form = editor.trainingLevel;
            await form.variantAnswers.check();
            await form.answerVariableName.fill('kept_name');
            await form.variantAnswers.uncheck();
            await form.variantAnswers.check();
            await expect(form.answerVariableName).toHaveValue('');
        });

        test('keeps special characters of content, solution and answer as literal text', async ({
            page,
            apiAs,
            uniqueName,
        }) => {
            const { editor, definition, api } = await openFullDefinition(page, apiAs('trainingDesigner'), uniqueName('training-special'), LEVEL_INDEX.firstTraining);
            const form = editor.trainingLevel;
            await form.content.fill(SPECIAL_TEXT);
            await form.solution.fill(SPECIAL_TEXT);
            await form.staticAnswer.fill('Žluťoučký');
            await saveAndWait(editor);
            const level = await levelByTitle(api, definition.id, TITLES.firstTraining);
            expect(level['content']).toBe(SPECIAL_TEXT);
            expect(level['solution']).toBe(SPECIAL_TEXT);
            expect(level['answer']).toBe('Žluťoučký');
        });

        test('saves the second training level independently of the first', async ({ page, apiAs, uniqueName }) => {
            const { editor, definition, api } = await openFullDefinition(page, apiAs('trainingDesigner'), uniqueName('training-second'), LEVEL_INDEX.secondTraining);
            await editor.trainingLevel.points.fill('30');
            await saveAndWait(editor);
            expect((await levelByTitle(api, definition.id, TITLES.secondTraining))['max_score']).toBe(30);
            expect((await levelByTitle(api, definition.id, TITLES.firstTraining))['max_score']).toBe(20);
        });
    });

    test.describe('hints', () => {
        test('lists the hints of the level and their count', async ({ page, apiAs, uniqueName, checkpoint }) => {
            const { editor } = await openFullDefinition(page, apiAs('trainingDesigner'), uniqueName('hints-list'), LEVEL_INDEX.firstTraining);
            const hints = editor.trainingLevel.hints;
            await expect(hints.summary).toContainText('2 hint(s)');
            await hints.open();
            await expect(hints.steps).toHaveCount(2);
            await expect(hints.title).toHaveValue('Look around');
            await expect(hints.penalty).toHaveValue('2');
            await checkpoint(page, 'hints panel open');
        });

        test('adds a hint', async ({ page, apiAs, uniqueName }) => {
            const { editor } = await openFullDefinition(page, apiAs('trainingDesigner'), uniqueName('hints-add'), LEVEL_INDEX.firstTraining);
            const hints = editor.trainingLevel.hints;
            await hints.open();
            await hints.addButton.click();
            await expect(hints.steps).toHaveCount(3);
            await expect(hints.summary).toContainText('3 hint(s)');
        });

        test('saves an edited hint title, penalty and content', async ({ page, apiAs, uniqueName }) => {
            const { editor, definition, api } = await openFullDefinition(page, apiAs('trainingDesigner'), uniqueName('hints-edit'), LEVEL_INDEX.firstTraining);
            const hints = editor.trainingLevel.hints;
            await hints.open();
            await hints.title.fill('Edited hint');
            await hints.penalty.fill('4');
            await hints.content.fill('Edited hint content');
            await saveAndWait(editor);
            const level = await levelByTitle(api, definition.id, TITLES.firstTraining);
            const saved = (level['hints'] as { title: string; hint_penalty: number; content: string }[])[0];
            expect(saved).toMatchObject({ title: 'Edited hint', hint_penalty: 4, content: 'Edited hint content' });
        });

        test('saves a newly added hint', async ({ page, apiAs, uniqueName }) => {
            const { editor, definition, api } = await openFullDefinition(page, apiAs('trainingDesigner'), uniqueName('hints-add-save'), LEVEL_INDEX.firstTraining);
            const hints = editor.trainingLevel.hints;
            await hints.open();
            await hints.addButton.click();
            await hints.title.fill('Third hint');
            await hints.penalty.fill('1');
            await hints.content.fill('Third content');
            await saveAndWait(editor);
            const level = await levelByTitle(api, definition.id, TITLES.firstTraining);
            expect((level['hints'] as unknown[]).length).toBe(3);
        });

        test('disables Save for an empty hint title', async ({ page, apiAs, uniqueName }) => {
            const { editor } = await openFullDefinition(page, apiAs('trainingDesigner'), uniqueName('hints-title-empty'), LEVEL_INDEX.firstTraining);
            const hints = editor.trainingLevel.hints;
            await hints.open();
            await hints.title.fill('');
            await expect(editor.saveButton).toBeDisabled();
        });

        test('keeps special characters of the hint title and content as literal text', async ({
            page,
            apiAs,
            uniqueName,
        }) => {
            const { editor, definition, api } = await openFullDefinition(page, apiAs('trainingDesigner'), uniqueName('hints-special'), LEVEL_INDEX.firstTraining);
            const hints = editor.trainingLevel.hints;
            await hints.open();
            await hints.title.fill(SPECIAL_TEXT);
            await hints.content.fill(SPECIAL_TEXT);
            await saveAndWait(editor);
            const level = await levelByTitle(api, definition.id, TITLES.firstTraining);
            expect((level['hints'] as { title: string; content: string }[])[0]).toMatchObject({
                title: SPECIAL_TEXT,
                content: SPECIAL_TEXT,
            });
        });

        for (const [description, value] of [
            ['a penalty above what the level score allows', '18'],
            ['a negative penalty', '-1'],
            ['a fractional penalty', '5.7'],
        ] as const) {
            test(`disables Save for ${description}`, async ({ page, apiAs, uniqueName }) => {
                const { editor } = await openFullDefinition(page, apiAs('trainingDesigner'), uniqueName(`hints-penalty-invalid-${value}`), LEVEL_INDEX.firstTraining);
                const hints = editor.trainingLevel.hints;
                await hints.open();
                await hints.penalty.fill(value);
                await expect(editor.saveButton).toBeDisabled();
            });
        }

        test('accepts the largest penalty the level score allows', async ({ page, apiAs, uniqueName }) => {
            const { editor } = await openFullDefinition(page, apiAs('trainingDesigner'), uniqueName('hints-penalty-max'), LEVEL_INDEX.firstTraining);
            const hints = editor.trainingLevel.hints;
            await hints.open();
            await hints.penalty.fill('17');
            await expect(editor.saveButton).toBeEnabled();
        });

        test('keeps the hint when deleting is cancelled', async ({ page, apiAs, uniqueName }) => {
            const { editor } = await openFullDefinition(page, apiAs('trainingDesigner'), uniqueName('hints-delete-cancel'), LEVEL_INDEX.firstTraining);
            const hints = editor.trainingLevel.hints;
            await hints.open();
            await hints.deleteButton.click();
            await new ConfirmationDialog(page, 'Delete Hint').cancel();
            await expect(hints.steps).toHaveCount(2);
        });

        test('deletes the open hint after confirmation', async ({ page, apiAs, uniqueName }) => {
            const { editor, definition, api } = await openFullDefinition(page, apiAs('trainingDesigner'), uniqueName('hints-delete'), LEVEL_INDEX.firstTraining);
            const hints = editor.trainingLevel.hints;
            await hints.open();
            await hints.deleteButton.click();
            await new ConfirmationDialog(page, 'Delete Hint').confirm();
            await expect(hints.steps).toHaveCount(1);
            await saveAndWait(editor);
            const level = await levelByTitle(api, definition.id, TITLES.firstTraining);
            expect((level['hints'] as { title: string }[]).map((hint) => hint.title)).toEqual(['Read the file']);
        });

        test('reorders hints by dragging a step', async ({ page, apiAs, uniqueName }) => {
            const { editor, definition, api } = await openFullDefinition(page, apiAs('trainingDesigner'), uniqueName('hints-reorder'), LEVEL_INDEX.firstTraining);
            const hints = editor.trainingLevel.hints;
            await hints.open();
            await dragWithMouse(hints.steps.first(), hints.steps.last());
            await expect(hints.steps.first()).toContainText('Read');
            await saveAndWait(editor);
            const level = await levelByTitle(api, definition.id, TITLES.firstTraining);
            const ordered = (level['hints'] as { title: string; order: number }[])
                .slice()
                .sort((left, right) => left.order - right.order)
                .map((hint) => hint.title);
            expect(ordered).toEqual(['Read the file', 'Look around']);
        });

        test('names the hint of a step after its edited title', async ({ page, apiAs, uniqueName }) => {
            const { editor } = await openFullDefinition(page, apiAs('trainingDesigner'), uniqueName('hints-step-title'), LEVEL_INDEX.firstTraining);
            const hints = editor.trainingLevel.hints;
            await hints.open();
            await hints.title.fill('Renamed hint');
            await expect(hints.steps.first()).toContainText('Renamed');
        });
    });

    test.describe('MITRE ATT&CK techniques', () => {
        test('reports a level without techniques', async ({ page, apiAs, uniqueName }) => {
            const { editor } = await openFullDefinition(page, apiAs('trainingDesigner'), uniqueName('mitre-empty'), LEVEL_INDEX.firstTraining);
            await expect(editor.trainingLevel.mitre.summary).toContainText('no techniques');
        });

        test('adds a technique picked from the suggestions and saves it', async ({
            page,
            apiAs,
            uniqueName,
        }) => {
            const { editor, definition, api } = await openFullDefinition(page, apiAs('trainingDesigner'), uniqueName('mitre-add'), LEVEL_INDEX.firstTraining);
            const mitre = editor.trainingLevel.mitre;
            await mitre.open();
            await mitre.pick('TA0009.T1005');
            await expect(mitre.chips).toHaveCount(1);
            await expect(mitre.chips.first()).toContainText('TA0009.T1005');
            await expect(mitre.summary).toContainText('1 technique');
            await saveAndWait(editor);
            const level = await levelByTitle(api, definition.id, TITLES.firstTraining);
            expect((level['mitre_techniques'] as { technique_key: string }[]).map((entry) => entry.technique_key)).toEqual(['TA0009.T1005']);
        });

        test('suggests catalogue techniques while typing and adds the chosen one', async ({
            page,
            apiAs,
            uniqueName,
        }) => {
            const { editor } = await openFullDefinition(page, apiAs('trainingDesigner'), uniqueName('mitre-autocomplete'), LEVEL_INDEX.firstTraining);
            const mitre = editor.trainingLevel.mitre;
            await mitre.open();
            await mitre.input.fill('T1005');
            const option = page.getByRole('option', { name: /T1005 - / }).first();
            await expect(option).toBeVisible();
            await option.click();
            await expect(mitre.chips).toHaveCount(1);
            await expect(mitre.chips.first()).toContainText('T1005');
        });

        test('adds nothing for typed text outside the TACTIC.TECHNIQUE format', async ({ page, apiAs, uniqueName }) => {
            const { editor } = await openFullDefinition(page, apiAs('trainingDesigner'), uniqueName('mitre-format'), LEVEL_INDEX.firstTraining);
            const mitre = editor.trainingLevel.mitre;
            await mitre.open();
            await mitre.typeAndConfirm('not-a-technique');
            await expect(mitre.chips).toHaveCount(0);
            await expect(page.getByRole('option')).toHaveCount(0);
        });

        test('offers no suggestion for a well-formed technique that is not in the catalogue', async ({
            page,
            apiAs,
            uniqueName,
        }) => {
            const { editor } = await openFullDefinition(page, apiAs('trainingDesigner'), uniqueName('mitre-unknown'), LEVEL_INDEX.firstTraining);
            const mitre = editor.trainingLevel.mitre;
            await mitre.open();
            await mitre.typeAndConfirm('TA9999.T9999');
            await expect(mitre.chips).toHaveCount(0);
            await expect(mitre.suggestion('TA9999.T9999')).toHaveCount(0);
        });

        test('shows an already added technique as a disabled suggestion', async ({ page, apiAs, uniqueName }) => {
            const { editor } = await openFullDefinition(page, apiAs('trainingDesigner'), uniqueName('mitre-duplicate'), LEVEL_INDEX.firstTraining);
            const mitre = editor.trainingLevel.mitre;
            await mitre.open();
            await mitre.pick('TA0009.T1005');
            await mitre.input.fill('TA0009.T1005');
            const option = mitre.suggestion('TA0009.T1005');
            await expect(option).toHaveAttribute('aria-disabled', 'true');
            await option.click({ force: true });
            await expect(mitre.chips).toHaveCount(1);
        });

        test('adds nothing for several techniques pasted separated by comma, semicolon and line break', async ({
            page,
            apiAs,
            uniqueName,
        }) => {
            const { editor } = await openFullDefinition(page, apiAs('trainingDesigner'), uniqueName('mitre-paste'), LEVEL_INDEX.firstTraining);
            const mitre = editor.trainingLevel.mitre;
            await mitre.open();
            await mitre.input.evaluate((element, text) => {
                const clipboardData = new DataTransfer();
                clipboardData.setData('text/plain', text);
                const pasteEvent = new Event('paste', { bubbles: true, cancelable: true });
                Object.defineProperty(pasteEvent, 'clipboardData', { value: clipboardData });
                element.dispatchEvent(pasteEvent);
            }, 'TA0009.T1005, TA0007.T1083;TA0043.T1595\nTA0001.T1190');
            await expect(mitre.chips).toHaveCount(0);
        });

        test('removes a technique with its chip button', async ({ page, apiAs, uniqueName }) => {
            const { editor } = await openFullDefinition(page, apiAs('trainingDesigner'), uniqueName('mitre-remove'), LEVEL_INDEX.firstTraining);
            const mitre = editor.trainingLevel.mitre;
            await mitre.open();
            await mitre.pick('TA0009.T1005');
            await mitre.removeButton(mitre.chips.first()).click();
            await expect(mitre.chips).toHaveCount(0);
            await expect(mitre.summary).toContainText('no techniques');
        });

        test('closes the suggestion list after a technique was picked', async ({
            page,
            apiAs,
            uniqueName,
        }) => {
            const { editor } = await openFullDefinition(page, apiAs('trainingDesigner'), uniqueName('mitre-dropdown'), LEVEL_INDEX.firstTraining);
            const mitre = editor.trainingLevel.mitre;
            await mitre.open();
            await mitre.pick('TA0009.T1005');
            await expect(page.getByRole('option')).toHaveCount(0);
        });
    });

    test.describe('expected commands', () => {
        test('reports a level without expected commands', async ({ page, apiAs, uniqueName }) => {
            const { editor } = await openFullDefinition(page, apiAs('trainingDesigner'), uniqueName('commands-empty'), LEVEL_INDEX.firstTraining);
            await expect(editor.trainingLevel.commands.summary).toContainText('no expected commands');
        });

        test('adds commands with Enter and with a comma and saves them', async ({ page, apiAs, uniqueName }) => {
            const { editor, definition, api } = await openFullDefinition(page, apiAs('trainingDesigner'), uniqueName('commands-add'), LEVEL_INDEX.firstTraining);
            const commands = editor.trainingLevel.commands;
            await commands.open();
            await commands.addByTyping('ls -la');
            await commands.input.pressSequentially('cat flag.txt,');
            await expect(commands.chips).toHaveCount(2);
            await expect(commands.summary).toContainText('2 expected command(s)');
            await saveAndWait(editor);
            const level = await levelByTitle(api, definition.id, TITLES.firstTraining);
            expect(level['expected_commands']).toEqual(['ls -la', 'cat flag.txt']);
        });

        test('adds several commands pasted separated by comma, semicolon and line break', async ({
            page,
            apiAs,
            uniqueName,
        }) => {
            const { editor } = await openFullDefinition(page, apiAs('trainingDesigner'), uniqueName('commands-paste'), LEVEL_INDEX.firstTraining);
            const commands = editor.trainingLevel.commands;
            await commands.open();
            await commands.input.evaluate((element, text) => {
                const clipboardData = new DataTransfer();
                clipboardData.setData('text/plain', text);
                const pasteEvent = new Event('paste', { bubbles: true, cancelable: true });
                Object.defineProperty(pasteEvent, 'clipboardData', { value: clipboardData });
                element.dispatchEvent(pasteEvent);
            }, 'ls, pwd;whoami\nid');
            await expect(commands.chips).toHaveCount(4);
        });

        test('removes a command with its chip button', async ({ page, apiAs, uniqueName }) => {
            const { editor } = await openFullDefinition(page, apiAs('trainingDesigner'), uniqueName('commands-remove'), LEVEL_INDEX.firstTraining);
            const commands = editor.trainingLevel.commands;
            await commands.open();
            await commands.addByTyping('ls');
            await commands.addByTyping('pwd');
            await commands.removeButton(commands.chips.first()).click();
            await expect(commands.chips).toHaveCount(1);
            await expect(commands.chips.first()).toContainText('pwd');
        });

        test('keeps special characters of a command as literal text', async ({ page, apiAs, uniqueName }) => {
            const { editor, definition, api } = await openFullDefinition(page, apiAs('trainingDesigner'), uniqueName('commands-special'), LEVEL_INDEX.firstTraining);
            const commands = editor.trainingLevel.commands;
            await commands.open();
            await commands.addByTyping('echo <b>x</b>');
            await expect(commands.chips.first().locator('b')).toHaveCount(0);
            await saveAndWait(editor);
            const level = await levelByTitle(api, definition.id, TITLES.firstTraining);
            expect(level['expected_commands']).toEqual(['echo <b>x</b>']);
        });

        test('refuses the same command twice', async ({ page, apiAs, uniqueName }) => {
            const { editor } = await openFullDefinition(page, apiAs('trainingDesigner'), uniqueName('commands-duplicate'), LEVEL_INDEX.firstTraining);
            const commands = editor.trainingLevel.commands;
            await commands.open();
            await commands.addByTyping('ls');
            await commands.addByTyping('ls');
            await expect(commands.chips).toHaveCount(1);
        });

        test('refuses a command equal to an added one after trimming', async ({ page, apiAs, uniqueName }) => {
            const { editor } = await openFullDefinition(page, apiAs('trainingDesigner'), uniqueName('commands-duplicate-trim'), LEVEL_INDEX.firstTraining);
            const commands = editor.trainingLevel.commands;
            await commands.open();
            await commands.addByTyping('ls');
            await commands.addByTyping('  ls  ');
            await expect(commands.chips).toHaveCount(1);
        });
    });

    test.describe('assessment level', () => {
        test('shows the saved values and the Test mode', async ({ page, apiAs, uniqueName, checkpoint }) => {
            const { editor } = await openFullDefinition(page, apiAs('trainingDesigner'), uniqueName('assessment-loaded'), LEVEL_INDEX.assessment);
            const form = editor.assessmentLevel;
            await expect(form.title).toHaveValue(TITLES.assessment);
            await expect(form.estimatedDuration).toHaveValue('3');
            await expect(form.instructions).toHaveValue('Answer every question.');
            await expect(form.testSwitch).toBeChecked();
            await checkpoint(page, 'assessment level loaded');
        });

        test('saves a new title, durations and instructions', async ({ page, apiAs, uniqueName }) => {
            const { editor, definition, api } = await openFullDefinition(page, apiAs('trainingDesigner'), uniqueName('assessment-edit'), LEVEL_INDEX.assessment);
            const form = editor.assessmentLevel;
            await form.title.fill('Assessment renamed');
            await form.estimatedDuration.fill('9');
            await form.minimalSolveTime.fill('2');
            await form.instructions.fill('New instructions');
            await saveAndWait(editor);
            const level = await levelByTitle(api, definition.id, 'Assessment renamed');
            expect(level['estimated_duration']).toBe(9);
            expect(level['minimal_possible_solve_time']).toBe(2);
            expect(level['instructions']).toBe('New instructions');
        });

        test('disables Save for an empty and a whitespace-only title', async ({ page, apiAs, uniqueName }) => {
            const { editor } = await openFullDefinition(page, apiAs('trainingDesigner'), uniqueName('assessment-title'), LEVEL_INDEX.assessment);
            await editor.assessmentLevel.title.fill('');
            await expect(editor.saveButton).toBeDisabled();
            await editor.assessmentLevel.title.fill('   ');
            await expect(editor.saveButton).toBeDisabled();
        });

        for (const [field, value] of [
            ['estimatedDuration', '0'],
            ['estimatedDuration', '-1'],
            ['minimalSolveTime', '-1'],
        ] as const) {
            test(`disables Save for ${field} set to ${value}`, async ({ page, apiAs, uniqueName }) => {
                const { editor } = await openFullDefinition(page, apiAs('trainingDesigner'), uniqueName(`assessment-invalid-${field}-${value}`), LEVEL_INDEX.assessment);
                await editor.assessmentLevel[field].fill(value);
                await expect(editor.saveButton).toBeDisabled();
            });
        }

        test('keeps special characters of title and instructions as literal text', async ({
            page,
            apiAs,
            uniqueName,
        }) => {
            const { editor, definition, api } = await openFullDefinition(page, apiAs('trainingDesigner'), uniqueName('assessment-special'), LEVEL_INDEX.assessment);
            await editor.assessmentLevel.title.fill(SPECIAL_TEXT);
            await editor.assessmentLevel.instructions.fill(SPECIAL_TEXT);
            await saveAndWait(editor);
            expect((await levelByTitle(api, definition.id, SPECIAL_TEXT))['instructions']).toBe(SPECIAL_TEXT);
        });
    });

    test.describe('questions', () => {
        async function openQuestions(page: Page, api: Api, title: string): Promise<Prepared> {
            const prepared = await openFullDefinition(page, api, title, LEVEL_INDEX.assessment);
            await prepared.editor.assessmentLevel.questions.open();
            return prepared;
        }

        test('lists the three questions of the level', async ({ page, apiAs, uniqueName, checkpoint }) => {
            const { editor } = await openQuestions(page, apiAs('trainingDesigner'), uniqueName('questions-list'));
            const questions = editor.assessmentLevel.questions;
            await expect(questions.steps).toHaveCount(3);
            await expect(questions.summary).toContainText('3 question(s)');
            await checkpoint(page, 'questions listed');
        });

        test('offers the three question kinds in the Add menu', async ({ page, apiAs, uniqueName }) => {
            const { editor } = await openQuestions(page, apiAs('trainingDesigner'), uniqueName('questions-menu'));
            await editor.assessmentLevel.questions.addButton.click();
            await expect(page.getByRole('menuitem')).toHaveText([
                /Free Form Question$/,
                /Multiple Choice Question$/,
                /Extended Matching Items Questions$/,
            ]);
        });

        for (const kind of [
            'Free Form Question',
            'Multiple Choice Question',
            'Extended Matching Items Questions',
        ] as const) {
            test(`adds a ${kind}`, async ({ page, apiAs, uniqueName }) => {
                const { editor } = await openQuestions(page, apiAs('trainingDesigner'), uniqueName(`questions-add-${kind.toLowerCase().replace(/\s+/g, '-')}`));
                const questions = editor.assessmentLevel.questions;
                await questions.add(kind);
                await expect(questions.steps).toHaveCount(4);
                await expect(questions.summary).toContainText('4 question(s)');
            });
        }

        test('keeps the question when deleting is cancelled', async ({ page, apiAs, uniqueName }) => {
            const { editor } = await openQuestions(page, apiAs('trainingDesigner'), uniqueName('questions-delete-cancel'));
            const questions = editor.assessmentLevel.questions;
            await questions.deleteButton.click();
            await new ConfirmationDialog(page, 'Delete question').cancel();
            await expect(questions.steps).toHaveCount(3);
        });

        test('deletes the open question after confirmation and saves the remaining two', async ({
            page,
            apiAs,
            uniqueName,
        }) => {
            const { editor, definition, api } = await openQuestions(page, apiAs('trainingDesigner'), uniqueName('questions-delete'));
            const questions = editor.assessmentLevel.questions;
            await questions.deleteButton.click();
            await new ConfirmationDialog(page, 'Delete question').confirm();
            await expect(questions.steps).toHaveCount(2);
            await saveAndWait(editor);
            const level = await levelByTitle(api, definition.id, TITLES.assessment);
            expect(level['questions']).toHaveLength(2);
        });

        test('keeps the identifiers of the remaining questions when a question was added, deleted and saved', async ({
            page,
            apiAs,
            uniqueName,
        }) => {
            const { editor, definition, api } = await openQuestions(page, apiAs('trainingDesigner'), uniqueName('questions-ids'));
            const before = (await levelByTitle(api, definition.id, TITLES.assessment))['questions'] as { id: number }[];
            const questions = editor.assessmentLevel.questions;
            await questions.add('Free Form Question');
            await questions.deleteButton.click();
            await new ConfirmationDialog(page, 'Delete question').confirm();
            await saveAndWait(editor);
            const after = (await levelByTitle(api, definition.id, TITLES.assessment))['questions'] as { id: number }[];
            expect(after.map((question) => question.id)).toEqual(before.map((question) => question.id));
        });

        test('reorders questions by dragging a step', async ({ page, apiAs, uniqueName }) => {
            const { editor, definition, api } = await openQuestions(page, apiAs('trainingDesigner'), uniqueName('questions-reorder'));
            const questions = editor.assessmentLevel.questions;
            await dragWithMouse(questions.steps.first(), questions.steps.last());
            await expect
                .poll(() => questions.stepIcons())
                .toEqual([QUESTION_STEP_ICON.MCQ, QUESTION_STEP_ICON.EMI, QUESTION_STEP_ICON.FFQ]);
            await saveAndWait(editor);
            const level = await levelByTitle(api, definition.id, TITLES.assessment);
            const types = (level['questions'] as { question_type: string; order: number }[])
                .slice()
                .sort((left, right) => left.order - right.order)
                .map((question) => question.question_type);
            expect(types).toEqual(['MCQ', 'EMI', 'FFQ']);
        });

        test('saves a changed question title, points and penalty', async ({ page, apiAs, uniqueName }) => {
            const { editor, definition, api } = await openQuestions(page, apiAs('trainingDesigner'), uniqueName('questions-edit'));
            const questions = editor.assessmentLevel.questions;
            await questions.title.fill('Which transport protocol is reliable, really?');
            await questions.points.fill('8');
            await questions.penalty.fill('2');
            await saveAndWait(editor);
            const level = await levelByTitle(api, definition.id, TITLES.assessment);
            expect((level['questions'] as { text: string; points: number; penalty: number }[])[0]).toMatchObject({
                text: 'Which transport protocol is reliable, really?',
                points: 8,
                penalty: 2,
            });
        });

        for (const [field, value] of [
            ['points', '101'],
            ['points', '-1'],
            ['penalty', '101'],
            ['penalty', '-1'],
        ] as const) {
            test(`disables Save for question ${field} set to ${value}`, async ({ page, apiAs, uniqueName }) => {
                const { editor } = await openQuestions(page, apiAs('trainingDesigner'), uniqueName(`questions-invalid-${field}-${value}`));
                await editor.assessmentLevel.questions[field].fill(value);
                await expect(editor.saveButton).toBeDisabled();
            });
        }

        test('disables the Required checkbox of a question in Test mode', async ({ page, apiAs, uniqueName }) => {
            const { editor } = await openQuestions(page, apiAs('trainingDesigner'), uniqueName('questions-required-test'));
            await expect(editor.assessmentLevel.questions.requiredCheckbox).toBeDisabled();
        });

        test('keeps special characters of a question title as literal text', async ({ page, apiAs, uniqueName }) => {
            const { editor, definition, api } = await openQuestions(page, apiAs('trainingDesigner'), uniqueName('questions-special'));
            await editor.assessmentLevel.questions.title.fill(SPECIAL_TEXT);
            await saveAndWait(editor);
            const level = await levelByTitle(api, definition.id, TITLES.assessment);
            expect((level['questions'] as { text: string }[])[0]?.text).toBe(SPECIAL_TEXT);
        });
    });

    test.describe('free form question', () => {
        async function openFreeForm(page: Page, api: Api, title: string): Promise<DefinitionEditorPage> {
            const { editor } = await openFullDefinition(page, api, title, LEVEL_INDEX.assessment);
            await editor.assessmentLevel.questions.open();
            await editor.assessmentLevel.questions.steps.nth(0).click();
            return editor;
        }

        test('lists the accepted answers of the question', async ({ page, apiAs, uniqueName }) => {
            const editor = await openFreeForm(page, apiAs('trainingDesigner'), uniqueName('ffq-list'));
            await expectInputValues(editor.assessmentLevel.questions.acceptedAnswers, ['tcp']);
        });

        test('adds and saves an accepted answer', async ({ page, apiAs, uniqueName }) => {
            const api = apiAs('trainingDesigner');
            const editor = await openFreeForm(page, api, uniqueName('ffq-add'));
            const questions = editor.assessmentLevel.questions;
            await questions.addAnswerButton.click();
            await questions.acceptedAnswers.last().fill('TCP');
            await expect(questions.acceptedAnswers).toHaveCount(2);
            await expect(editor.saveButton).toBeEnabled();
        });

        test('shows an error and disables Save when a Test question has no answer', async ({
            page,
            apiAs,
            uniqueName,
        }) => {
            const editor = await openFreeForm(page, apiAs('trainingDesigner'), uniqueName('ffq-none'));
            const questions = editor.assessmentLevel.questions;
            await questions.removeAnswerButtons.first().click();
            await expect(questions.acceptedAnswers).toHaveCount(0);
            await expect(questions.errors).toContainText('Test question must have correct answers.');
            await expect(editor.saveButton).toBeDisabled();
        });
    });

    test.describe('multiple choice question', () => {
        async function openMultipleChoice(page: Page, api: Api, title: string): Promise<DefinitionEditorPage> {
            const { editor } = await openFullDefinition(page, api, title, LEVEL_INDEX.assessment);
            await editor.assessmentLevel.questions.open();
            await editor.assessmentLevel.questions.steps.nth(1).click();
            return editor;
        }

        test('lists the choices with the correct one ticked', async ({ page, apiAs, uniqueName }) => {
            const editor = await openMultipleChoice(page, apiAs('trainingDesigner'), uniqueName('mcq-list'));
            const questions = editor.assessmentLevel.questions;
            await expectInputValues(questions.choiceTexts, ['SSH', 'DNS', 'NTP']);
            await expect(questions.choiceCorrectCheckboxes.nth(0)).toBeChecked();
            await expect(questions.choiceCorrectCheckboxes.nth(1)).not.toBeChecked();
        });

        test('adds a choice and saves it', async ({ page, apiAs, uniqueName }) => {
            const { editor, definition, api } = await openFullDefinition(page, apiAs('trainingDesigner'), uniqueName('mcq-add'), LEVEL_INDEX.assessment);
            const questions = editor.assessmentLevel.questions;
            await questions.open();
            await questions.steps.nth(1).click();
            await questions.addChoiceButton.click();
            await questions.choiceTexts.last().fill('FTP');
            await saveAndWait(editor);
            const level = await levelByTitle(api, definition.id, TITLES.assessment);
            const mcq = (level['questions'] as { question_type: string; choices: { text: string }[] }[]).find(
                (question) => question.question_type === 'MCQ',
            );
            expect(mcq?.choices.map((choice) => choice.text)).toEqual(['SSH', 'DNS', 'NTP', 'FTP']);
        });

        test('deletes a choice with its delete button', async ({ page, apiAs, uniqueName }) => {
            const editor = await openMultipleChoice(page, apiAs('trainingDesigner'), uniqueName('mcq-delete-choice'));
            const questions = editor.assessmentLevel.questions;
            await questions.deleteChoiceButtons.last().click();
            await expectInputValues(questions.choiceTexts, ['SSH', 'DNS']);
        });

        test('shows an error and disables Save when no choice is correct', async ({ page, apiAs, uniqueName }) => {
            const editor = await openMultipleChoice(page, apiAs('trainingDesigner'), uniqueName('mcq-no-correct'));
            const questions = editor.assessmentLevel.questions;
            await questions.choiceCorrectCheckboxes.nth(0).uncheck();
            await expect(questions.errors).toContainText('Test question must have selected correct answers');
            await expect(editor.saveButton).toBeDisabled();
        });

        test('clears every correct mark with Clear answers', async ({ page, apiAs, uniqueName }) => {
            const editor = await openMultipleChoice(page, apiAs('trainingDesigner'), uniqueName('mcq-clear'));
            const questions = editor.assessmentLevel.questions;
            await questions.clearChoiceAnswersButton.click();
            await expect(questions.choiceCorrectCheckboxes.nth(0)).not.toBeChecked();
            await expect(editor.saveButton).toBeDisabled();
        });

        test('shows an error and disables Save for an empty choice text', async ({ page, apiAs, uniqueName }) => {
            const editor = await openMultipleChoice(page, apiAs('trainingDesigner'), uniqueName('mcq-empty-choice'));
            const questions = editor.assessmentLevel.questions;
            await questions.choiceTexts.nth(1).fill('');
            await questions.choiceTexts.nth(1).blur();
            await expect(questions.errors).toContainText('Option text cannot be empty');
            await expect(editor.saveButton).toBeDisabled();
        });

        test('keeps special characters of a choice as literal text', async ({ page, apiAs, uniqueName }) => {
            const editor = await openMultipleChoice(page, apiAs('trainingDesigner'), uniqueName('mcq-special'));
            const questions = editor.assessmentLevel.questions;
            await questions.choiceTexts.nth(1).fill(SPECIAL_TEXT);
            await expect(questions.questionCard.locator('b')).toHaveCount(0);
            await expect(editor.saveButton).toBeEnabled();
        });
    });

    test.describe('extended matching items question', () => {
        async function openMatching(page: Page, api: Api, title: string): Promise<DefinitionEditorPage> {
            const { editor } = await openFullDefinition(page, api, title, LEVEL_INDEX.assessment);
            await editor.assessmentLevel.questions.open();
            await editor.assessmentLevel.questions.steps.nth(2).click();
            return editor;
        }

        test('lists the options, the statements and the correct matches', async ({ page, apiAs, uniqueName }) => {
            const editor = await openMatching(page, apiAs('trainingDesigner'), uniqueName('emi-list'));
            const questions = editor.assessmentLevel.questions;
            await expectInputValues(questions.matchingOptions, ['SSH', 'HTTP']);
            await expectInputValues(questions.matchingStatements, ['Port 22', 'Port 80']);
            await expect(questions.questionCard.locator('input[type="radio"]:checked')).toHaveCount(2);
        });

        test('adds and deletes an option', async ({ page, apiAs, uniqueName }) => {
            const editor = await openMatching(page, apiAs('trainingDesigner'), uniqueName('emi-option'));
            const questions = editor.assessmentLevel.questions;
            await questions.addOptionButton.click();
            await expect(questions.matchingOptions).toHaveCount(3);
            await questions.deleteOptionButtons.last().click();
            await expect(questions.matchingOptions).toHaveCount(2);
        });

        test('adds and deletes a statement', async ({ page, apiAs, uniqueName }) => {
            const editor = await openMatching(page, apiAs('trainingDesigner'), uniqueName('emi-statement'));
            const questions = editor.assessmentLevel.questions;
            await questions.addStatementButton.click();
            await expect(questions.matchingStatements).toHaveCount(3);
            await questions.deleteStatementButtons.last().click();
            await expect(questions.matchingStatements).toHaveCount(2);
        });

        test('offers the Add option button again after an option is deleted at the option limit', async ({
            page,
            apiAs,
            uniqueName,
        }) => {
            const editor = await openMatching(page, apiAs('trainingDesigner'), uniqueName('emi-limit'));
            const questions = editor.assessmentLevel.questions;
            for (let added = 0; added < 20 && (await questions.addOptionButton.isVisible()); added++) {
                await questions.addOptionButton.click();
            }
            await expect(questions.addOptionButton).toBeHidden();
            await questions.deleteOptionButtons.last().click();
            await expect(questions.addOptionButton).toBeVisible();
        });

        test('marks a statement with its correct option and clears the marks with Clear Answers', async ({
            page,
            apiAs,
            uniqueName,
        }) => {
            const editor = await openMatching(page, apiAs('trainingDesigner'), uniqueName('emi-answers'));
            const questions = editor.assessmentLevel.questions;
            await questions.clearMatchingAnswersButton.click();
            await expect(editor.saveButton).toBeDisabled();
            await questions.matchingRadios.nth(0).check();
            await questions.matchingRadios.nth(3).check();
            await expect(editor.saveButton).toBeEnabled();
        });

        test('explains a blank option or statement', async ({ page, apiAs, uniqueName }) => {
            const editor = await openMatching(page, apiAs('trainingDesigner'), uniqueName('emi-blank'));
            const questions = editor.assessmentLevel.questions;
            await questions.matchingOptions.first().fill('');
            await questions.matchingOptions.first().blur();
            await expect(questions.errors.first()).toBeVisible();
            await questions.matchingOptions.first().fill('SSH');
            await questions.matchingStatements.first().fill('');
            await questions.matchingStatements.first().blur();
            await expect(questions.errors.first()).toBeVisible();
        });

        test('refuses an option longer than 255 characters with a message', async ({ page, apiAs, uniqueName }) => {
            const editor = await openMatching(page, apiAs('trainingDesigner'), uniqueName('emi-too-long'));
            const questions = editor.assessmentLevel.questions;
            await questions.matchingOptions.first().fill('o'.repeat(256));
            await questions.matchingOptions.first().blur();
            await expect(editor.saveButton).toBeDisabled();
            await expect(questions.errors.first()).toBeVisible();
        });
    });

    test.describe('test mode saving', () => {
        test('names the problem in the interface instead of failing on save when a new Test question has no answer', async ({
            page,
            apiAs,
            uniqueName,
        }) => {
            const { editor } = await openFullDefinition(page, apiAs('trainingDesigner'), uniqueName('testmode-save'), LEVEL_INDEX.assessment);
            await editor.assessmentLevel.testSwitch.setChecked(true);
            const questions = editor.assessmentLevel.questions;
            await questions.open();
            await questions.add('Multiple Choice Question');
            await expect(editor.saveButton).toBeDisabled();
            await expect(errorDialog(page)).toHaveCount(0);
        });
    });

    test.describe('designers', () => {
        test('lists the current designer and starts with Add and Delete disabled', async ({
            page,
            apiAs,
            uniqueName,
            checkpoint,
        }) => {
            const definition = await createEmptyDefinition(apiAs('trainingDesigner'), uniqueName('designers-initial'));
            const editor = new DefinitionEditorPage(page);
            await editor.gotoEdit(definition.id);
            await expect(editor.designers.assignedTable.rows).toHaveCount(1);
            await expect(editor.designers.addButton).toBeDisabled();
            await expect(editor.designers.deleteButton).toBeDisabled();
            await checkpoint(page, 'designers panel');
        });

        test('collapses and expands the Designers panel', async ({ page, apiAs, uniqueName }) => {
            const definition = await createEmptyDefinition(apiAs('trainingDesigner'), uniqueName('designers-panel'));
            const editor = new DefinitionEditorPage(page);
            await editor.gotoEdit(definition.id);
            const header = page.locator('mat-expansion-panel-header', { hasText: 'Designers' });
            await header.click();
            await expect(editor.designers.root).toBeHidden();
            await header.click();
            await expect(editor.designers.root).toBeVisible();
        });

        test('warns about unsaved designers once a candidate is chosen', async ({ page, apiAs, uniqueName }) => {
            const definition = await createEmptyDefinition(apiAs('trainingDesigner'), uniqueName('designers-warning'));
            const editor = new DefinitionEditorPage(page);
            await editor.gotoEdit(definition.id);
            await editor.designers.chooseCandidate(page, SECOND_DESIGNER.search, new RegExp(SECOND_DESIGNER.login));
            await expect(editor.designersWarning).toBeVisible();
            await expect(editor.designers.addButton).toBeEnabled();
        });

        test('assigns a second designer', async ({ page, apiAs, uniqueName, checkpoint }) => {
            const api = apiAs('trainingDesigner');
            const definition = await createEmptyDefinition(api, uniqueName('designers-add'));
            const editor = new DefinitionEditorPage(page);
            await editor.gotoEdit(definition.id);
            await editor.designers.chooseCandidate(page, SECOND_DESIGNER.search, new RegExp(SECOND_DESIGNER.login));
            await editor.designers.addChosen();
            await expect(editor.designers.assignedTable.rowByText(SECOND_DESIGNER.login)).toBeVisible();
            await expect(editor.designersWarning).toBeHidden();
            await checkpoint(page, 'designer assigned');
            await expect.poll(() => fetchAuthorLogins(api, definition.id)).toContain(SECOND_DESIGNER.login);
        });

        test('unassigns a designer', async ({ page, apiAs, uniqueName }) => {
            const api = apiAs('trainingDesigner');
            const definition = await createEmptyDefinition(api, uniqueName('designers-remove'));
            const editor = new DefinitionEditorPage(page);
            await editor.gotoEdit(definition.id);
            await editor.designers.chooseCandidate(page, SECOND_DESIGNER.search, new RegExp(SECOND_DESIGNER.login));
            await editor.designers.addChosen();
            await expect(editor.designers.assignedTable.rowByText(SECOND_DESIGNER.login)).toBeVisible();
            await editor.designers.removeAssigned(SECOND_DESIGNER.login);
            await expect(editor.designers.assignedTable.rowByText(SECOND_DESIGNER.login)).toHaveCount(0);
            await expect.poll(() => fetchAuthorLogins(api, definition.id)).not.toContain(SECOND_DESIGNER.login);
        });

        test('finds a designer by first name alone', async ({ page, apiAs, uniqueName }) => {
            const definition = await createEmptyDefinition(apiAs('trainingDesigner'), uniqueName('designers-first-name'));
            const editor = new DefinitionEditorPage(page);
            await editor.gotoEdit(definition.id);
            await editor.designers.searchInput.fill(SECOND_DESIGNER.search.split(' ')[0]);
            await expect(page.getByRole('option', { name: SECOND_DESIGNER.search })).toBeVisible();
        });

        test('finds the platform own user accounts by name', async ({ page, apiAs, uniqueName }) => {
            const definition = await createEmptyDefinition(apiAs('trainingDesigner'), uniqueName('designers-platform'));
            const editor = new DefinitionEditorPage(page);
            await editor.gotoEdit(definition.id);
            await editor.designers.searchInput.fill('User2');
            await expect(page.getByRole('option').filter({ hasNotText: 'No results found' }).first()).toBeVisible();
        });

        test('keeps the last designer and tells the user why', async ({ page, apiAs, uniqueName }) => {
            const api = apiAs('trainingDesigner');
            const definition = await createEmptyDefinition(api, uniqueName('designers-last'));
            const editor = new DefinitionEditorPage(page);
            await editor.gotoEdit(definition.id);
            await editor.designers.assignedTable.selectAllCheckbox.check();
            await editor.designers.deleteButton.click();
            await expect(notificationPopups(page).filter({ hasText: 'cannot remove yourself' })).toBeVisible();
            expect((await fetchAuthorLogins(api, definition.id)).length).toBeGreaterThan(0);
        });
    });

    test.describe('access by role', () => {
        for (const role of ['trainingOrganizer', 'trainee'] as const) {
            test(`sends the ${role} account away from /linear-definition/:id/edit`, async ({ openAs, shared }) => {
                await expectRedirectedAway(openAs, role, `/linear-definition/${shared.trainingDefinition.id}/edit`);
            });
        }
    });
});
