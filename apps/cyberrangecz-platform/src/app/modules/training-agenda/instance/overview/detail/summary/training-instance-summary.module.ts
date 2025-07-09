import {CommonModule} from '@angular/common';
import {NgModule} from '@angular/core';
import {TrainingInstanceSummaryRoutingModule} from './training-instance-summary-routing.module';
import {TrainingInstanceSummaryComponent} from "@crczp/training-agenda/instance-summary";

@NgModule({
    imports: [
        CommonModule,
        TrainingInstanceSummaryComponent,
        TrainingInstanceSummaryRoutingModule,
    ],
})
export class TrainingInstanceSummaryModule {
}
