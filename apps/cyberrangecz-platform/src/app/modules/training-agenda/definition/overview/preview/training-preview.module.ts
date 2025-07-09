import {CommonModule} from '@angular/common';
import {NgModule} from '@angular/core';
import {TrainingPreviewRoutingModule} from './training-preview-routing.module';
import {TrainingPreviewComponent} from "@crczp/training-agenda/definition-preview";

@NgModule({
    imports: [
        CommonModule,
        TrainingPreviewComponent,
        TrainingPreviewRoutingModule,
    ],
})
export class TrainingPreviewModule {
}
