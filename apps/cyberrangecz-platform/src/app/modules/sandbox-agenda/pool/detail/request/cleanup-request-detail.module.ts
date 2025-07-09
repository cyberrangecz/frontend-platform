import {NgModule} from '@angular/core';
import {CleanupRequestDetailComponent} from '@crczp/sandbox-agenda/request-detail';
import {AllocationRequestDetailRoutingModule} from './allocation-request-detail-routing.module';

@NgModule({
    imports: [CleanupRequestDetailComponent, AllocationRequestDetailRoutingModule],
})
export class CleanupRequestDetailModule {
}
