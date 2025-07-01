import { UntypedFormControl, UntypedFormGroup, Validators } from '@angular/forms';
import { AccessPhase } from '@crczp/training-model';
import { SentinelValidators } from '@sentinel/common';

/**
 * Form control class for access-phase phases edit component
 */
export class AccessPhaseEditFormGroup {
    formGroup: UntypedFormGroup;

    constructor(phase: AccessPhase) {
        this.formGroup = new UntypedFormGroup({
            title: new UntypedFormControl(phase.title, Validators.required),
            passkey: new UntypedFormControl(phase.passkey, SentinelValidators.noWhitespace),
            cloudContent: new UntypedFormControl(phase.cloudContent, SentinelValidators.noWhitespace),
            localContent: new UntypedFormControl(phase.localContent, SentinelValidators.noWhitespace),
        });
    }

    /**
     * Sets inserted form values from inputs to access-phase phases
     * @param phase phases which values should be filled
     */
    setToPhase(phase: AccessPhase): void {
        phase.title = this.formGroup.get('title').value;
        phase.passkey = this.formGroup.get('passkey').value;
        phase.passkey = phase.passkey ? phase.passkey.trim() : phase.passkey;
        phase.cloudContent = this.formGroup.get('cloudContent').value;
        phase.localContent = this.formGroup.get('localContent').value;
        phase.valid = this.formGroup.valid;
    }
}
