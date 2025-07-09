import {CommonModule} from '@angular/common';
import {NgModule} from '@angular/core';
import {TrainingApiModule} from '@crczp/training-api';
import {TrainingAgendaSharedProvidersModule} from '../../training-agenda-shared-providers.module';
import {TrainingRunOverviewRoutingModule} from './training-run-overview-routing.module';
import {SandboxApiModule} from '@crczp/sandbox-api';
import {TrainingRunOverviewComponent} from "@crczp/training-agenda/run-overview";

@NgModule({
    imports: [
        CommonModule,
        TrainingAgendaSharedProvidersModule,
        TrainingApiModule,
        SandboxApiModule,
        TrainingRunOverviewComponent,
        TrainingRunOverviewRoutingModule,
    ],
})
export class TrainingRunOverviewModule {
}
