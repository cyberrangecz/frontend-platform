import {Component, Input} from '@angular/core';
import {UserRole} from '@crczp/user-and-group-model';


@Component({
    selector: 'crczp-role-expand',
    templateUrl: './role-expand.component.html',
    imports: []
})
export class RoleExpandComponent {
    @Input() data: UserRole;
}
