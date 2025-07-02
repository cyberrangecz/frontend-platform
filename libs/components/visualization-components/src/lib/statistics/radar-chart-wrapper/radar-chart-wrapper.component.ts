import {AfterContentChecked, ApplicationRef, Component, Input, OnChanges, SimpleChanges} from '@angular/core';
import * as d3 from 'd3';
import {TrainingInstanceStatistics} from '@crczp/visualization-model';
import {MatCardModule} from '@angular/material/card';
import {ClusteringVisualizationsComponent} from '../../clustering/clustering-visualizations.component';
import {MatGridListModule} from '@angular/material/grid-list';
import {MatFormFieldModule} from '@angular/material/form-field';
import {MatDividerModule} from '@angular/material/divider';
import {MatIconModule} from '@angular/material/icon';
import {MatTooltipModule} from '@angular/material/tooltip';
import {MatButtonModule} from '@angular/material/button';
import {MatInputModule} from '@angular/material/input';

@Component({
    selector: 'crczp-radar-chart-wrapper',
    templateUrl: './radar-chart-wrapper.component.html',
    imports: [
        MatCardModule,
        ClusteringVisualizationsComponent,
        MatGridListModule,
        MatFormFieldModule,
        MatIconModule,
        MatDividerModule,
        MatTooltipModule,
        MatButtonModule,
        MatInputModule
    ],
    styleUrls: ['./radar-chart-wrapper.component.css']
})
export class RadarChartWrapperComponent implements OnChanges, AfterContentChecked {
    @Input() level;
    @Input() trainingDefinitionId: number;
    @Input() trainingInstanceStatistics: TrainingInstanceStatistics[];

    appRef;
    public numOfClusters = 5;
    public trainingInstanceIds: number[] = [];
    public cardHeight = 1500;
    public levelTitle = '';
    public readonly info =
        'The chart displays overview of trainee groups and their playing behavior. ' +
        'The small radar charts represent the groups of trainees whose playing styles were similar.';

    constructor(appRef: ApplicationRef) {
        this.appRef = appRef;
    }

    ngAfterContentChecked() {
        this.cardHeight = this.getBBox() * 3;
    }

    ngOnChanges(changes: SimpleChanges): void {
        this.trainingInstanceIds = this.trainingInstanceStatistics.map((ti) => ti.instanceId);
        this.levelTitle = this.level !== null ? '(for <i>level ' + this.level + '</i> only)' : '';
    }

    toggleView(isOpen: boolean) {
        this.appRef.tick();
    }

    clusterChange(change: any) {
        this.numOfClusters = change.target.value;
    }

    getBBox() {
        const box = document.querySelector(
            '#radarchartSvgPlaceholder crczp-clustering-visualization'
        ) as HTMLElement | null;
        //console.log(box.getBoundingClientRect());

        if (box != null) {
            return box.getBoundingClientRect().height + 24;
        }
    }

    hideChart(item) {
        d3.select('#radarchartDiv').style('display', item[0].hide ? 'none' : 'block');
    }
}
