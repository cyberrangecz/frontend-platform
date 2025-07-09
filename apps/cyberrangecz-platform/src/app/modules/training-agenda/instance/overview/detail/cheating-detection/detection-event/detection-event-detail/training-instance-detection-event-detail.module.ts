import {CommonModule} from '@angular/common';
import {NgModule} from '@angular/core';
import {
    TrainingInstanceDetectionEventDetailRoutingModule
} from './training-instance-detection-event-detail-routing.module';
import {TrainingInstanceDetectionEventDetailComponent} from '@crczp/training-agenda/instance-detection-event-detail';

@NgModule({
    imports: [
        CommonModule,
        TrainingInstanceDetectionEventDetailComponent,
        TrainingInstanceDetectionEventDetailRoutingModule,
    ],
})
export class TrainingInstanceDetectionEventDetailModule {
}
