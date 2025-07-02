import { AfterContentChecked, ApplicationRef, ChangeDetectorRef, Component, Input, OnChanges, SimpleChanges, inject } from '@angular/core';
import * as d3 from 'd3';
import {TrainingInstanceStatistics} from '@crczp/visualization-model';
import {MatCardModule} from '@angular/material/card';
import {MatDividerModule} from '@angular/material/divider';
import {MatGridListModule} from '@angular/material/grid-list';
import {MatInputModule} from '@angular/material/input';
import {MatTooltipModule} from '@angular/material/tooltip';
import {MatButtonModule} from '@angular/material/button';
import {MatFormFieldModule} from '@angular/material/form-field';
import {MatRadioModule} from '@angular/material/radio';
import {ClusteringVisualizationsComponent} from '../../clustering/clustering-visualizations.component';
import {MatIconModule} from '@angular/material/icon';

@Component({
    selector: 'crczp-scatter-clusters-wrapper',
    templateUrl: './scatter-clusters-wrapper.component.html',
    imports: [
        MatCardModule,
        MatDividerModule,
        MatGridListModule,
        MatFormFieldModule,
        MatInputModule,
        MatTooltipModule,
        MatButtonModule,
        MatIconModule,
        MatRadioModule,
        ClusteringVisualizationsComponent
    ],
    styleUrls: ['./scatter-clusters-wrapper.component.css']
})
export class ScatterClustersWrapperComponent implements OnChanges, AfterContentChecked {
    @Input() level;
    @Input() trainingDefinitionId: number;
    @Input() trainingInstanceStatistics: TrainingInstanceStatistics[];

    readonly appRef;
    public numOfClusters = 5;
    public trainingInstanceIds: number[] = [];
    public cardHeight = 150;
    public plotFeatures = 1;
    public levelTitle = '';
    public readonly info =
        'The chart shows a relation between two distinct groups of actions or behavior, helps to identify connections between them.';

    constructor() {
        const appRef = inject(ApplicationRef);

        this.appRef = appRef;
    }

    ngAfterContentChecked() {
        this.cardHeight = document.querySelector('crczp-clustering-visualization').getBoundingClientRect().height;
    }

    ngOnChanges(changes: SimpleChanges): void {
        this.trainingInstanceIds = this.trainingInstanceStatistics.map((ti) => ti.instanceId);
        this.levelTitle = this.level !== null ? '(for <i>level ' + this.level + '</i> only)' : '';
    }

    public onRadioChange(value: number): void {
        this.plotFeatures = value;
    }

    toggleView(isOpen: boolean) {
        this.appRef.tick();
    }

    clusterChange(change) {
        this.numOfClusters = change.target.value;
    }

    /**
     * In this visualization, we first need to make sure the chart does show something. If not, we can hide it.
     * @param items is an array of views that were checked for information, so that we know if we should hide it or not
     */
    hideChart(items: { hide: boolean; feature: any }[]) {
        const feature = this.plotFeatures,
            missingFeatures = items.filter((value) => value.hide).map((val) => val.feature);

        // completely hide line chart for the missing view
        d3.select('#scatterClusterDiv .clustering-feature-' + feature + ' crczp-viz-clustering-line-chart').style(
            'display',
            missingFeatures.includes(feature) ? 'none' : 'block'
        );

        // change styling of main plot to ensure the chart div does not interfere with other elements
        d3.select('#scatterClusterDiv .clustering-feature-' + feature + ' crczp-viz-clustering-scatter-plot')
            .style('opacity', missingFeatures.includes(feature) ? '0' : '1')
            .style('pointer-events', missingFeatures.includes(feature) ? 'none' : 'initial');

        // if only one feature is available, shiw a message for the other
        d3.select('#scatterClusterDiv .cluster-no-data-message').style(
            'display',
            missingFeatures.includes(feature) ? 'block' : 'none'
        );
    }
}
