import {CommonModule} from '@angular/common';
import {NgModule} from '@angular/core';
import {AdaptiveInstanceRunsRoutingModule} from './adaptive-instance-runs-routing.module';
import {AdaptiveInstanceRunsComponent} from "@crczp/training-agenda/adaptive-instance-runs";

@NgModule({
    imports: [
        CommonModule,
        AdaptiveInstanceRunsComponent,
        AdaptiveInstanceRunsRoutingModule,
    ],
})
export class AdaptiveInstanceRunsModule {
}
