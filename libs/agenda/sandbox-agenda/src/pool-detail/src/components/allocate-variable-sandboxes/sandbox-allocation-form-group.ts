import { UntypedFormControl, UntypedFormGroup, Validators } from '@angular/forms';

export class SandboxAllocationFormGroup {
    formGroup: UntypedFormGroup;

    constructor(size: number) {
        this.formGroup = new UntypedFormGroup({
            allocationSize: new UntypedFormControl('', [
                Validators.required,
                Validators.min(1),
                Validators.max(size),
                Validators.pattern('^[0-9]*$'),
            ]),
        });
    }

    createFormValues(): number {
        return this.formGroup.get('allocationSize').value;
    }
}
