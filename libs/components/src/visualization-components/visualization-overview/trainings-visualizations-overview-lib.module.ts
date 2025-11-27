import { inject, NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatSortModule } from '@angular/material/sort';
import { CdkColumnDef, CdkHeaderCellDef } from '@angular/cdk/table';
import { TimelineComponent } from './components/agenda/timeline/timeline.component';
import { ClusteringComponent } from './components/agenda/clustering/clustering.component';
import { FinalComponent } from './components/agenda/clustering/final/final.component';
import { LineComponent } from './components/agenda/timeline/line/line.component';
import { TableComponent } from './components/agenda/table/table.component';
import { ClusteringService } from './components/agenda/clustering/shared/service/clustering.service';
import { ClusteringApiService } from './components/api/clustering/clustering-api.service';
import { TableApiService } from './components/api/table/table-api.service';
import { TableDataService } from './components/agenda/table/service/table-data.service';
import { TimelineService } from './components/agenda/timeline/service/timeline.service';
import { TimelineApiService } from './components/api/timeline/timeline-api.service';
import { D3Service } from '../common/d3-service/d3-service';
import { LevelsComponent } from './components/agenda/clustering/levels/levels.component';
import { FiltersComponent } from './components/agenda/filters/filters.component';

@NgModule({
    imports: [
        CommonModule,
        FormsModule,
        MatTableModule,
        MatButtonModule,
        MatCheckboxModule,
        MatSortModule,
        LevelsComponent,
        FiltersComponent,
    ],
    declarations: [
        LineComponent,
        TimelineComponent,
        ClusteringComponent,
        FinalComponent,
        TableComponent,
    ],
    exports: [
        TimelineComponent,
        ClusteringComponent,
        TableComponent,
        FinalComponent,
        LineComponent,
    ],
    providers: [
        D3Service,
        CdkColumnDef,
        CdkHeaderCellDef,
        ClusteringService,
        ClusteringApiService,
        TableDataService,
        TableApiService,
        TimelineService,
        TimelineApiService,
    ],
})
export class TrainingsVisualizationsOverviewLibModule {
    constructor() {
        const parentModule = inject(TrainingsVisualizationsOverviewLibModule, {
            optional: true,
            skipSelf: true,
        });

        if (parentModule) {
            throw new Error(
                'TrainingsVisualizationsOverviewLibModule is already loaded. Import it in the main module only'
            );
        }
    }
}
