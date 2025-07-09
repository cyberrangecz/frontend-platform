import {CommonModule} from '@angular/common';
import {NgModule} from '@angular/core';
import {UserAndGroupSharedProvidersModule} from '../../user-and-group-shared-providers.module';
import {MicroserviceNewRoutingModule} from './microservice-new-routing.module';
import {MicroserviceEditComponent} from "@crczp/user-and-group-agenda/microservice-registration";

@NgModule({
    imports: [
        CommonModule,
        UserAndGroupSharedProvidersModule,
        MicroserviceNewRoutingModule,
        MicroserviceEditComponent,
    ],
})
export class MicroserviceNewModule {
}
