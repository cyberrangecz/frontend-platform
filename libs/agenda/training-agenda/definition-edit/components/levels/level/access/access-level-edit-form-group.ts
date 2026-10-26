import {UntypedFormControl, UntypedFormGroup, Validators} from '@angular/forms';
import {SentinelValidators} from '@sentinel/common';
import {AccessLevel} from '@crczp/training-model';

/**
 * Form control class for access level edit component
 */
export class AccessLevelEditFormGroup {
    formGroup: UntypedFormGroup;

    constructor(level: AccessLevel) {
        this.formGroup = new UntypedFormGroup({
            title: new UntypedFormControl(level.title, SentinelValidators.noWhitespace),
            passkey: new UntypedFormControl(level.passkey, SentinelValidators.noWhitespace),
            cloudContent: new UntypedFormControl(level.cloudContent, SentinelValidators.noWhitespace),
            localContent: new UntypedFormControl(level.localContent, SentinelValidators.noWhitespace),
            estimatedDuration: new UntypedFormControl(level.estimatedDuration, [
                Validators.pattern('^[0-9]*$'),
                Validators.min(0),
            ]),
        });
    }

    /**
     * Sets inserted form values from inputs to access level
     * @param level level which values should be filled
     */
    setToLevel(level: AccessLevel): void {
        level.title = this.formGroup.get('title').value?.trim();
        level.passkey = this.formGroup.get('passkey').value?.trim();
        level.cloudContent = this.formGroup.get('cloudContent').value;
        level.localContent = this.formGroup.get('localContent').value;
        level.estimatedDuration = Number(this.formGroup.get('estimatedDuration').value);
        level.valid = this.formGroup.valid;
    }
}
