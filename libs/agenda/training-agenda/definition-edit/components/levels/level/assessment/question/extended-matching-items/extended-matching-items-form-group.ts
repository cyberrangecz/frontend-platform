import {
    UntypedFormArray,
    UntypedFormControl,
    UntypedFormGroup,
    ValidationErrors,
    ValidatorFn,
    Validators,
} from '@angular/forms';
import { SentinelValidators } from '@sentinel/common';
import { ExtendedMatchingItems, Question } from '@crczp/training-model';

/**
 * Form control group for form in EMI edit component
 */
export class ExtendedMatchingItemsFormGroup {
    formGroup: UntypedFormGroup;

    constructor(emi: ExtendedMatchingItems) {
        this.formGroup = new UntypedFormGroup(
            {
                title: new UntypedFormControl(emi.title, SentinelValidators.noWhitespace),
                statements: new UntypedFormArray(
                    emi.extendedMatchingStatements.map(
                        (statement) =>
                            new UntypedFormGroup({
                                id: new UntypedFormControl(statement.id),
                                order: new UntypedFormControl(statement.order),
                                text: new UntypedFormControl(statement.text, [
                                    SentinelValidators.noWhitespace,
                                    Validators.maxLength(255),
                                ]),
                                correctOptionOrder: new UntypedFormControl(statement.correctOptionOrder),
                            }),
                    ),
                ),
                options: new UntypedFormArray(
                    emi.extendedMatchingOptions.map(
                        (option) =>
                            new UntypedFormGroup({
                                id: new UntypedFormControl(option.id),
                                order: new UntypedFormControl(option.order),
                                text: new UntypedFormControl(option.text, [
                                    SentinelValidators.noWhitespace,
                                    Validators.maxLength(255),
                                ]),
                            }),
                    ),
                ),
                score: new UntypedFormControl(emi.score, [
                    Validators.required,
                    Validators.pattern('^[0-9]*$'),
                    Validators.min(0),
                    Validators.max(Question.MAX_QUESTION_SCORE),
                ]),
                penalty: new UntypedFormControl(emi.penalty, [
                    Validators.required,
                    Validators.pattern('^[0-9]*$'),
                    Validators.min(0),
                    Validators.max(Question.MAX_QUESTION_PENALTY),
                ]),
            },
            this.noSelectedAnswers,
        );
    }

    /**
     * Sets inserted input values to emi object
     * @param emi emi object to be filled with inserted inputs
     * @param isTest true if level is test, false if questionnaire
     */
    setToEMI(emi: ExtendedMatchingItems, isTest: boolean): void {
        emi.title = this.formGroup.get('title').value;
        emi.extendedMatchingStatements = this.formGroup.get('statements').value;
        emi.extendedMatchingOptions = this.formGroup.get('options').value;
        emi.score = emi.required ? this.formGroup.get('score').value : 0;
        emi.penalty = isTest ? this.formGroup.get('penalty').value : 0;
        emi.valid = this.formGroup.valid;
    }

    private noSelectedAnswers: ValidatorFn = (control: UntypedFormGroup): ValidationErrors | null => {
        let error = null;
        (control.get('statements') as UntypedFormArray).controls.forEach((statement) => {
            if (statement.get('correctOptionOrder').value === null) {
                error = { noSelectedAnswers: true };
            }
        });
        return error ? error : null;
    };

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
