import {CommonModule} from '@angular/common';
import {NgModule} from '@angular/core';
import {CheatingDetectionOverviewRoutingModule} from './training-instance-cheating-detection-routing.module';
import {CheatingDetectionOverviewComponent} from "@crczp/training-agenda/instance-cheating-detection";

@NgModule({
    imports: [
        CommonModule,
        CheatingDetectionOverviewComponent,
        CheatingDetectionOverviewRoutingModule,
    ],
})
export class CheatingDetectionOverviewModule {
}
