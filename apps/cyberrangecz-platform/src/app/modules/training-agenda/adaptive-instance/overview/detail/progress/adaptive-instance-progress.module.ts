import {CommonModule} from '@angular/common';
import {NgModule} from '@angular/core';
import {AdaptiveInstanceProgressRoutingModule} from './adaptive-instance-progress-routing.module';
import {AdaptiveInstanceProgressComponent} from "@crczp/training-agenda/adaptive-instance-progress";

@NgModule({
    imports: [
        CommonModule,
        AdaptiveInstanceProgressComponent,
        AdaptiveInstanceProgressRoutingModule,
    ],
})
export class AdaptiveInstanceProgressModule {
}
