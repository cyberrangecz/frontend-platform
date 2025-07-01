import {
    UntypedFormArray,
    UntypedFormControl,
    UntypedFormGroup,
    ValidationErrors,
    ValidatorFn,
    Validators,
} from '@angular/forms';
import { SentinelValidators } from '@sentinel/common';
import { FreeFormQuestion, Question } from '@crczp/training-model';

/**
 * Form control for free form question component
 */
export class FreeFormQuestionFormGroup {
    freeFormQuestionFormGroup: UntypedFormGroup;

    constructor(ffq: FreeFormQuestion) {
        this.freeFormQuestionFormGroup = new UntypedFormGroup(
            {
                title: new UntypedFormControl(ffq.title, SentinelValidators.noWhitespace),
                score: new UntypedFormControl(ffq.score, [
                    Validators.required,
                    Validators.pattern('^[0-9]*$'),
                    Validators.min(0),
                    Validators.max(Question.MAX_QUESTION_SCORE),
                ]),
                penalty: new UntypedFormControl(ffq.penalty, [
                    Validators.required,
                    Validators.pattern('^[0-9]*$'),
                    Validators.min(0),
                    Validators.max(Question.MAX_QUESTION_PENALTY),
                ]),
                choices: new UntypedFormArray(
                    ffq.choices.map(
                        (choice) =>
                            new UntypedFormGroup({
                                id: new UntypedFormControl(choice.id),
                                text: new UntypedFormControl(choice.text, [
                                    SentinelValidators.noWhitespace,
                                    Validators.required,
                                ]),
                                correct: new UntypedFormControl(choice.correct),
                                order: new UntypedFormControl(choice.order),
                            }),
                    ),
                ),
            },
            this.noSelectedChoices,
        );
    }

    /**
     * Sets form input values to free form question object
     * @param ffq free form question to be filled with values
     * @param isTest true if level is test, false if questionnaire
     */
    setToFFQ(ffq: FreeFormQuestion, isTest: boolean): void {
        ffq.title = this.freeFormQuestionFormGroup.get('title').value;
        ffq.choices = this.freeFormQuestionFormGroup.get('choices').value;
        ffq.score = ffq.required ? this.freeFormQuestionFormGroup.get('score').value : 0;
        ffq.penalty = isTest ? this.freeFormQuestionFormGroup.get('penalty').value : 0;
        ffq.valid = !isTest ? true : this.freeFormQuestionFormGroup.valid;
    }

    private noSelectedChoices: ValidatorFn = (control: UntypedFormGroup): ValidationErrors | null => {
        let error = null;
        const choices = control.get('choices');
        if (choices && choices.value.length === 0) {
            error = { noSelectedChoices: true };
        }
        return error ? error : null;
    };

    /**
     * Adds validator to answers if preselected correct answers are required (if level is test)
     */
    addChoicesValidator(): void {
        this.freeFormQuestionFormGroup.setValidators(this.noSelectedChoices);
    }

    /**
     * Removes validators from answers if preselected correct answers are not required (if level is questionnaire)
     */
    removeChoicesValidator(): void {
        this.freeFormQuestionFormGroup.clearValidators();
        this.freeFormQuestionFormGroup.updateValueAndValidity();
    }
}
