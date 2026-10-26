import {Component, Input, ChangeDetectionStrategy} from '@angular/core';
import {UserRole} from '@crczp/user-and-group-model';


@Component({
    selector: 'crczp-role-expand',
    templateUrl: './role-expand.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: []
})
export class RoleExpandComponent {
    @Input() sentinelExpandData: UserRole;
}
