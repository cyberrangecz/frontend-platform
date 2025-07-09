import {CommonModule} from '@angular/common';
import {NgModule} from '@angular/core';
import {TrainingRunDetailRoutingModule} from './training-run-detail-routing.module';
import {TrainingRunDetailComponent} from "@crczp/training-agenda/run-detail";

@NgModule({
    imports: [
        CommonModule,
        TrainingRunDetailComponent,
        TrainingRunDetailRoutingModule,
    ],
})
export class TrainingRunDetailModule {
}
