import {
    afterNextRender,
    ChangeDetectionStrategy,
    Component,
    EventEmitter,
    inject,
    Injector,
    Input,
    Output,
    viewChildren,
} from '@angular/core';
import {FormArray} from '@angular/forms';
import {DEFAULT_ROLE_INDEX, MicroserviceRoleFormGroup} from '../microservice-edit/microservice-edit-form-group';
import {MicroserviceRoleComponent} from './microservice-role/microservice-role.component';
import {MatButton} from '@angular/material/button';

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
     * Forms of the microservice-registration roles
     */
    @Input({required: true}) roles: FormArray<MicroserviceRoleFormGroup>;

    /**
     * Requests a new microservice-registration role
     */
    @Output() addRole = new EventEmitter<void>();

    /**
     * Requests removal of the role on the emitted index
     */
    @Output() removeRole = new EventEmitter<number>();

    protected readonly defaultRoleIndex = DEFAULT_ROLE_INDEX;

    private readonly roleComponents = viewChildren(MicroserviceRoleComponent);
    private readonly injector = inject(Injector);

    /**
     * Requests a new role and moves focus into it once it is rendered
     */
    protected onAddRole(): void {
        this.addRole.emit();
        afterNextRender(() => {
            const rendered = this.roleComponents();
            rendered[rendered.length - 1]?.focusType();
        }, {injector: this.injector});
    }
}
