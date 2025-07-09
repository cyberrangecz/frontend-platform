import {CommonModule} from '@angular/common';
import {NgModule} from '@angular/core';
import {TrainingInstanceProgressRoutingModule} from './training-instance-progress-routing.module';
import {TrainingInstanceProgressComponent} from "@crczp/training-agenda/instance-progress";

@NgModule({
    imports: [
        CommonModule,
        TrainingInstanceProgressComponent,
        TrainingInstanceProgressRoutingModule,
    ],
})
export class TrainingInstanceProgressModule {
}
