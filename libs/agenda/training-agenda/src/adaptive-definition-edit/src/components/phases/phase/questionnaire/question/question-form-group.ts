import {
    UntypedFormArray,
    UntypedFormControl,
    UntypedFormGroup,
    ValidationErrors,
    ValidatorFn,
    Validators,
} from '@angular/forms';
import { AdaptiveQuestion, QuestionnaireTypeEnum } from '@crczp/training-model';
import { SentinelValidators } from '@sentinel/common';

export class QuestionFormGroup {
    questionFormGroup: UntypedFormGroup;
    questionnaireType: QuestionnaireTypeEnum;

    constructor(ffq: AdaptiveQuestion, questionnaireType: QuestionnaireTypeEnum) {
        this.questionnaireType = questionnaireType;
        this.questionFormGroup = new UntypedFormGroup(
            {
                title: new UntypedFormControl(ffq.text, SentinelValidators.noWhitespace),
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
     */
    setToQuestion(ffq: AdaptiveQuestion): void {
        ffq.text = this.questionFormGroup.get('title').value;
        ffq.choices = this.questionFormGroup.get('choices').value;
        ffq.valid = this.questionFormGroup.valid;
    }

    private noSelectedChoices: ValidatorFn = (control: UntypedFormGroup): ValidationErrors | null => {
        let error = null;
        const choices = control.get('choices');
        if (choices && choices.value.length === 0 && this.questionnaireType === QuestionnaireTypeEnum.Adaptive) {
            error = { noSelectedChoices: true };
        }
        return error ? error : null;
    };
}
