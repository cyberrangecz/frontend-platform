import { ModuleWithProviders, NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReferenceGraphComponent } from './reference-graph.component';
import { ReferenceGraphService } from './service/reference-graph.service';
import { ReferenceGraphDefaultApiService } from './api/reference-graph-default-api.service';
import { MatButtonModule } from '@angular/material/button';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { ReferenceGraphApiService } from './api/reference-graph-api.service';
import { CommandVisualizationConfig } from '../../common/config/command-visualization-config';

@NgModule({
    declarations: [ReferenceGraphComponent],
    exports: [ReferenceGraphComponent],
    imports: [CommonModule, MatButtonModule, MatListModule, MatIconModule],
    providers: [
        ReferenceGraphService,
        { provide: ReferenceGraphApiService, useClass: ReferenceGraphDefaultApiService },
    ],
})
export class ReferenceGraphModule {
    static forRoot(config: CommandVisualizationConfig): ModuleWithProviders<ReferenceGraphModule> {
        return {
            ngModule: ReferenceGraphModule,
            providers: [{ provide: CommandVisualizationConfig, useValue: config }],
        };
    }
}
