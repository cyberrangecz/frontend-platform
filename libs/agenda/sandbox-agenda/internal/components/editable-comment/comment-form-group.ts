import {UntypedFormControl, UntypedFormGroup, Validators} from '@angular/forms';

/**
 * Longest comment the sandbox service accepts.
 */
export const MAXIMUM_COMMENT_LENGTH = 256;

export class CommentFormGroup {
    formGroup: UntypedFormGroup;

    constructor(comment = '') {
        this.formGroup = new UntypedFormGroup({
            comment: new UntypedFormControl(comment, [Validators.maxLength(MAXIMUM_COMMENT_LENGTH)]),
        });
    }
}
