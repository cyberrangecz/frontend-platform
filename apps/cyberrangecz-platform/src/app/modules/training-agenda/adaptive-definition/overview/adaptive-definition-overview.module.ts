import {NgModule} from '@angular/core';
import {CommonModule} from '@angular/common';
import {TrainingAgendaSharedProvidersModule} from '../../training-agenda-shared-providers.module';
import {AdaptiveDefinitionOverviewRoutingModule} from './adaptive-definition-overview-routing.module';
import {TrainingApiModule} from '@crczp/training-api';
import {SandboxApiModule} from '@crczp/sandbox-api';

@NgModule({
    imports: [
        CommonModule,
        TrainingAgendaSharedProvidersModule,
        AdaptiveDefinitionOverviewRoutingModule,
        SandboxApiModule,
        TrainingApiModule,
    ],
})
export class AdaptiveDefinitionOverviewModule {
}
