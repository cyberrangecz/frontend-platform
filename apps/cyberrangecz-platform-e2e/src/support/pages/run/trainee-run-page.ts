import { expect, type Locator, type Page } from '@playwright/test';
import { ConfirmationDialog, lockedRunStepperSteps, runStepperStep, selectedRunStepperStep } from '../../ui';

/** The run page a trainee plays a training on: stepper, level content, answer form, hints, questions. */
export class TraineeRunPage {
    constructor(readonly page: Page) {}

    /** Title of the displayed level. */
    get levelTitle(): Locator {
        return this.page.locator('crczp-abstract-level').getByRole('heading', { level: 1 }).first();
    }

    get timer(): Locator {
        return this.page.locator('crczp-training-timer');
    }

    get markdown(): Locator {
        return this.page.locator('sentinel-markdown-view').first();
    }

    get stepLabels(): Locator {
        return this.page.locator('crczp-stepper .step-label');
    }

    step(index: number): Locator {
        return runStepperStep(this.page, index);
    }

    get selectedStep(): Locator {
        return selectedRunStepperStep(this.page);
    }

    get lockedSteps(): Locator {
        return lockedRunStepperSteps(this.page);
    }

    button(name: string): Locator {
        return this.page.getByRole('button', { name, exact: true });
    }

    get answerInput(): Locator {
        return this.page.getByPlaceholder('Answer');
    }

    get answerSubmitButton(): Locator {
        return this.page.locator('crczp-floating-answer-form').getByRole('button', { name: /^(Submit|Finish)$/ });
    }

    hintButton(position: number): Locator {
        return this.button(`Hint ${position}`);
    }

    get revealSolutionButton(): Locator {
        return this.button('Reveal Solution');
    }

    get revealedHints(): Locator {
        return this.page.locator('crczp-hint-content');
    }

    /** The revealed solution block of the current level. */
    get revealedSolution(): Locator {
        return this.revealedHints.filter({ hasText: 'Solution' });
    }

    /** The emphasised value inside the revealed solution, where the platform places the trainee's own answer. */
    get revealedSolutionAnswer(): Locator {
        return this.revealedSolution.locator('code');
    }

    /** Button that shows or hides the sandbox topology panel. */
    get topologyToggle(): Locator {
        return this.page
            .locator('crczp-run-topology-wrapper')
            .getByRole('button')
            .filter({ has: this.page.locator('mat-icon', { hasText: /^\s*(polyline|chevron_right)\s*$/ }) });
    }

    get sshConfigButton(): Locator {
        return this.page.getByRole('button', { name: 'SSH Config' });
    }

    /** Types an answer into the floating answer form and presses its submit button. */
    async submitAnswer(answer: string): Promise<void> {
        await this.answerInput.fill(answer);
        await this.answerSubmitButton.click();
    }

    /** Types an answer into the floating answer form and submits it with Enter. */
    async submitAnswerWithEnter(answer: string): Promise<void> {
        await this.answerInput.fill(answer);
        await this.answerInput.press('Enter');
    }

    /** Asserts the incorrect-answer dialog with its remaining attempts, then closes it. */
    async dismissIncorrectAnswerDialog(remainingAttempts: number): Promise<void> {
        const dialog = new ConfirmationDialog(this.page, 'Incorrect Answer');
        await expect(dialog.message).toContainText(
            `You have submitted an incorrect answer. You have ${remainingAttempts} remaining attempts.`,
        );
        await dialog.cancel();
        await expect(dialog.root).toBeHidden();
    }

    /** Opens the reveal dialog of a hint and returns it, its message not yet checked. */
    async openHintDialog(position: number): Promise<ConfirmationDialog> {
        await this.hintButton(position).click();
        const dialog = new ConfirmationDialog(this.page, 'Reveal Hint');
        await expect(dialog.root).toBeVisible();
        return dialog;
    }

    /** Opens the reveal dialog of the solution. */
    async openSolutionDialog(): Promise<ConfirmationDialog> {
        await this.revealSolutionButton.click();
        const dialog = new ConfirmationDialog(this.page, 'Reveal Solution');
        await expect(dialog.root).toBeVisible();
        return dialog;
    }

    get questions(): Locator {
        return this.page.locator('crczp-trainee-question');
    }

    get freeFormInput(): Locator {
        return this.page.getByRole('textbox', { name: 'Answer' });
    }

    multipleChoiceOption(text: string): Locator {
        return this.page.getByRole('checkbox', { name: text, exact: true });
    }

    /** The radio of an extended-matching row (statement) under an option column. */
    async matchingRadio(statement: string, option: string): Promise<Locator> {
        const table = this.page.locator('crczp-trainee-extended-matching-items table');
        const headers = (await table.locator('th').allInnerTexts()).map((text) => text.trim());
        const optionIndex = headers.indexOf(option) - 1;
        if (optionIndex < 0) {
            throw new Error(`No matching option "${option}"; options are: ${headers.join(' | ')}`);
        }
        return table.locator('tr', { hasText: statement }).getByRole('radio').nth(optionIndex);
    }

    /** Chooses an option for a statement of the extended-matching question. */
    async matchStatement(statement: string, option: string): Promise<void> {
        const radio = await this.matchingRadio(statement, option);
        await radio.locator('xpath=ancestor::mat-radio-button').click();
        await expect(radio).toBeChecked();
    }
}
