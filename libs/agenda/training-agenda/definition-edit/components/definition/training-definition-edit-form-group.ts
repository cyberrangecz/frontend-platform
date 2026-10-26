import {
    AbstractControl,
    UntypedFormArray,
    UntypedFormControl,
    UntypedFormGroup,
    ValidationErrors
} from '@angular/forms';
import {SentinelValidators} from '@sentinel/common';
import {TrainingDefinitionWithLevels} from '@crczp/training-model';

export const MINIMUM_LIST_ITEM_LENGTH = 2;

/**
 * Fails with `itemTooShort` when any item of the list has fewer characters than the minimum once trimmed.
 */
export function listItemsMinimumLength(list: AbstractControl): ValidationErrors | null {
    const hasShortItem = (list.value as string[]).some((item) => item.trim().length < MINIMUM_LIST_ITEM_LENGTH);
    return hasShortItem ? {itemTooShort: true} : null;
}

/**
 * Form control class of training definition edit form
 */
export class TrainingDefinitionEditFormGroup {
    formGroup: UntypedFormGroup;

    constructor(trainingDefinition: TrainingDefinitionWithLevels) {
        this.formGroup = new UntypedFormGroup({
            title: new UntypedFormControl(trainingDefinition.title, SentinelValidators.noWhitespace),
            description: new UntypedFormControl(trainingDefinition.description),
            prerequisites: new UntypedFormArray(
                trainingDefinition.prerequisites.map((prereq) => new UntypedFormControl(prereq)),
                listItemsMinimumLength,
            ),
            outcomes: new UntypedFormArray(
                trainingDefinition.outcomes.map((outcomes) => new UntypedFormControl(outcomes)),
                listItemsMinimumLength,
            ),
            defaultContent: new UntypedFormControl(trainingDefinition.defaultContent),
        });
    }

    /**
     * Sets values from form to training definition object
     * @param trainingDefinition training definition object to be filled with inputs from form
     */
    setValuesToTrainingDefinition(trainingDefinition: TrainingDefinitionWithLevels): void {
        trainingDefinition.title = this.formGroup.get('title').value;
        trainingDefinition.description = this.formGroup.get('description').value;
        trainingDefinition.outcomes = this.formGroup.get('outcomes').value;
        trainingDefinition.prerequisites = this.formGroup.get('prerequisites').value;
        trainingDefinition.defaultContent = this.formGroup.get('defaultContent').value;
    }
}
