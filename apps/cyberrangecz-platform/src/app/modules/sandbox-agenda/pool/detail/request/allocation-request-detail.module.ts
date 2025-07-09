import {NgModule} from '@angular/core';
import {AllocationRequestDetailRoutingModule} from './allocation-request-detail-routing.module';
import {AllocationRequestDetailComponent} from "@crczp/sandbox-agenda/request-detail";

@NgModule({
    imports: [AllocationRequestDetailComponent, AllocationRequestDetailRoutingModule],
})
export class AllocationRequestDetailModule {
}
