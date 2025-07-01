import {
    UntypedFormArray,
    UntypedFormControl,
    UntypedFormGroup,
    ValidationErrors,
    ValidatorFn,
    Validators,
} from '@angular/forms';
import { SentinelValidators } from '@sentinel/common';
import { MultipleChoiceQuestion, Question } from '@crczp/training-model';

/**
 * Form control class for form in mcq edit component
 */
export class MultipleChoiceFormGroup {
    formGroup: UntypedFormGroup;
    private maxQuestionScore = Question.MAX_QUESTION_SCORE;
    private maxQuestionPenalty = Question.MAX_QUESTION_PENALTY;

    constructor(mcq: MultipleChoiceQuestion) {
        this.formGroup = new UntypedFormGroup(
            {
                title: new UntypedFormControl(mcq.title, SentinelValidators.noWhitespace),
                choices: new UntypedFormArray(
                    mcq.choices.map(
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
                    Validators.required,
                ),
                score: new UntypedFormControl(mcq.score, [
                    Validators.required,
                    Validators.pattern('^[0-9]*$'),
                    Validators.min(0),
                    Validators.max(this.maxQuestionScore),
                ]),
                penalty: new UntypedFormControl(mcq.penalty, [
                    Validators.required,
                    Validators.pattern('^[0-9]*$'),
                    Validators.min(0),
                    Validators.max(this.maxQuestionPenalty),
                ]),
            },
            this.noSelectedAnswers,
        );
    }

    private noSelectedAnswers: ValidatorFn = (control: UntypedFormGroup): ValidationErrors | null => {
        let error = null;
        if (
            (control.get('choices') as UntypedFormArray).controls.filter((choice) => choice.get('correct').value)
                .length === 0
        ) {
            error = { noSelectedAnswers: true };
        }
        return error ? error : null;
    };

    /**
     * Sets inserted input to multiple choice question object
     * @param mcq object to be filled with form inputs
     * @param isTest true if level is test, false if questionnaire
     */
    setToMCQ(mcq: MultipleChoiceQuestion, isTest: boolean): void {
        mcq.title = this.formGroup.get('title').value;
        mcq.choices = this.formGroup.get('choices').value;
        mcq.score = mcq.required ? this.formGroup.get('score').value : 0;
        mcq.penalty = isTest ? this.formGroup.get('penalty').value : 0;
        mcq.valid = this.formGroup.valid;
    }

    /**
     * Adds correct answers validators (if level is test)
     */
    addAnswersValidator(): void {
        this.formGroup.setValidators(this.noSelectedAnswers);
    }

    /**
     * Removes correct answers validators (if level is questionnaire)
     */
    removeAnswersValidator(): void {
        this.formGroup.clearValidators();
        this.formGroup.updateValueAndValidity();
    }
}
