import {NgModule} from '@angular/core';
import {CommonModule} from '@angular/common';
import {AdaptiveInstanceResultsRoutingModule} from './adaptive-instance-results-routing.module';
import {AdaptiveInstanceResultsComponent} from "@crczp/training-agenda/adaptive-instance-results";

@NgModule({
    imports: [
        CommonModule,
        AdaptiveInstanceResultsComponent,
        AdaptiveInstanceResultsRoutingModule,
    ],
})
export class AdaptiveInstanceResultsModule {
}
