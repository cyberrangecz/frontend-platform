import {CommonModule} from '@angular/common';
import {NgModule} from '@angular/core';
import {TrainingInstanceRunsRoutingModule} from './training-instance-runs-routing.module';
import {TrainingInstanceRunsComponent} from "@crczp/training-agenda/instance-runs";

@NgModule({
    imports: [
        CommonModule,
        TrainingInstanceRunsComponent,
        TrainingInstanceRunsRoutingModule,
    ],
})
export class TrainingInstanceRunsModule {
}
