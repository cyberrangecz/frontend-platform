import {NgModule} from '@angular/core';
import {CommonModule} from '@angular/common';
import {TrainingAgendaSharedProvidersModule} from '../../training-agenda-shared-providers.module';
import {TrainingApiModule} from '@crczp/training-api';
import {SandboxApiModule} from '@crczp/sandbox-api';
import {AdaptiveInstanceOverviewRoutingModule} from './adaptive-instance-overview-routing.module';
import {AdaptiveInstanceOverviewComponent} from "@crczp/training-agenda/adaptive-instance-overview";

@NgModule({
    imports: [
        CommonModule,
        TrainingAgendaSharedProvidersModule,
        TrainingApiModule,
        SandboxApiModule,
        AdaptiveInstanceOverviewRoutingModule,
        AdaptiveInstanceOverviewComponent,
    ],
})
export class AdaptiveInstanceOverviewModule {
}
