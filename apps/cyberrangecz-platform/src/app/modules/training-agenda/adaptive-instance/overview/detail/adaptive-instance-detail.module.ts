import {NgModule} from '@angular/core';
import {AdaptiveInstanceDetailRoutingModule} from './adaptive-instance-detail-routing.module';
import {AdaptiveInstanceDetailComponentsModule} from "@crczp/training-agenda/instance-detail";

@NgModule({
    imports: [
        AdaptiveInstanceDetailComponentsModule,
        AdaptiveInstanceDetailRoutingModule,
    ],
})
export class AdaptiveInstanceDetailModule {
}
