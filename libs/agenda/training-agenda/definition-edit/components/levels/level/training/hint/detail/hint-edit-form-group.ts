import { UntypedFormControl, UntypedFormGroup, Validators } from '@angular/forms';
import { SentinelValidators } from '@sentinel/common';
import { Hint } from '@crczp/training-model';

/**
 * Form control for hint edit component
 */
export class HintEditFormGroup {
    formGroup: UntypedFormGroup;

    constructor(hint: Hint) {
        this.formGroup = new UntypedFormGroup({
            title: new UntypedFormControl(hint.title, SentinelValidators.noWhitespace),
            content: new UntypedFormControl(hint.content, SentinelValidators.noWhitespace),
            hintPenalty: new UntypedFormControl(hint.penalty, [Validators.required, Validators.min(0)]),
        });
    }

    /**
     * Sets inserted values from form inputs to hint object
     * @param hint hint to be filled with form inputs
     */
    setToHint(hint: Hint): void {
        hint.title = this.formGroup.get('title').value;
        hint.content = this.formGroup.get('content').value;
        hint.penalty = this.formGroup.get('hintPenalty').value;
        hint.valid = this.formGroup.valid;
    }
}
