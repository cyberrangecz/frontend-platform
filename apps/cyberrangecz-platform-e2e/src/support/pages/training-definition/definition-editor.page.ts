import type { Locator, Page } from '@playwright/test';
import { control, expansionPanel, fieldErrors, UserAssign, waitForPageReady, waitWhileLoading } from '../../ui';
import {
    AccessLevelForm,
    AssessmentLevelForm,
    InfoLevelForm,
    LevelsSection,
    TrainingLevelForm,
} from './level-forms';

/** A `sentinel-free-form` list of the definition form, such as the instructor notes. */
export class FreeFormList {
    readonly root: Locator;

    constructor(
        page: Page,
        listName: string,
        private readonly itemName: string,
        private readonly addLabel: string,
    ) {
        this.root = page.locator('sentinel-free-form').filter({ hasText: listName });
    }

    get addButton(): Locator {
        return this.root.getByRole('button', { name: this.addLabel });
    }

    get deleteAllButton(): Locator {
        return this.root.getByRole('button', { name: 'Delete all' });
    }

    get items(): Locator {
        return this.root.getByRole('textbox', { name: this.itemName, exact: true });
    }

    /** The list's own validation message, rendered right after the list element. */
    get errors(): Locator {
        return this.root.locator('xpath=following-sibling::mat-error[1]');
    }

    /** The remove button of the item at a position. */
    removeButton(index: number): Locator {
        return this.root.locator('mat-form-field').nth(index).getByRole('button');
    }

    /** Adds an item and fills it with the text. */
    async addItem(text: string): Promise<void> {
        const position = await this.items.count();
        await this.addButton.click();
        await this.items.nth(position).fill(text);
    }
}

/** The create and edit pages of a training definition. */
export class DefinitionEditorPage {
    readonly levels: LevelsSection;
    readonly infoLevel: InfoLevelForm;
    readonly accessLevel: AccessLevelForm;
    readonly trainingLevel: TrainingLevelForm;
    readonly assessmentLevel: AssessmentLevelForm;
    readonly notes: FreeFormList;
    readonly outcomes: FreeFormList;

    constructor(readonly page: Page) {
        this.levels = new LevelsSection(page);
        this.infoLevel = new InfoLevelForm(page);
        this.accessLevel = new AccessLevelForm(page);
        this.trainingLevel = new TrainingLevelForm(page);
        this.assessmentLevel = new AssessmentLevelForm(page);
        this.notes = new FreeFormList(page, 'Notes for instructors', 'Note', 'Add Note');
        this.outcomes = new FreeFormList(page, 'Learning outcomes', 'Outcome', 'Add Outcome');
    }

    async gotoCreate(): Promise<void> {
        await this.page.goto('/linear-definition/create', { waitUntil: 'commit' });
        await waitForPageReady(this.page);
        await waitWhileLoading(this.title);
    }

    async gotoEdit(definitionId: number): Promise<void> {
        await this.page.goto(`/linear-definition/${definitionId}/edit`, { waitUntil: 'commit' });
        await waitForPageReady(this.page);
        await waitWhileLoading(this.title);
    }

    get definitionPanel(): Locator {
        return expansionPanel(this.page, 'Training Definition').first();
    }

    get definitionForm(): Locator {
        return this.page.locator('crczp-training-definition-edit');
    }

    get title(): Locator {
        return this.definitionForm.getByRole('textbox', { name: 'Title' });
    }

    get titleErrors(): Locator {
        return fieldErrors(this.definitionForm, 'Title');
    }

    get clearTitleButton(): Locator {
        return this.definitionForm.getByRole('button', { name: 'Clear title' });
    }

    get description(): Locator {
        return this.definitionForm.getByRole('textbox', { name: 'Description' });
    }

    get clearDescriptionButton(): Locator {
        return this.definitionForm.getByRole('button', { name: 'Clear description' });
    }

    get predefinedLevelsCheckbox(): Locator {
        return this.definitionForm.getByRole('checkbox', { name: 'Create predefined levels' });
    }

    /** The single Save control, which persists the definition and its levels together. */
    get saveButton(): Locator {
        return control(this.definitionPanel, 'Save');
    }

    get unsavedChangesWarning(): Locator {
        return this.definitionPanel.getByText('Changes are not saved');
    }

    get levelsCountInfo(): Locator {
        return this.page.getByText(/Training definition contains \d+ level\(s\)/);
    }

    get levelsUnavailableHint(): Locator {
        return this.page.getByText(
            'To add levels, fill in and save the basic information about the training definition.',
        );
    }

    get designers(): UserAssign {
        return UserAssign.in(this.page);
    }

    get designersPanel(): Locator {
        return expansionPanel(this.page, 'Designers').last();
    }

    get designersWarning(): Locator {
        return this.page.getByText('Designers are not saved');
    }

    /** Opens the level at a stepper position and waits until its form renders. */
    async openLevel(index: number): Promise<void> {
        await this.levels.step(index).click();
    }
}
