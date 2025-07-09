import {CommonModule} from '@angular/common';
import {NgModule} from '@angular/core';
import {CheatingDetectionEditRoutingModule} from './cheating-detection-create-routing.module';
import {CheatingDetectionEditComponent} from "@crczp/training-agenda/instance-cheating-detection-edit";

@NgModule({
    imports: [
        CommonModule,
        CheatingDetectionEditComponent,
        CheatingDetectionEditRoutingModule,
    ],
})
export class CheatingDetectionCreateOverviewModule {
}
