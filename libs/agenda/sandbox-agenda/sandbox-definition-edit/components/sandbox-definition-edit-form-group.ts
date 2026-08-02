import {UntypedFormControl, UntypedFormGroup} from '@angular/forms';
import {SentinelValidators} from '@sentinel/common';
import {SandboxDefinition} from '@crczp/sandbox-model';

/**
 * Sandbox Definition create form
 */
export class SandboxDefinitionFormGroup {
    formGroup: UntypedFormGroup;

    constructor() {
        this.formGroup = new UntypedFormGroup({
            gitUrl: new UntypedFormControl('', SentinelValidators.noWhitespace),
            revision: new UntypedFormControl('', SentinelValidators.noWhitespace),
        });
    }

    createFromValues(): SandboxDefinition {
        const definition = new SandboxDefinition();
        definition.url = this.formGroup.get('gitUrl').value.trim();
        definition.rev = this.formGroup.get('revision').value.trim();
        return definition;
    }
}
