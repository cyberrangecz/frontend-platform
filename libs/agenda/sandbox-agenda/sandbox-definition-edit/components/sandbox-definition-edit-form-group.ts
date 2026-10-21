import {UntypedFormControl, UntypedFormGroup, ValidationErrors, ValidatorFn} from '@angular/forms';
import {SentinelValidators} from '@sentinel/common';
import {SandboxDefinition} from '@crczp/sandbox-model';

/**
 * Accepts the Git URL formats the sandbox backend accepts: a URL naming a GitHub host, or an
 * HTTPS URL ending in `.git`. An empty value is left to the whitespace validator.
 */
const gitUrlFormat: ValidatorFn = (control): ValidationErrors | null => {
    const url = (control.value || '').trim();
    const isAccepted =
        url.length === 0 ||
        url.includes('github.') ||
        (url.startsWith('https://') && url.endsWith('.git'));
    return isAccepted ? null : {gitUrlFormat: true};
};

/**
 * Sandbox Definition create form
 */
export class SandboxDefinitionFormGroup {
    formGroup: UntypedFormGroup;

    constructor() {
        this.formGroup = new UntypedFormGroup({
            gitUrl: new UntypedFormControl('', [SentinelValidators.noWhitespace, gitUrlFormat]),
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
