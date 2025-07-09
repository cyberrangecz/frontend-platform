import {NgModule} from '@angular/core';
import {CommonModule} from '@angular/common';
import {AdaptiveInstanceSummaryRoutingModule} from './adaptive-instance-summary-routing.module';
import {AdaptiveInstanceSummaryComponent} from "@crczp/training-agenda/adaptive-instance-summary";

@NgModule({
    imports: [
        CommonModule,
        AdaptiveInstanceSummaryComponent,
        AdaptiveInstanceSummaryRoutingModule,
    ],
})
export class AdaptiveInstanceSummaryModule {
}
