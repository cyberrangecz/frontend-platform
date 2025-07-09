import {CommonModule} from '@angular/common';
import {NgModule} from '@angular/core';
import {AdaptiveRunResultsRoutingModule} from './adaptive-run-results-routing.module';
import {AdaptiveRunResultsComponent} from "@crczp/training-agenda/adaptive-run-results";

@NgModule({
    imports: [
        CommonModule,
        AdaptiveRunResultsComponent,
        AdaptiveRunResultsRoutingModule,
    ],
})
export class AdaptiveRunResultsModule {
}
