import type { Locator, Page } from '@playwright/test';
import { control, expandPanel, menuControl } from '../../ui';

/** Matches a form-field label whole, tolerating the trailing required marker. */
export function labelPattern(label: string): RegExp {
    return new RegExp(`^\\s*${label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*\\*?\\s*$`);
}

/** The text area of the nth markdown editor inside a scope. */
function markdownTextarea(scope: Locator, index: number): Locator {
    return scope.locator('sentinel-markdown-editor').nth(index).locator('textarea');
}

/** Level types the level overview can add. */
export type LevelKind = 'Training Level' | 'Access Level' | 'Assessment Level' | 'Info Level';

const LEVEL_KIND_ICON: Record<LevelKind, string> = {
    'Training Level': 'videogame_asset',
    'Access Level': 'settings',
    'Assessment Level': 'assignment',
    'Info Level': 'info',
};

/** The levels block of the editor: the Add and Delete controls, the stepper and the open level. */
export class LevelsSection {
    readonly root: Locator;

    constructor(readonly page: Page) {
        this.root = page.locator('crczp-level-overview');
    }

    get addButton(): Locator {
        return control(this.root, 'Add');
    }

    get deleteButton(): Locator {
        return control(this.root, 'Delete');
    }

    /** The steps of the level stepper, one per level. */
    get steps(): Locator {
        return this.root.locator('crczp-levels-stepper sentinel-stepper button');
    }

    step(index: number): Locator {
        return this.steps.nth(index);
    }

    /** The step carrying the icon of a level kind. */
    stepsOfKind(kind: LevelKind): Locator {
        return this.steps.filter({
            has: this.page.locator('mat-icon', { hasText: LEVEL_KIND_ICON[kind] }),
        });
    }

    get emptyHint(): Locator {
        return this.root.getByRole('heading', { name: 'Start by clicking on Add button' });
    }

    /** Opens the Add menu and picks a level kind. */
    async add(kind: LevelKind): Promise<void> {
        await this.addButton.click();
        await menuControl(this.page, kind).click();
    }

    get addMenuEntries(): Locator {
        return this.page.getByRole('menuitem');
    }
}

export class InfoLevelForm {
    readonly root: Locator;

    constructor(page: Page) {
        this.root = page.locator('crczp-info-level-configuration');
    }

    get title(): Locator {
        return this.root.getByRole('textbox', { name: 'Title' });
    }

    get content(): Locator {
        return markdownTextarea(this.root, 0);
    }

    get errors(): Locator {
        return this.root.locator('mat-error');
    }
}

export class AccessLevelForm {
    readonly root: Locator;

    constructor(page: Page) {
        this.root = page.locator('crczp-access-level-configuration');
    }

    get title(): Locator {
        return this.root.getByRole('textbox', { name: 'Title' });
    }

    get passkey(): Locator {
        return this.root.getByRole('textbox', { name: 'Passkey' });
    }

    get passkeyCounter(): Locator {
        return this.root.locator('.mat-mdc-form-field-hint-end');
    }

    get cloudContent(): Locator {
        return markdownTextarea(this.root, 0);
    }

    get localContent(): Locator {
        return markdownTextarea(this.root, 1);
    }

    get errors(): Locator {
        return this.root.locator('mat-error');
    }
}

/** Hints panel of a training level. */
export class HintsSection {
    readonly root: Locator;

    constructor(readonly page: Page) {
        this.root = page.locator('crczp-hints-overview');
    }

    async open(): Promise<void> {
        await expandPanel(this.root, 'Hints');
    }

    get summary(): Locator {
        return this.root.locator('mat-panel-description');
    }

    get addButton(): Locator {
        return control(this.root, 'Add');
    }

    get deleteButton(): Locator {
        return control(this.root, 'Delete');
    }

    get steps(): Locator {
        return this.root.locator('sentinel-stepper button');
    }

    get form(): Locator {
        return this.root.locator('crczp-hint-edit');
    }

    get title(): Locator {
        return this.form.getByRole('textbox', { name: 'Title' });
    }

    get penalty(): Locator {
        return this.form.getByRole('spinbutton', { name: 'Hint Penalty' });
    }

    get content(): Locator {
        return markdownTextarea(this.form, 0);
    }

    get errors(): Locator {
        return this.form.locator('mat-error');
    }
}

/** MITRE techniques panel of a training level. */
export class MitreSelect {
    readonly root: Locator;

    constructor(readonly page: Page) {
        this.root = page.locator('crczp-mitre-technique-select');
    }

    async open(): Promise<void> {
        await expandPanel(this.root, 'MITRE ATT&CK Techniques');
    }

    get summary(): Locator {
        return this.root.locator('mat-panel-description');
    }

    get input(): Locator {
        return this.root.getByPlaceholder('New technique...');
    }

    get chips(): Locator {
        return this.root.locator('mat-chip-row');
    }

    removeButton(chip: Locator): Locator {
        return chip.locator('button');
    }

    /** The suggestion of a technique key in the open autocomplete list. */
    suggestion(technique: string): Locator {
        return this.page.getByRole('option', { name: new RegExp(`^${technique.replace(/\./g, '\\.')} - `) });
    }

    /** Types a technique key and presses Enter; the picker adds nothing for typed text. */
    async typeAndConfirm(technique: string): Promise<void> {
        await this.input.fill(technique);
        await this.input.press('Enter');
    }

    /** Filters the suggestions by the key and picks the matching one, the only way to add a technique. */
    async pick(technique: string): Promise<void> {
        await this.input.fill(technique);
        await this.suggestion(technique).click();
    }
}

/** Expected commands panel of a training level. */
export class ExpectedCommandsSelect {
    readonly root: Locator;

    constructor(readonly page: Page) {
        this.root = page.locator('crczp-expected-commands-select');
    }

    async open(): Promise<void> {
        await expandPanel(this.root, 'Expected Commands');
    }

    get summary(): Locator {
        return this.root.locator('mat-panel-description');
    }

    get input(): Locator {
        return this.root.getByPlaceholder('New Expected Command...');
    }

    get chips(): Locator {
        return this.root.locator('mat-chip-row');
    }

    removeButton(chip: Locator): Locator {
        return chip.locator('button');
    }

    async addByTyping(command: string): Promise<void> {
        await this.input.fill(command);
        await this.input.press('Enter');
    }
}

export class TrainingLevelForm {
    readonly root: Locator;
    readonly hints: HintsSection;
    readonly mitre: MitreSelect;
    readonly commands: ExpectedCommandsSelect;

    constructor(page: Page) {
        this.root = page.locator('crczp-training-level-edit');
        this.hints = new HintsSection(page);
        this.mitre = new MitreSelect(page);
        this.commands = new ExpectedCommandsSelect(page);
    }

    /** The level's own title; the hint form below carries a second Title field. */
    get title(): Locator {
        return this.root.getByRole('textbox', { name: 'Title' }).first();
    }

    get estimatedDuration(): Locator {
        return this.root.getByRole('textbox', { name: 'Estimated Duration in Minutes' });
    }

    get minimalSolveTime(): Locator {
        return this.root.getByRole('textbox', { name: 'Minimal Possible Solve Time in Minutes' });
    }

    get content(): Locator {
        return markdownTextarea(this.root, 0);
    }

    get solution(): Locator {
        return markdownTextarea(this.root, 1);
    }

    get points(): Locator {
        return this.root.getByRole('spinbutton', { name: /Points for the Level/i });
    }

    get incorrectAnswerLimit(): Locator {
        return this.root.getByRole('spinbutton', { name: /Incorrect Answer Limit/i });
    }

    get variantAnswers(): Locator {
        return this.root.getByRole('checkbox', { name: /Variant Answers/ });
    }

    get staticAnswer(): Locator {
        return this.root.getByRole('textbox', { name: /Correct Answer - Static/ });
    }

    get answerVariableName(): Locator {
        return this.root.getByRole('textbox', { name: /Correct Answer - Variable Name/ });
    }

    get solutionPenalized(): Locator {
        return this.root.getByRole('checkbox', { name: /Solution Penalized/ });
    }

    get commandsRequired(): Locator {
        return this.root.getByRole('checkbox', { name: /Is any command required/ });
    }

    /** Validation messages of the level's own fields. */
    get errors(): Locator {
        return this.root.locator('.left-panel mat-error, .right-panel mat-error');
    }
}

export type QuestionKind = 'Free Form Question' | 'Multiple Choice Question' | 'Extended Matching Items Questions';

/** Stepper icon of each question type, as the API names the type. */
export const QUESTION_STEP_ICON = {
    FFQ: 'help_outline',
    MCQ: 'check_circle',
    EMI: 'list_alt',
} as const;

/** Questions panel of an assessment level together with the question open in it. */
export class QuestionsSection {
    readonly root: Locator;

    constructor(readonly page: Page) {
        this.root = page.locator('crczp-question-overview');
    }

    async open(): Promise<void> {
        await expandPanel(this.root, 'Questions');
    }

    get summary(): Locator {
        return this.root.locator('mat-panel-description');
    }

    get addButton(): Locator {
        return control(this.root, 'Add');
    }

    get steps(): Locator {
        return this.root.locator('sentinel-stepper button');
    }

    /** The icon of each step in display order; the icon names the question kind. */
    async stepIcons(): Promise<string[]> {
        const icons = await this.steps.locator('mat-icon').allInnerTexts();
        return icons.map((icon) => icon.trim());
    }

    async add(kind: QuestionKind): Promise<void> {
        await this.addButton.click();
        await menuControl(this.page, kind).click();
    }

    get questionCard(): Locator {
        return this.root.locator('crczp-question-edit');
    }

    get questionHeading(): Locator {
        return this.questionCard.getByRole('heading', { name: /^Question \d+:/ });
    }

    get requiredCheckbox(): Locator {
        return this.questionCard.getByRole('checkbox', { name: 'Required' });
    }

    get deleteButton(): Locator {
        return this.questionCard.getByRole('button', { name: 'Delete', exact: true });
    }

    get title(): Locator {
        return markdownTextarea(this.questionCard, 0);
    }

    get points(): Locator {
        return this.questionCard.getByRole('spinbutton', { name: labelPattern('Points') });
    }

    get penalty(): Locator {
        return this.questionCard.getByRole('spinbutton', { name: /Penalty points/i });
    }

    get errors(): Locator {
        return this.questionCard.locator('mat-error');
    }

    /** Multiple choice question parts. */
    get choiceTexts(): Locator {
        return this.questionCard.getByRole('textbox', { name: /^Option \d+/ });
    }

    get choiceCorrectCheckboxes(): Locator {
        return this.questionCard.locator('crczp-multiple-choice-question-edit mat-checkbox input');
    }

    get addChoiceButton(): Locator {
        return this.questionCard.getByRole('button', { name: 'Add choice' });
    }

    get clearChoiceAnswersButton(): Locator {
        return this.questionCard.getByRole('button', { name: 'Clear answers' });
    }

    get deleteChoiceButtons(): Locator {
        return this.questionCard.getByRole('button', { name: 'Delete option' });
    }

    /** Free form question parts. */
    get acceptedAnswers(): Locator {
        return this.questionCard.getByRole('textbox', { name: 'Answer' });
    }

    get addAnswerButton(): Locator {
        return this.questionCard.getByRole('button', { name: 'Add answer' });
    }

    /** The per-answer remove buttons, which carry an icon and no accessible name. */
    get removeAnswerButtons(): Locator {
        return this.questionCard
            .locator('crczp-free-form-question-edit button')
            .filter({ has: this.page.locator('mat-icon', { hasText: 'remove_circle' }) });
    }

    /** Extended matching items parts. */
    get matchingOptions(): Locator {
        return this.questionCard.getByRole('textbox', { name: /^Option \d+/ });
    }

    get matchingStatements(): Locator {
        return this.questionCard.getByRole('textbox', { name: /^Statement \d+/ });
    }

    get addOptionButton(): Locator {
        return this.questionCard.getByRole('button', { name: 'Add option' });
    }

    get deleteOptionButtons(): Locator {
        return this.questionCard.getByRole('button', { name: 'Delete option' });
    }

    get addStatementButton(): Locator {
        return this.questionCard.getByRole('button', { name: 'Add new statement' });
    }

    get deleteStatementButtons(): Locator {
        return this.questionCard.getByRole('button', { name: 'Delete statement' });
    }

    get clearMatchingAnswersButton(): Locator {
        return this.questionCard.getByRole('button', { name: 'Clear Answers' });
    }

    get matchingRadios(): Locator {
        return this.questionCard.locator('input[type="radio"]');
    }
}

export class AssessmentLevelForm {
    readonly root: Locator;
    readonly questions: QuestionsSection;

    constructor(page: Page) {
        this.root = page.locator('crczp-assessment-level-configuration');
        this.questions = new QuestionsSection(page);
    }

    get title(): Locator {
        return this.root.getByRole('textbox', { name: 'Title' });
    }

    get estimatedDuration(): Locator {
        return this.root.getByRole('textbox', { name: 'Estimated Duration in Minutes' });
    }

    get minimalSolveTime(): Locator {
        return this.root.getByRole('textbox', { name: 'Minimal Possible Solve Time in Minutes' });
    }

    get instructions(): Locator {
        return markdownTextarea(this.root, 0);
    }

    /** The Questionnaire / Test switch. */
    get testSwitch(): Locator {
        return this.root.getByRole('switch');
    }

    get errors(): Locator {
        return this.root.locator('.left-panel mat-error');
    }
}
