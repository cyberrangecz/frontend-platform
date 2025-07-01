import { CommonModule } from '@angular/common';
import { ModuleWithProviders, NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { SentinelPipesModule } from '@sentinel/common/pipes';
import { SentinelControlsComponent } from '@sentinel/components/controls';
import { SentinelTableModule } from '@sentinel/components/table';
import { TrainingAgendaConfig } from '@crczp/training-agenda';
import { TrainingRunConcreteService } from '../services/runs/training-run-concrete.service';
import { TrainingRunService } from '../services/runs/training-run.service';
import { TrainingRunOverviewComponent } from './training-run-overview/training-run-overview.component';
import { TrainingInstanceSummaryMaterialModule } from './training-instance-runs-material.module';
import { TrainingInstanceRunsComponent } from './training-instance-runs.component';

/**
 * Components and providers for training instance summaries.
 */
@NgModule({
    imports: [
        CommonModule,
        FormsModule,
        SentinelPipesModule,
        RouterModule,
        TrainingInstanceSummaryMaterialModule,
        SentinelTableModule,
        SentinelControlsComponent,
    ],
    declarations: [TrainingInstanceRunsComponent, TrainingRunOverviewComponent],
    providers: [{ provide: TrainingRunService, useClass: TrainingRunConcreteService }],
})
export class TrainingInstanceRunsComponentsModule {
    static forRoot(config: TrainingAgendaConfig): ModuleWithProviders<TrainingInstanceRunsComponentsModule> {
        return {
            ngModule: TrainingInstanceRunsComponentsModule,
            providers: [{ provide: TrainingAgendaConfig, useValue: config }],
        };
    }
}
