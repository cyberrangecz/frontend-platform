import {CommonModule} from '@angular/common';
import {NgModule} from '@angular/core';
import {TrainingInstanceEditOverviewRoutingModule} from './training-instance-edit-overview-routing.module';
import {TrainingInstanceEditOverviewComponent} from "@crczp/training-agenda/instance-edit";

@NgModule({
    imports: [
        CommonModule,
        TrainingInstanceEditOverviewRoutingModule,
        TrainingInstanceEditOverviewComponent,
    ],
})
export class TrainingInstanceEditOverviewModule {
}
