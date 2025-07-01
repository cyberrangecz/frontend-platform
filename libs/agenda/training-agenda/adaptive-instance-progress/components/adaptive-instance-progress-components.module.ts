import {CommonModule} from '@angular/common';
import {ModuleWithProviders, NgModule} from '@angular/core';
import {AdaptiveInstanceProgressMaterialModule} from './adaptive-instance-progress-material.module';
import {AdaptiveInstanceProgressComponent} from './adaptive-instance-progress.component';
import {TrainingAgendaConfig} from '@crczp/training-agenda';
import {TimelineModule} from '@crczp/command-visualizations/timeline';

/**
 * Module containing components and providers for training instance progress page
 */
@NgModule({
    imports: [CommonModule, AdaptiveInstanceProgressMaterialModule, InstanceModelSimulatorModule, TimelineModule],
    declarations: [AdaptiveInstanceProgressComponent],
    providers: [],
})
export class AdaptiveInstanceProgressComponentsModule {
    static forRoot(config: TrainingAgendaConfig): ModuleWithProviders<AdaptiveInstanceProgressComponentsModule> {
        return {
            ngModule: AdaptiveInstanceProgressComponentsModule,
            providers: [
                InstanceModelSimulatorModule.forRoot(config.visualizationConfig).providers,
                TimelineModule.forRoot(config.visualizationConfig).providers,
                {provide: TrainingAgendaConfig, useValue: config},
            ],
        };
    }
}
