import {CommonModule} from '@angular/common';
import {NgModule} from '@angular/core';
import {TrainingApiModule} from '@crczp/training-api';
import {TrainingAgendaSharedProvidersModule} from '../../training-agenda-shared-providers.module';
import {TrainingDefinitionOverviewRoutingModule} from './training-definition-overview-routing.module';
import {SandboxApiModule} from '@crczp/sandbox-api';

@NgModule({
    imports: [
        CommonModule,
        TrainingAgendaSharedProvidersModule,
        TrainingDefinitionOverviewRoutingModule,
        SandboxApiModule,
        TrainingApiModule,
    ],
})
export class TrainingDefinitionOverviewModule {
}
