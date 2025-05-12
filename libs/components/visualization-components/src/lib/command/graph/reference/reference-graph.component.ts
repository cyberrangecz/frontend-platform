import { Component, Input, OnInit } from '@angular/core';
import { Graphviz, graphviz } from 'd3-graphviz';
import { ReferenceGraphService } from './reference-graph.service';
import { tap } from 'rxjs/operators';
import { Observable } from 'rxjs';
import { Graph } from '@crczp/visualization-model';
import { BaseType } from 'd3';
import { ReferenceGraphApi, VisualizationApiConfig } from '@crczp/visualization-api';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { provideComponentProperty } from '@crczp/components-common';

@Component({
    selector: 'crczp-reference-graph',
    templateUrl: './reference-graph.component.html',
    styleUrls: ['./reference-graph.component.css'],
    imports: [
        CommonModule, MatButtonModule, MatListModule, MatIconModule
    ],
    providers: [
        ReferenceGraphApi,
        ReferenceGraphService,
        provideComponentProperty(ReferenceGraphComponent, VisualizationApiConfig, 'apiConfig')
    ]
})
export class ReferenceGraphComponent implements OnInit {
    @Input() apiConfig: VisualizationApiConfig;
    @Input() trainingDefinitionId: number;
    @Input() trainingInstanceId: number;
    @Input() trainingRunId: number;
    public hasError = false;
    private graphviz: Graphviz<BaseType, any, BaseType, any>;

    constructor(private graphService: ReferenceGraphService) {
    }

    ngOnInit(): void {
        let referenceGraphResponse: Observable<Graph>;
        if (this.trainingDefinitionId) {
            referenceGraphResponse = this.graphService.getReferenceGraphByDefinitionId(this.trainingDefinitionId);
        } else {
            referenceGraphResponse = this.trainingInstanceId
                ? this.graphService.getReferenceGraph(this.trainingInstanceId)
                : this.graphService.getTraineeReferenceGraph(this.trainingRunId);
        }
        referenceGraphResponse
            .pipe(
                tap(
                    (graph) => {
                        this.graphviz = graphviz('div.reference-graph').zoom(true).fit(true).renderDot(graph.graph);
                    },
                    () => (this.hasError = true)
                )
            )
            .subscribe();
    }

    onResetZoom(): void {
        this.graphviz.resetZoom();
    }
}
