import {CommonModule} from '@angular/common';
import {NgModule} from '@angular/core';
import {UserAndGroupApiModule} from '@crczp/user-and-group-api';
import {UserAndGroupSharedProvidersModule} from '../user-and-group-shared-providers.module';
import {GroupOverviewRoutingModule} from './group-overview-routing.module';
import {GroupOverviewComponent} from "@crczp/user-and-group-agenda/group-overview";

@NgModule({
    imports: [
        CommonModule,
        UserAndGroupSharedProvidersModule,
        GroupOverviewRoutingModule,
        GroupOverviewComponent,
        UserAndGroupApiModule,
    ],
})
export class GroupOverviewModule {
}
