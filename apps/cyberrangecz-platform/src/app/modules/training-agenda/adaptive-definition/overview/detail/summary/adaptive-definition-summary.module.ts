import {NgModule} from '@angular/core';
import {CommonModule} from '@angular/common';
import {AdaptiveDefinitionSummaryRoutingModule} from './adaptive-definition-summary-routing.module';
import {AdaptiveDefinitionSummaryComponent} from "@crczp/training-agenda/adaptive-definition-summary";

@NgModule({
    imports: [
        CommonModule,
        AdaptiveDefinitionSummaryComponent,
        AdaptiveDefinitionSummaryRoutingModule,
    ],
})
export class AdaptiveDefinitionSummaryModule {
}
