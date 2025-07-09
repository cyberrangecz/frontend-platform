import {CommonModule} from '@angular/common';
import {NgModule} from '@angular/core';
import {UserAndGroupSharedProvidersModule} from '../../user-and-group-shared-providers.module';
import {GroupEditRoutingModule} from './group-edit-routing.module';
import {GroupEditComponent} from "@crczp/user-and-group-agenda/group-edit";

@NgModule({
    imports: [
        CommonModule,
        UserAndGroupSharedProvidersModule,
        GroupEditRoutingModule,
        GroupEditComponent
    ],
})
export class GroupEditModule {
}
