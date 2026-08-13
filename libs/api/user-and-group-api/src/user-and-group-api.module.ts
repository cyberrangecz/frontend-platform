import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { UserApi } from './api/user-api.service';
import { GroupApi } from './api/group-api.service';
import { RoleApi } from './api/role-api.service';
import { MicroserviceApi } from './api/microservice-api.service';

@NgModule({
    imports: [CommonModule],
    providers: [UserApi, GroupApi, MicroserviceApi, RoleApi],
})
export class UserAndGroupApiModule {}
