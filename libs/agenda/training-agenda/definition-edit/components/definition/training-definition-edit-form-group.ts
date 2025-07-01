import { UntypedFormArray, UntypedFormControl, UntypedFormGroup } from '@angular/forms';
import { SentinelValidators } from '@sentinel/common';
import { TrainingDefinition } from '@crczp/training-model';

/**
 * Form control class of training definition edit form
 */
export class TrainingDefinitionEditFormGroup {
    formGroup: UntypedFormGroup;

    constructor(trainingDefinition: TrainingDefinition) {
        this.formGroup = new UntypedFormGroup({
            title: new UntypedFormControl(trainingDefinition.title, SentinelValidators.noWhitespace),
            description: new UntypedFormControl(trainingDefinition.description),
            prerequisites: new UntypedFormArray(
                trainingDefinition.prerequisites.map((prereq) => new UntypedFormControl(prereq)),
            ),
            outcomes: new UntypedFormArray(
                trainingDefinition.outcomes.map((outcomes) => new UntypedFormControl(outcomes)),
            ),
            defaultContent: new UntypedFormControl(trainingDefinition.defaultContent),
        });
    }

    /**
     * Sets values from form to training definition object
     * @param trainingDefinition training definition object to be filled with inputs from form
     */
    setValuesToTrainingDefinition(trainingDefinition: TrainingDefinition): void {
        trainingDefinition.title = this.formGroup.get('title').value;
        trainingDefinition.description = this.formGroup.get('description').value;
        trainingDefinition.outcomes = this.formGroup.get('outcomes').value;
        trainingDefinition.prerequisites = this.formGroup.get('prerequisites').value;
        trainingDefinition.defaultContent = this.formGroup.get('defaultContent').value;
    }
}
