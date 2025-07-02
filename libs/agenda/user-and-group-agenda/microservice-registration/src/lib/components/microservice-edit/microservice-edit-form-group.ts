import {UntypedFormArray, UntypedFormControl, UntypedFormGroup, Validators} from '@angular/forms';
import {Microservice} from '@crczp/user-and-group-model';

/**
 * Form control for microservice-registration state component
 */
export class MicroserviceEditFormGroup {
    formGroup: UntypedFormGroup;

    constructor(microservice: Microservice) {
        this.formGroup = new UntypedFormGroup({
            name: new UntypedFormControl(microservice.name, Validators.required),
            endpoint: new UntypedFormControl(microservice.endpoint, Validators.required),
            roles: new UntypedFormArray(
                microservice.roles.map((roles) => new UntypedFormControl(roles)),
                Validators.required,
            ),
        });
    }

    /**
     * Sets values inserted to form to microservice-registration object
     * @param microservice microservice-registration to be filled with values
     */
    setValuesToMicroservice(microservice: Microservice): void {
        microservice.name = this.formGroup.get('name').value;
        microservice.endpoint = this.formGroup.get('endpoint').value;
        microservice.roles = this.formGroup.get('roles').value;
    }
}
