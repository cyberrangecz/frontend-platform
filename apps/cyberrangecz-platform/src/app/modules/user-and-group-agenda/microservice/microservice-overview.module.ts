import {CommonModule} from '@angular/common';
import {NgModule} from '@angular/core';
import {UserAndGroupApiModule} from '@crczp/user-and-group-api';
import {UserAndGroupSharedProvidersModule} from '../user-and-group-shared-providers.module';
import {MicroserviceOverviewRoutingModule} from './microservice-overview-routing.module';
import {MicroserviceOverviewComponent} from "@crczp/user-and-group-agenda/microservice-overview";

@NgModule({
    imports: [
        CommonModule,
        UserAndGroupSharedProvidersModule,
        MicroserviceOverviewRoutingModule,
        MicroserviceOverviewComponent,
        UserAndGroupApiModule,
    ],
})
export class MicroserviceOverviewModule {
}
