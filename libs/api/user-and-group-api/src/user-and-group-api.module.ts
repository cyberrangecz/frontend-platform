import {CommonModule} from '@angular/common';
import {inject, NgModule} from '@angular/core';
import {GroupApi} from './api/group/group-api.service';
import {GroupDefaultApi} from './api/group/group-default-api.service';
import {MicroserviceApi} from './api/microservice/microservice-api.service';
import {MicroserviceDefaultApi} from './api/microservice/microservice-default-api.service';
import {RoleApi} from './api/role/role-api.service';
import {RoleDefaultApi} from './api/role/role-default-api.service';
import {UserApi} from './api/user/user-api.service';
import {UserDefaultApi} from './api/user/user-default-api.service';

@NgModule({
    imports: [CommonModule],
    providers: [
        {provide: UserApi, useClass: UserDefaultApi},
        {provide: GroupApi, useClass: GroupDefaultApi},
        {provide: MicroserviceApi, useClass: MicroserviceDefaultApi},
        {provide: RoleApi, useClass: RoleDefaultApi},
    ],
})
export class UserAndGroupApiModule {
    constructor() {
        const parentModule = inject(UserAndGroupApiModule, {optional: true, skipSelf: true});

        if (parentModule) {
            throw new Error('UserAndGroupApiModule is already loaded. Import it only once in single module hierarchy.');
        }
    }
}
