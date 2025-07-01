import { UntypedFormControl, UntypedFormGroup, Validators } from '@angular/forms';
import { SentinelValidators } from '@sentinel/common';
import { AssessmentLevel, AssessmentTypeEnum } from '@crczp/training-model';

/**
 * Form control class for assessment level edit component
 */
export class AssessmentLevelEditFormGroup {
    formGroup: UntypedFormGroup;

    constructor(level: AssessmentLevel) {
        this.formGroup = new UntypedFormGroup({
            title: new UntypedFormControl(level.title, SentinelValidators.noWhitespace),
            instructions: new UntypedFormControl(level.instructions),
            isTest: new UntypedFormControl(level.assessmentType === AssessmentTypeEnum.Test),
            estimatedDuration: new UntypedFormControl(level.estimatedDuration, [
                Validators.min(1),
                Validators.pattern('^[0-9]*$'),
            ]),
            minimalPossibleSolveTime: new UntypedFormControl(level.minimalPossibleSolveTime, [
                Validators.min(0),
                Validators.pattern('^[0-9]*$'),
            ]),
        });
    }

    /**
     * Sets inserted form values from inputs to assessment level
     * @param level level which values should be filled
     */
    setToLevel(level: AssessmentLevel): void {
        level.title = this.formGroup.get('title').value;
        level.instructions = this.formGroup.get('instructions').value;
        level.assessmentType = this.formGroup.get('isTest').value
            ? AssessmentTypeEnum.Test
            : AssessmentTypeEnum.Questionnaire;
        level.estimatedDuration = this.formGroup.get('estimatedDuration').value;
        level.minimalPossibleSolveTime = this.formGroup.get('minimalPossibleSolveTime').value;
        level.valid = this.formGroup.valid && level.questions.every((question) => question.valid);
    }
}
