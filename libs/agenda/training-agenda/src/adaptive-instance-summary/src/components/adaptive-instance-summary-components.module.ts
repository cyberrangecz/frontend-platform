import { CommonModule } from '@angular/common';
import { ModuleWithProviders, NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { SentinelPipesModule } from '@sentinel/common/pipes';
import { SentinelControlsComponent } from '@sentinel/components/controls';
import { SentinelTableModule } from '@sentinel/components/table';
import { TrainingAgendaConfig } from '../../../index';
import {
    AdaptiveInstanceSummaryConcreteService
} from '../services/state/summary/adaptive-instance-summary-concrete.service';
import { AdaptiveInstanceSummaryService } from '../services/state/summary/adaptive-instance-summary.service';
import { AdaptiveInstanceInfoComponent } from './info/adaptive-instance-info.component';
import { AdaptiveInstanceSummaryMaterialModule } from './adaptive-instance-summary-material.module';
import { AdaptiveInstanceSummaryComponent } from './adaptive-instance-summary.component';
import { AdaptiveRunService } from '../services/state/runs/adaptive-run.service';
import { AdaptiveRunConcreteService } from '../services/state/runs/adaptive-run-concrete.service';
import { AdaptiveInstanceRunsComponent } from './runs/adaptive-instance-runs.component';

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
        SentinelTableModule,
    ],
    declarations: [AdaptiveInstanceSummaryComponent, AdaptiveInstanceInfoComponent, AdaptiveInstanceRunsComponent],
    providers: [
        { provide: AdaptiveInstanceSummaryService, useClass: AdaptiveInstanceSummaryConcreteService },
        { provide: AdaptiveRunService, useClass: AdaptiveRunConcreteService },
    ],
})
export class AdaptiveInstanceSummaryComponentsModule {
    static forRoot(config: TrainingAgendaConfig): ModuleWithProviders<AdaptiveInstanceSummaryComponentsModule> {
        return {
            ngModule: AdaptiveInstanceSummaryComponentsModule,
            providers: [{ provide: TrainingAgendaConfig, useValue: config }],
        };
    }
}
