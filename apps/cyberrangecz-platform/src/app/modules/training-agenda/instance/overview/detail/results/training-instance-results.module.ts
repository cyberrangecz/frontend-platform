import {CommonModule} from '@angular/common';
import {NgModule} from '@angular/core';
import {TrainingInstanceResultsRoutingModule} from './training-instance-results-routing.module';
import {TrainingInstanceResultsComponent} from "@crczp/training-agenda/instance-results";

@NgModule({
    imports: [
        CommonModule,
        TrainingInstanceResultsComponent,
        TrainingInstanceResultsRoutingModule,
    ],
})
export class TrainingInstanceResultsModule {
}
