import { UntypedFormControl, UntypedFormGroup, Validators } from '@angular/forms';
import { SentinelValidators } from '@sentinel/common';

/**
 * Form control class for access training run form
 */
export class TraineeAccessTrainingFormGroup {
    formGroup: UntypedFormGroup;

    constructor() {
        const accessTokenPinLimitations = 4;
        this.formGroup = new UntypedFormGroup({
            accessTokenPrefix: new UntypedFormControl('', SentinelValidators.noWhitespace),
            accessTokenPin: new UntypedFormControl('', [
                Validators.required,
                Validators.pattern('^[0-9]*$'),
                Validators.minLength(accessTokenPinLimitations),
                Validators.maxLength(accessTokenPinLimitations),
            ]),
        });
    }
}
