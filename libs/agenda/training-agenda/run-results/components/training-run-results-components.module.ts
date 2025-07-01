import { CommonModule } from '@angular/common';
import { ModuleWithProviders, NgModule } from '@angular/core';
import { TrainingsVisualizationsOverviewLibModule, VisualizationOverviewConfig } from '@crczp/overview-visualization';
import { TrainingAgendaConfig } from '@crczp/training-agenda';
import { TrainingRunResultsMaterialModule } from './training-run-results-material.module';
import { TrainingRunResultsComponent } from './training-run-results.component';
import { TimelineModule } from '@crczp/command-visualizations/timeline';
import { MistakeModule } from '@crczp/command-visualizations/mistake';
import { MitreTechniquesOverviewService } from '../service/mitre-techniques.service';
import { MitreTechniquesOverviewConcreteService } from '../service/mitre-techniques-concrete.service';
import { TrainingRunResultsRoutingModule } from './training-run-results-routing.module';
import { CommandAnalysisWrapperComponent } from './command-analysis-wrapper/command-analysis-wrapper.component';
import { CommandTimelineWrapperComponent } from './command-timeline-wrapper/command-timeline-wrapper.component';
import { ScoreDevelopmentWrapperComponent } from './score-development-wrapper/score-development-wrapper.component';

/**
 * Module containing components for trainees results in training
 */
@NgModule({
    imports: [
        CommonModule,
        TrainingRunResultsMaterialModule,
        TrainingsVisualizationsOverviewLibModule,
        TimelineModule,
        MistakeModule,
        TrainingRunResultsRoutingModule,
    ],
    declarations: [
        TrainingRunResultsComponent,
        ScoreDevelopmentWrapperComponent,
        CommandTimelineWrapperComponent,
        CommandAnalysisWrapperComponent,
    ],
    providers: [{ provide: MitreTechniquesOverviewService, useClass: MitreTechniquesOverviewConcreteService }],
})
export class TrainingRunResultsComponentsModule {
    static forRoot(config: TrainingAgendaConfig): ModuleWithProviders<TrainingRunResultsComponentsModule> {
        const visualizationConfig: VisualizationOverviewConfig = {
            trainingServiceUrl: config.visualizationConfig.trainingBasePath,
        };
        return {
            ngModule: TrainingRunResultsComponentsModule,
            providers: [
                TimelineModule.forRoot(config.visualizationConfig).providers,
                MistakeModule.forRoot(config.visualizationConfig).providers,
                {
                    provide: VisualizationOverviewConfig,
                    useValue: visualizationConfig,
                },
                { provide: TrainingAgendaConfig, useValue: config },
            ],
        };
    }
}
