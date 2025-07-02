import {Component, Input, OnInit} from '@angular/core';
import {Graphviz, graphviz} from 'd3-graphviz';
import {SummaryGraphService} from './summary-graph.service';
import {tap} from 'rxjs/operators';
import {CommonModule} from '@angular/common';
import {MatButtonModule} from '@angular/material/button';
import {MatListModule} from '@angular/material/list';
import {MatIconModule} from '@angular/material/icon';
import {BaseType} from 'd3';
import {ReferenceGraphApi, VisualizationApiConfig,} from '@crczp/visualization-api';
import {provideComponentProperty} from '@crczp/common';

/**
 * Summary graph shows results of all trainees in training.
 * Its zoomable component which allows traversal through graph.
 */
@Component({
    selector: 'crczp-summary-graph',
    templateUrl: './summary-graph.component.html',
    styleUrls: ['./summary-graph.component.css'],
    imports: [CommonModule, MatButtonModule, MatListModule, MatIconModule],
    providers: [
        ReferenceGraphApi,
        SummaryGraphService,
        provideComponentProperty(
            SummaryGraphComponent,
            VisualizationApiConfig,
            'apiConfig'
        ),
    ],
})
export class SummaryGraphComponent implements OnInit {
    @Input() apiConfig: VisualizationApiConfig;
    @Input() trainingInstanceId: number;
    error = undefined;
    private graphviz: Graphviz<BaseType, any, BaseType, any>;

    constructor(private graphService: SummaryGraphService) {}

    ngOnInit(): void {
        this.graphService
            .getSummaryGraph(this.trainingInstanceId)
            .pipe(
                tap(
                    (result) =>
                        (this.graphviz = graphviz('div.graph')
                            .fit(true)
                            .renderDot(result.graph)),
                    (err) =>
                        (this.error =
                            err.error.api_sub_error &&
                            err.error.status === 'NOT_FOUND'
                                ? `The summary graph for training instance hasn't been created yet.`
                                : 'Error occurred please refresh the page.')
                )
            )
            .subscribe();
    }

    onResetZoom(): void {
        this.graphviz.resetZoom();
    }
}
