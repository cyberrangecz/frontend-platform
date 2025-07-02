import {ModuleWithProviders, NgModule, Optional, SkipSelf} from '@angular/core';
import {CommonModule} from '@angular/common';
import {FormsModule} from '@angular/forms';
import {MatTableModule} from '@angular/material/table';
import {MatButtonModule} from '@angular/material/button';
import {MatCheckboxModule} from '@angular/material/checkbox';
import {MatSortModule} from '@angular/material/sort';
import {VisualizationOverviewConfig} from './config/trainings-visualizations-overview-lib';
import {CdkColumnDef, CdkHeaderCellDef} from '@angular/cdk/table';
import {ConfigService} from './config/config.service';
import {TimelineComponent} from './components/agenda/timeline/timeline.component';
import {ClusteringComponent} from './components/agenda/clustering/clustering.component';
import {FinalComponent} from './components/agenda/clustering/final/final.component';
import {LevelsComponent} from './components/agenda/clustering/levels/levels.component';
import {LineComponent} from './components/agenda/timeline/line/line.component';
import {FiltersComponent} from './components/agenda/filters/filters.component';
import {TableComponent} from './components/agenda/table/table.component';
import {ClusteringService} from './components/agenda/clustering/shared/service/clustering.service';
import {ClusteringApiService} from './components/api/clustering/clustering-api.service';
import {TableApiService} from './components/api/table/table-api.service';
import {TableDataService} from './components/agenda/table/service/table-data.service';
import {TimelineService} from './components/agenda/timeline/service/timeline.service';
import {TimelineApiService} from './components/api/timeline/timeline-api.service';
import {D3Service} from '../common/d3-service/d3-service';

@NgModule({
    imports: [CommonModule, FormsModule, MatTableModule, MatButtonModule, MatCheckboxModule, MatSortModule],
    declarations: [
        LineComponent,
        TimelineComponent,
        ClusteringComponent,
        FinalComponent,
        LevelsComponent,
        TableComponent,
        FiltersComponent
    ],
    exports: [
        TimelineComponent,
        ClusteringComponent,
        TableComponent,
        FiltersComponent,
        FinalComponent,
        LevelsComponent,
        LineComponent
    ],
    providers: [
        D3Service,
        ConfigService,
        CdkColumnDef,
        CdkHeaderCellDef,
        ClusteringService,
        ClusteringApiService,
        TableDataService,
        TableApiService,
        TimelineService,
        TimelineApiService
    ]
})
export class TrainingsVisualizationsOverviewLibModule {
    constructor(@Optional() @SkipSelf() parentModule: TrainingsVisualizationsOverviewLibModule) {
        if (parentModule) {
            throw new Error(
                'TrainingsVisualizationsOverviewLibModule is already loaded. Import it in the main module only'
            );
        }
    }

    static forRoot(config: VisualizationOverviewConfig): ModuleWithProviders<TrainingsVisualizationsOverviewLibModule> {
        return {
            ngModule: TrainingsVisualizationsOverviewLibModule,
            providers: [{provide: VisualizationOverviewConfig, useValue: config}]
        };
    }
}
