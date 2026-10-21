import {UntypedFormControl, UntypedFormGroup, Validators} from '@angular/forms';
import {SentinelValidators} from '@sentinel/common';
import {Hint} from '@crczp/training-model';

/**
 * Pattern accepting only whole non-negative numbers
 */
export const WHOLE_NUMBER_PATTERN = '^[0-9]*$';

/**
 * Form control for hint edit component
 */
export class HintEditFormGroup {
    formGroup: UntypedFormGroup;

    constructor(hint: Hint) {
        this.formGroup = new UntypedFormGroup({
            title: new UntypedFormControl(hint.title, SentinelValidators.noWhitespace),
            content: new UntypedFormControl(hint.content, SentinelValidators.noWhitespace),
            hintPenalty: new UntypedFormControl(hint.penalty, [
                Validators.required,
                Validators.pattern(WHOLE_NUMBER_PATTERN),
                Validators.min(0),
            ]),
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
