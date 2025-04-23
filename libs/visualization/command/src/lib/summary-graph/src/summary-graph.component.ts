import { Component, Input, OnInit } from '@angular/core';
import { Graphviz, graphviz } from 'd3-graphviz';
import { SummaryGraphService } from './service/summary-graph.service';
import { tap } from 'rxjs/operators';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { SummaryGraphApiService } from './api/summary-graph-api.service';
import { BaseType } from 'd3';
import { VisualizationConfigService } from '../../common/service/visualization-config-service';


/**
 * Summary graph shows results of all trainees in training.
 * Its zoomable component which allows traversal through graph.
 */
@Component({
    selector: 'crczp-summary-graph',
    templateUrl: './summary-graph.component.html',
    styleUrls: ['./summary-graph.component.css'],
    imports: [CommonModule, MatButtonModule, MatListModule, MatIconModule],
    providers: [SummaryGraphService, SummaryGraphApiService, VisualizationConfigService],
})
export class SummaryGraphComponent implements OnInit {
    constructor(private graphService: SummaryGraphService) {}

    @Input() trainingInstanceId: number;
    private graphviz: Graphviz<BaseType, any, BaseType, any>;
    error = undefined;

    ngOnInit(): void {
        this.graphService
            .getSummaryGraph(this.trainingInstanceId)
            .pipe(
                tap(
                    (result) => (this.graphviz = graphviz('div.graph').fit(true).renderDot(result.graph)),
                    (err) =>
                        (this.error =
                            err.error.api_sub_error && err.error.status === 'NOT_FOUND'
                                ? `The summary graph for training instance hasn't been created yet.`
                                : 'Error occurred please refresh the page.'),
                ),
            )
            .subscribe();
    }

    onResetZoom(): void {
        this.graphviz.resetZoom();
    }
}
