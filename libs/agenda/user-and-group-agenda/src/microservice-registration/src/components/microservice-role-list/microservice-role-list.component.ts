import { ChangeDetectionStrategy, Component, EventEmitter, Output } from '@angular/core';
import { MicroserviceRole } from '@crczp/user-and-group-model';
import { MicroserviceRoleItem } from '../../model/microservice-role-item';
import { MicroserviceRolesState } from '../../model/microservice-roles-state';
import { MicroserviceRoleComponent } from './microservice-role/microservice-role.component';
import { MatButton } from '@angular/material/button';

/**
 * Class containing list of microservice-registration roles
 */
@Component({
    selector: 'crczp-microservice-role-list',
    templateUrl: './microservice-role-list.component.html',
    styleUrls: ['./microservice-role-list.component.css'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        MicroserviceRoleComponent,
        MatButton
    ]
})
export class MicroserviceRoleListComponent {
    /**
     * Roles of microservice-registration
     */
    roles: MicroserviceRole[] = [];

    /**
     * True if roles form is valid, false otherwise
     */
    rolesFormValidity = true;

    /**
     * List of validity of individual roles
     */
    rolesValidity: boolean[] = [];

    /**
     * Emits state of microservice-registration roles
     */
    @Output() microserviceRoles: EventEmitter<MicroserviceRolesState> = new EventEmitter();

    /**
     * Adds new microservice-registration role
     */
    addRole(): void {
        this.roles.push(this.createRole());
        this.microserviceRoles.emit({
            roles: this.roles,
            validity: false,
            isAdded: true,
        });
    }

    /**
     * Deletes role on given index
     * @param index index of a role to be deleted
     */
    deleteRole(index: number): void {
        this.roles.splice(index, 1);
        this.microserviceRoles.emit({
            roles: this.roles,
            validity: this.rolesFormValidity,
            isRemoved: true,
            roleIndex: index,
        });
    }

    /**
     * Handles role change by changing internal component state and emits change event
     * @param event event containing data about role change
     * @param index index of changed role
     */
    onRoleChange(event: MicroserviceRoleItem, index: number): void {
        this.roles[index] = event.role;
        this.rolesFormValidity = this.updateValidity(event.valid, index);
        this.microserviceRoles.emit({
            roles: this.roles,
            validity: this.rolesFormValidity,
            roleIndex: index,
        });
    }

    private updateValidity(isUpdatedValid: boolean, index: number): boolean {
        this.rolesValidity[index] = isUpdatedValid;
        return this.rolesValidity.every((roleValidity) => roleValidity);
    }

    private createRole(): MicroserviceRole {
        const role = new MicroserviceRole();
        role.default = false;
        role.description = '';
        role.type = '';
        return role;
    }
}
