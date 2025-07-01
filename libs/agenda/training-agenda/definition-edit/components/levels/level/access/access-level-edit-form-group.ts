import { UntypedFormControl, UntypedFormGroup } from '@angular/forms';
import { SentinelValidators } from '@sentinel/common';
import { AccessLevel } from '@crczp/training-model';

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
        });
    }

    /**
     * Sets inserted form values from inputs to access level
     * @param level level which values should be filled
     */
    setToLevel(level: AccessLevel): void {
        level.title = this.formGroup.get('title').value;
        level.passkey = this.formGroup.get('passkey').value;
        level.passkey = level.passkey ? level.passkey.trim() : level.passkey;
        level.cloudContent = this.formGroup.get('cloudContent').value;
        level.localContent = this.formGroup.get('localContent').value;
        level.valid = this.formGroup.valid;
    }
}
