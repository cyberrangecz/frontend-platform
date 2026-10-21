import { UntypedFormControl, UntypedFormGroup, Validators } from '@angular/forms';
import { SentinelValidators } from '@sentinel/common';
import { TrainingLevel } from '@crczp/training-model';

export const MAX_SCORE = 100;
export const INCORRECT_ANSWER_LIMIT = 100;
export const MAX_ANSWER = 50;

/**
 * Form control class for training level edit component
 */
export class TrainingLevelEditFormGroup {
    formGroup: UntypedFormGroup;

    constructor(level: TrainingLevel) {
        this.formGroup = new UntypedFormGroup({
            title: new UntypedFormControl(
                level.title,
                SentinelValidators.noWhitespace,
            ),
            content: new UntypedFormControl(
                level.content,
                SentinelValidators.noWhitespace,
            ),
            solution: new UntypedFormControl(
                level.solution,
                SentinelValidators.noWhitespace,
            ),
            maxScore: new UntypedFormControl(level.maxScore, [
                Validators.required,
                Validators.pattern('^[0-9]*$'),
                Validators.min(0),
                Validators.max(MAX_SCORE),
            ]),
            solutionPenalized: new UntypedFormControl(
                level.isSolutionPenalized,
            ),
            incorrectAnswerLimit: new UntypedFormControl(
                level.incorrectAnswerLimit,
                [
                    Validators.required,
                    Validators.pattern('^[0-9]*$'),
                    Validators.min(1),
                    Validators.max(INCORRECT_ANSWER_LIMIT),
                ],
            ),
            variantAnswers: new UntypedFormControl(level.variantAnswers),
            answer: new UntypedFormControl(
                level.variantAnswers
                    ? level.answerVariableName
                    : level.answer,
                [
                    SentinelValidators.noWhitespace,
                    Validators.maxLength(MAX_ANSWER),
                ],
            ),
            estimatedDuration: new UntypedFormControl(level.estimatedDuration, [
                Validators.pattern('^[0-9]*$'),
                Validators.min(1),
            ]),
            minimalPossibleSolveTime: new UntypedFormControl(
                level.minimalPossibleSolveTime,
                [Validators.pattern('^[0-9]*$'), Validators.min(0)],
            ),
            commandsRequired: new UntypedFormControl(level.commandsRequired),
        });
        this.formGroup
            .get('variantAnswers')
            .valueChanges.subscribe(() => this.formGroup.get('answer').setValue(''));
    }

    /**
     * Sets inserted form values from inputs to training level. The single answer input fills the variable name when variant answers are on, otherwise the fixed answer; the other field is null.
     * @param level level which values should be filled
     */
    setToLevel(level: TrainingLevel): void {
        level.title = this.formGroup.get('title').value;
        level.content = this.formGroup.get('content').value;
        level.solution = this.formGroup.get('solution').value;
        level.maxScore = this.formGroup.get('maxScore').value;
        level.isSolutionPenalized =
            this.formGroup.get('solutionPenalized').value;
        level.incorrectAnswerLimit = this.formGroup.get(
            'incorrectAnswerLimit',
        ).value;
        level.variantAnswers = this.formGroup.get('variantAnswers').value;
        const answer = this.formGroup.get('answer').value?.trim();
        level.answer = level.variantAnswers ? null : answer;
        level.answerVariableName = level.variantAnswers ? answer : null;
        level.estimatedDuration = this.formGroup.get('estimatedDuration').value;
        level.minimalPossibleSolveTime = this.formGroup.get(
            'minimalPossibleSolveTime',
        ).value;
        level.commandsRequired = this.formGroup.get('commandsRequired').value;
        level.valid =
            this.formGroup.valid && level.hints.every((hint) => hint.valid);
    }
}
