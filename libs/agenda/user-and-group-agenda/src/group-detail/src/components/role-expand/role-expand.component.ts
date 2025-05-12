import { Component, Input } from '@angular/core';
import { UserRole } from '@crczp/user-and-group-model';
import { CommonModule } from '@angular/common';

@Component({
    selector: 'crczp-role-expand',
    templateUrl: './role-expand.component.html',
    imports: [
        CommonModule
    ]
})
export class RoleExpandComponent {
    @Input() data: UserRole;
}
