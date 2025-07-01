import { CommonModule } from '@angular/common';
import { ModuleWithProviders, NgModule } from '@angular/core';
import { TrainingAgendaConfig } from '@crczp/training-agenda';
import { TrainingDefinitionBreadcrumbResolver, TrainingDefinitionResolver } from '@crczp/training-agenda/resolvers';
import { TrainingRunDetailComponentsModule } from '@crczp/training-agenda/run-detail';
import { TrainingPreviewComponent } from './training-preview.component';
import { SentinelStepperModule } from '@sentinel/components/stepper';
import { LevelComponentsPreviewModule } from './level/level-components-preview.module';

/**
 * Module containing components and providers for previewing training run (without allocating sandbox and backend communication)
 */
@NgModule({
    imports: [CommonModule, TrainingRunDetailComponentsModule, SentinelStepperModule, LevelComponentsPreviewModule],
    declarations: [TrainingPreviewComponent],
    providers: [TrainingDefinitionResolver, TrainingDefinitionBreadcrumbResolver],
})
export class TrainingPreviewComponentsModule {
    static forRoot(config: TrainingAgendaConfig): ModuleWithProviders<TrainingPreviewComponentsModule> {
        return {
            ngModule: TrainingPreviewComponentsModule,
            providers: [{ provide: TrainingAgendaConfig, useValue: config }],
        };
    }
}
