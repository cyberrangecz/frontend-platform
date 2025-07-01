import { CommonModule } from '@angular/common';
import { ModuleWithProviders, NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { SentinelPipesModule } from '@sentinel/common/pipes';
import { SentinelControlsComponent } from '@sentinel/components/controls';
import { SentinelTableModule } from '@sentinel/components/table';
import { TrainingAgendaConfig } from '@crczp/training-agenda';
import { AdaptiveRunOverviewComponent } from './training-run-overview/adaptive-run-overview.component';
import { AdaptiveInstanceSummaryMaterialModule } from './adaptive-instance-runs-material.module';
import { AdaptiveInstanceRunsComponent } from './adaptive-instance-runs.component';
import { AdaptiveRunConcreteService } from '../services/runs/adaptive-run-concrete.service';
import { AdaptiveRunService } from '../services/runs/adaptive-run.service';

/**
 * Components and providers for training instance summaries.
 */
@NgModule({
    imports: [
        CommonModule,
        FormsModule,
        SentinelPipesModule,
        RouterModule,
        AdaptiveInstanceSummaryMaterialModule,
        SentinelTableModule,
        SentinelControlsComponent,
    ],
    declarations: [AdaptiveInstanceRunsComponent, AdaptiveRunOverviewComponent],
    providers: [{ provide: AdaptiveRunService, useClass: AdaptiveRunConcreteService }],
})
export class AdaptiveInstanceRunsComponentsModule {
    static forRoot(config: TrainingAgendaConfig): ModuleWithProviders<AdaptiveInstanceRunsComponentsModule> {
        return {
            ngModule: AdaptiveInstanceRunsComponentsModule,
            providers: [{ provide: TrainingAgendaConfig, useValue: config }],
        };
    }
}
