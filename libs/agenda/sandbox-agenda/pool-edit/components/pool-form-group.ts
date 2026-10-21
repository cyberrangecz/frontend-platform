import {AbstractControl, UntypedFormControl, UntypedFormGroup, ValidationErrors, Validators} from '@angular/forms';
import {Pool, SandboxDefinition} from '@crczp/sandbox-model';

export const MAXIMUM_POOL_SIZE = 500;

/** Flags a value that is not a whole number; an empty value passes. */
function wholeNumberValidator(control: AbstractControl): ValidationErrors | null {
    const value = control.value;
    return value === null || value === '' || Number.isInteger(Number(value)) ? null : { wholeNumber: true };
}

export class PoolFormGroup {
    formGroup: UntypedFormGroup;

    constructor(pool: Pool, editMode: boolean) {
        const poolParams = { value: editMode ? pool.maxSize : 1, disabled: false };
        const definitionParams = { value: editMode ? pool.definition : undefined, disabled: editMode };
        const comment = pool === undefined || pool.comment === undefined ? '' : pool.comment;
        const notifyBuild = pool === undefined || pool.notifyBuild === undefined ? false : pool.notifyBuild;
        this.formGroup = new UntypedFormGroup({
            poolSize: new UntypedFormControl(poolParams, [
                Validators.required,
                Validators.min(editMode ? Math.max(1, pool.usedSize) : 1),
                Validators.max(MAXIMUM_POOL_SIZE),
                wholeNumberValidator,
            ]),
            sandboxDefinition: new UntypedFormControl(definitionParams, [Validators.required]),
            comment: new UntypedFormControl(comment, [Validators.maxLength(256)]),
            notifyBuild: new UntypedFormControl(notifyBuild),
        });
    }

    /**
     * Sets values inserted to form inputs to pool object
     * @param pool pool to be filled with form data
     */
    setValuesToPool(pool: Pool): void {
        pool.definition = new SandboxDefinition();
        pool.definition.id = this.formGroup.get('sandboxDefinition').value?.id;
        pool.maxSize = this.formGroup.get('poolSize').value;
        pool.comment = this.formGroup.get('comment').value;
        pool.notifyBuild = this.formGroup.get('notifyBuild').value;
    }
}
