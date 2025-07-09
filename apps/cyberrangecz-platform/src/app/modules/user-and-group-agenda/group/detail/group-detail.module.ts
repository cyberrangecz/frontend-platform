import {NgModule} from '@angular/core';
import {GroupDetailRoutingModule} from './group-detail-routing.module';
import {CommonModule} from '@angular/common';
import {UserAndGroupSharedProvidersModule} from '../../user-and-group-shared-providers.module';
import {GroupDetailComponent} from "@crczp/user-and-group-agenda/group-detail";

@NgModule({
    imports: [
        CommonModule,
        UserAndGroupSharedProvidersModule,
        GroupDetailRoutingModule,
        GroupDetailComponent,
    ],
})
export class GroupDetailModule {
}
