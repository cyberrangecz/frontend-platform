import {CommonModule} from '@angular/common';
import {NgModule} from '@angular/core';
import {TrainingRunResultsRoutingModule} from './training-run-results-routing.module';
import {TrainingRunResultsComponent} from "@crczp/training-agenda/run-results";

@NgModule({
    imports: [
        CommonModule,
        TrainingRunResultsComponent,
        TrainingRunResultsRoutingModule,
    ],
})
export class TrainingRunResultsModule {
}
