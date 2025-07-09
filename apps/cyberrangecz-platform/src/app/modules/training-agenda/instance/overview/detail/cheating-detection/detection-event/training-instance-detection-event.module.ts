import {CommonModule} from '@angular/common';
import {NgModule} from '@angular/core';
import {TrainingInstanceDetectionEventRoutingModule} from './training-instance-detection-event-routing.module';
import {TrainingInstanceDetectionEventComponent} from '@crczp/training-agenda/instance-detection-event';

@NgModule({
    imports: [
        CommonModule,
        TrainingInstanceDetectionEventComponent,
        TrainingInstanceDetectionEventRoutingModule,
    ],
})
export class TrainingInstanceDetectionEventModule {
}
