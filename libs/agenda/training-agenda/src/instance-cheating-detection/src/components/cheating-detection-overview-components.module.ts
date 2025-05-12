import { CommonModule } from '@angular/common';
import { ModuleWithProviders, NgModule } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { SentinelPipesModule } from '@sentinel/common/pipes';
import { SentinelControlsComponent } from '@sentinel/components/controls';
import { SentinelTableModule } from '@sentinel/components/table';
import { TrainingAgendaConfig, TrainingDefaultNavigator, TrainingNavigator } from '../../../index';
import { DefaultPaginationService, TrainingAgendaContext } from '@crczp/training-agenda/internal';
import { CheatingDetectionConcreteService } from '../services/cheating-detection-concrete.service';
import { CheatingDetectionService } from '../services/cheating-detection.service';
import { CheatingDetectionOverviewMaterialModule } from './cheating-detection-overview-material.module';
import { CheatingDetectionOverviewComponent } from './cheating-detection-overview.component';
import { StageOverviewComponent } from './stage-overview/stage-overview.component';

@NgModule({
    imports: [
        CommonModule,
        FormsModule,
        SentinelPipesModule,
        CheatingDetectionOverviewMaterialModule,
        ReactiveFormsModule,
        SentinelTableModule,
        SentinelControlsComponent,
    ],
    declarations: [CheatingDetectionOverviewComponent, StageOverviewComponent],
    providers: [
        DefaultPaginationService,
        TrainingAgendaContext,
        { provide: TrainingNavigator, useClass: TrainingDefaultNavigator },
        { provide: CheatingDetectionService, useClass: CheatingDetectionConcreteService },
    ],
})
export class CheatingDetectionOverviewComponentsModule {
    static forRoot(config: TrainingAgendaConfig): ModuleWithProviders<CheatingDetectionOverviewComponentsModule> {
        return {
            ngModule: CheatingDetectionOverviewComponentsModule,
            providers: [{ provide: TrainingAgendaConfig, useValue: config }],
        };
    }
}
