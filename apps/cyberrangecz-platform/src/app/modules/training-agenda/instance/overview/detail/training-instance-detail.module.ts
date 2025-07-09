import {NgModule} from '@angular/core';
import {TrainingInstanceDetailRoutingModule} from './training-instance-detail-routing.module';
import {TrainingInstanceDetailComponentsModule} from "@crczp/training-agenda/instance-detail";

@NgModule({
    imports: [
        TrainingInstanceDetailComponentsModule,
        TrainingInstanceDetailRoutingModule,
    ],
})
export class TrainingInstanceDetailModule {
}
