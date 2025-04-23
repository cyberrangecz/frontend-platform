import { ModuleWithProviders, NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TraineeGraphComponent } from './trainee-graph.component';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { TraineeGraphService } from './service/trainee-graph.service';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { TraineeGraphApiService } from './api/trainee-graph-api.service';
import { CommandVisualizationConfig, VisualizationConfigService } from '@crczp/command-visualizations/internal';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { SentinelResourceSelectorModule } from '@sentinel/components/resource-selector';

@NgModule({
    declarations: [TraineeGraphComponent],
    imports: [
        CommonModule,
        ReactiveFormsModule,
        MatButtonModule,
        FormsModule,
        MatSelectModule,
        MatIconModule,
        MatListModule,
        MatProgressSpinnerModule,
        SentinelResourceSelectorModule,
    ],
    exports: [TraineeGraphComponent],
    providers: [TraineeGraphService, TraineeGraphApiService, VisualizationConfigService],
})
export class TraineeGraphModule {
    static forRoot(config: CommandVisualizationConfig): ModuleWithProviders<TraineeGraphModule> {
        return {
            ngModule: TraineeGraphModule,
            providers: [{ provide: CommandVisualizationConfig, useValue: config }],
        };
    }
}
