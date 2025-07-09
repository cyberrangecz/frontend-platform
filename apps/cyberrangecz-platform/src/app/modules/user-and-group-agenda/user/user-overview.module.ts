import {CommonModule} from '@angular/common';
import {NgModule} from '@angular/core';
import {UserAndGroupApiModule} from '@crczp/user-and-group-api';
import {UserAndGroupSharedProvidersModule} from '../user-and-group-shared-providers.module';
import {UserOverviewRoutingModule} from './user-overview-routing.module';
import {UserOverviewComponent} from "@crczp/user-and-group-agenda/user-overview";

@NgModule({
    imports: [
        CommonModule,
        UserAndGroupSharedProvidersModule,
        UserOverviewRoutingModule,
        UserOverviewComponent,
        UserAndGroupApiModule,
    ],
})
export class UserOverviewModule {
}
