import {UntypedFormControl, UntypedFormGroup, Validators} from '@angular/forms';
import {SandboxDefinition} from '@crczp/sandbox-model';

/**
 * Sandbox Definition create form
 */
export class SandboxDefinitionFormGroup {
    formGroup: UntypedFormGroup;

    constructor() {
        this.formGroup = new UntypedFormGroup({
            gitUrl: new UntypedFormControl('', Validators.required),
            revision: new UntypedFormControl('', Validators.required),
        });
    }

    createFromValues(): SandboxDefinition {
        const definition = new SandboxDefinition();
        definition.url = this.formGroup.get('gitUrl').value.trim();
        definition.rev = this.formGroup.get('revision').value.trim();
        return definition;
    }
}
