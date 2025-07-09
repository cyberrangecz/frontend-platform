import {NgModule} from '@angular/core';
import {CommonModule} from '@angular/common';
import {TrainingDefinitionSummaryRoutingModule} from './training-definition-summary-routing.module';
import {TrainingDefinitionSummaryComponent} from "@crczp/training-agenda/definition-summary";

@NgModule({
    imports: [
        CommonModule,
        TrainingDefinitionSummaryComponent,
        TrainingDefinitionSummaryRoutingModule,
    ],
})
export class TrainingDefinitionSummaryModule {
}
