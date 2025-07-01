import { CommonModule } from '@angular/common';
import { ModuleWithProviders, NgModule } from '@angular/core';
import { TrainingAgendaConfig } from '@crczp/training-agenda';
import { AdaptiveDefinitionBreadcrumbResolver, AdaptiveDefinitionResolver } from '@crczp/training-agenda/resolvers';

import { AdaptivePreviewComponent } from './adaptive-preview.component';
import { AdaptiveRunDetailComponentsModule } from '@crczp/training-agenda/adaptive-run-detail';
import { SentinelStepperModule } from '@sentinel/components/stepper';
import { PhaseComponentsPreviewModule } from './phase/phase-components-preview.module';

/**
 * Module containing components and providers for previewing training run (without allocating sandbox and backend communication)
 */
@NgModule({
    imports: [CommonModule, AdaptiveRunDetailComponentsModule, SentinelStepperModule, PhaseComponentsPreviewModule],
    declarations: [AdaptivePreviewComponent],
    providers: [AdaptiveDefinitionResolver, AdaptiveDefinitionBreadcrumbResolver],
})
export class AdaptivePreviewComponentsModule {
    static forRoot(config: TrainingAgendaConfig): ModuleWithProviders<AdaptivePreviewComponentsModule> {
        return {
            ngModule: AdaptivePreviewComponentsModule,
            providers: [{ provide: TrainingAgendaConfig, useValue: config }],
        };
    }
}
