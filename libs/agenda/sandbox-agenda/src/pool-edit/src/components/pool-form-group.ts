import { UntypedFormControl, UntypedFormGroup, Validators } from '@angular/forms';
import { Pool, SandboxDefinition } from '@crczp/sandbox-model';

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
                Validators.min(editMode ? pool.usedSize : 1),
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
