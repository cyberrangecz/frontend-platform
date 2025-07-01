import { UntypedFormControl, UntypedFormGroup, Validators } from '@angular/forms';
import { InfoPhase } from '@crczp/training-model';

/**
 * Form control class for info-phase-training-phase phases edit component
 */
export class InfoPhaseEditFormGroup {
    formGroup: UntypedFormGroup;

    constructor(phase: InfoPhase) {
        this.formGroup = new UntypedFormGroup({
            title: new UntypedFormControl(phase.title, Validators.required),
            content: new UntypedFormControl(phase.content, Validators.required),
        });
    }

    /**
     * Sets inserted form values from inputs to info-phase-training-phase phases
     * @param phase phases which values should be filled
     */
    setToPhase(phase: InfoPhase): void {
        phase.title = this.formGroup.get('title').value;
        phase.content = this.formGroup.get('content').value;
        phase.valid = this.formGroup.valid;
    }
}
