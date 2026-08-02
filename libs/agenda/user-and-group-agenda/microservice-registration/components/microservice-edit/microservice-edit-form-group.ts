import {FormArray, FormControl, FormGroup} from '@angular/forms';
import {SentinelValidators} from '@sentinel/common';
import {Microservice, MicroserviceRole} from '@crczp/user-and-group-model';

/**
 * Position of the role that is registered as the microservice default role
 */
export const DEFAULT_ROLE_INDEX = 0;

/**
 * Reactive form of a single microservice role
 */
export type MicroserviceRoleFormGroup = FormGroup<{
    type: FormControl<string>;
    description: FormControl<string>;
}>;

/**
 * Builds the reactive form of a single role, blank unless a role is given.
 *
 * @param role Role whose values seed the form.
 * @returns {MicroserviceRoleFormGroup} Form of the given role.
 */
function createRoleFormGroup(role?: MicroserviceRole): MicroserviceRoleFormGroup {
    return new FormGroup({
        type: new FormControl(role?.type ?? '', {nonNullable: true, validators: SentinelValidators.noWhitespace}),
        description: new FormControl(role?.description ?? '', {nonNullable: true}),
    });
}

/**
 * Form of the microservice registration. The role at {@link DEFAULT_ROLE_INDEX} always exists
 * and is the one registered as default, so a microservice can neither lose its roles entirely
 * nor end up without a default one.
 */
export class MicroserviceEditFormGroup {
    readonly formGroup: FormGroup<{
        name: FormControl<string>;
        endpoint: FormControl<string>;
        roles: FormArray<MicroserviceRoleFormGroup>;
    }>;

    constructor(microservice: Microservice) {
        const [defaultRole, ...additionalRoles] = microservice.roles;
        this.formGroup = new FormGroup({
            name: new FormControl(microservice.name, {nonNullable: true, validators: SentinelValidators.noWhitespace}),
            endpoint: new FormControl(microservice.endpoint, {
                nonNullable: true,
                validators: SentinelValidators.noWhitespace,
            }),
            roles: new FormArray([
                createRoleFormGroup(defaultRole),
                ...additionalRoles.map((role) => createRoleFormGroup(role)),
            ]),
        });
    }

    get roles(): FormArray<MicroserviceRoleFormGroup> {
        return this.formGroup.controls.roles;
    }

    /**
     * Appends a blank role to the form
     */
    addRole(): void {
        this.roles.push(createRoleFormGroup());
    }

    /**
     * Removes the role on the given index, refusing the default role
     * @param index index of a role to be removed
     */
    removeRole(index: number): void {
        if (index !== DEFAULT_ROLE_INDEX) {
            this.roles.removeAt(index);
        }
    }

    /**
     * Builds the microservice described by the current form values.
     *
     * @returns {Microservice} Microservice carrying the entered values, its validity, and the
     * default flag set on the role at {@link DEFAULT_ROLE_INDEX}.
     */
    toMicroservice(): Microservice {
        const {name, endpoint, roles} = this.formGroup.getRawValue();
        const microservice = new Microservice(
            name,
            endpoint,
            roles.map(
                ({type, description}, index) => new MicroserviceRole(type, description, index === DEFAULT_ROLE_INDEX),
            ),
        );
        microservice.valid = this.formGroup.valid;
        return microservice;
    }
}
