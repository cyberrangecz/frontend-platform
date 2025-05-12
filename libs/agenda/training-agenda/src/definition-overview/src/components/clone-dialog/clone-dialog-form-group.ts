import { UntypedFormControl, UntypedFormGroup } from '@angular/forms';
import { SentinelValidators } from '@sentinel/common';

/**
 * Form group controls for form in clone dialog component
 */
export class CloneDialogFormGroup {
    formGroup: UntypedFormGroup;

    constructor() {
        this.formGroup = new UntypedFormGroup({
            clonedDefinitionTitle: new UntypedFormControl('', [SentinelValidators.noWhitespace]),
        });
    }
}
