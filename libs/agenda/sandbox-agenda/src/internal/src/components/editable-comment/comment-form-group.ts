import { UntypedFormControl, UntypedFormGroup, Validators } from '@angular/forms';

export class CommentFormGroup {
    formGroup: UntypedFormGroup;

    constructor(comment = '') {
        this.formGroup = new UntypedFormGroup({
            comment: new UntypedFormControl(comment, [Validators.maxLength(256)]),
        });
    }
}
