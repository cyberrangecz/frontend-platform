import { CommonModule } from '@angular/common';
import { inject, NgModule } from '@angular/core';
import { UserApi } from './api/user-api.service';
import { GroupApi } from './api/group-api.service';
import { RoleApi } from './api/role-api.service';
import { MicroserviceApi } from './api/microservice-api.service';

@NgModule({
    imports: [CommonModule],
    providers: [UserApi, GroupApi, MicroserviceApi, RoleApi],
})
export class UserAndGroupApiModule {
    constructor() {
        const parentModule = inject(UserAndGroupApiModule, {
            optional: true,
            skipSelf: true,
        });

        if (parentModule) {
            throw new Error(
                'UserAndGroupApiModule is already loaded. Import it only once in single module hierarchy.',
            );
        }
    }
}
