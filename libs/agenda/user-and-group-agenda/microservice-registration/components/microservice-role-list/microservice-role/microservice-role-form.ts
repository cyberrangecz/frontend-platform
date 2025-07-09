import {UntypedFormControl, UntypedFormGroup, Validators} from '@angular/forms';
import {MicroserviceRole} from '@crczp/user-and-group-model';

/**
 * Form control of microservice-registration state form
 */
export class MicroserviceRoleForm {
    formGroup: UntypedFormGroup;

    constructor(role: MicroserviceRole) {
        this.formGroup = new UntypedFormGroup({
            description: new UntypedFormControl(role.description),
            default: new UntypedFormControl(role.default),
            type: new UntypedFormControl(role.type, Validators.required),
        });
    }

    /**
     * Sets values inserted to form to microservice-registration role object
     * @param role role to be filled from inserted form values
     */
    setValuesToRole(role: MicroserviceRole): void {
        role.description = this.formGroup.get('description').value;
        role.default = this.formGroup.get('default').value;
        role.type = this.formGroup.get('type').value;
    }
}
