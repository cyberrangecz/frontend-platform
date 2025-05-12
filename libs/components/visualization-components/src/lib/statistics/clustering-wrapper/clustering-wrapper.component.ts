import { AfterViewInit, Component, HostListener, Input, OnChanges, OnInit, SimpleChanges } from '@angular/core';
import { TrainingInstanceStatistics } from '@crczp/visualization-model';
import {
    TrainingsVisualizationsOverviewLibModule
} from '../../visualization-overview/trainings-visualizations-overview-lib.module';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';

@Component({
    selector: 'crczp-viz-statistical-clustering-wrapper',
    templateUrl: './clustering-wrapper.component.html',
    imports: [
        TrainingsVisualizationsOverviewLibModule,
        MatDividerModule,
        MatCardModule
    ],
    styleUrls: ['./clustering-wrapper.component.css']
})
export class ClusteringWrapperComponent implements AfterViewInit, OnInit, OnChanges {
    clusteringSize = { width: 650, height: 300 }; // constants as this visualization responsivity is in a bad state
    selectedIds: number[];
    @Input() trainingInstanceStatistics: TrainingInstanceStatistics[];
    @Input() selectedLevel: number;
    private readonly BOX_SIZE_PADDING = 175;

    @HostListener('window:resize', ['$event'])
    onResize(event) {
        this.resize();
    }

    ngOnInit(): void {
        this.selectedIds = [this.selectedLevel];
    }

    ngAfterViewInit(): void {
        this.resize();
    }

    ngOnChanges(changes: SimpleChanges): void {
        if (!changes['trainingInstanceStatistics'].isFirstChange()) {
            this.selectedIds = this.trainingInstanceStatistics.map((statistics) => statistics.instanceId);
        }
    }

    private resize() {
        this.clusteringSize = {
            width: document.getElementById('combinedDiv').getBoundingClientRect().width - this.BOX_SIZE_PADDING,
            height: this.clusteringSize.height
        };
    }
}
