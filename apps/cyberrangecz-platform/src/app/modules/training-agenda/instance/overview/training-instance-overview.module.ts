import {CommonModule} from '@angular/common';
import {NgModule} from '@angular/core';
import {SandboxApiModule} from '@crczp/sandbox-api';
import {TrainingApiModule} from '@crczp/training-api';
import {TrainingAgendaSharedProvidersModule} from '../../training-agenda-shared-providers.module';
import {TrainingInstanceOverviewRoutingModule} from './training-instance-overview-routing.module';
import {TrainingInstanceOverviewComponent} from "@crczp/training-agenda/instance-overview";

@NgModule({
    imports: [
        CommonModule,
        TrainingAgendaSharedProvidersModule,
        TrainingApiModule,
        SandboxApiModule,
        TrainingInstanceOverviewRoutingModule,
        TrainingInstanceOverviewComponent,
    ],
})
export class TrainingInstanceOverviewModule {
}
