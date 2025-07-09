import {NgModule} from '@angular/core';
import {CommonModule} from '@angular/common';
import {AdaptiveInstanceEditOverviewRoutingModule} from './adaptive-instance-edit-overview-routing.module';
import {AdaptiveInstanceEditOverviewComponent} from "@crczp/training-agenda/adaptive-instance-edit";

@NgModule({
    imports: [
        CommonModule,
        AdaptiveInstanceEditOverviewRoutingModule,
        AdaptiveInstanceEditOverviewComponent,
    ],
})
export class AdaptiveInstanceEditOverviewModule {
}
