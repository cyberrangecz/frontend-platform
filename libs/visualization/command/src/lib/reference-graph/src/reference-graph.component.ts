import { Component, Input, OnInit } from '@angular/core';
import { Graphviz, graphviz } from 'd3-graphviz';
import { ReferenceGraphService } from './service/reference-graph.service';
import { tap } from 'rxjs/operators';
import { Observable } from 'rxjs';
import { Graph } from './model/graph';
import { BaseType } from 'd3';

@Component({
    selector: 'crczp-reference-graph',
    templateUrl: './reference-graph.component.html',
    styleUrls: ['./reference-graph.component.css'],
})
export class ReferenceGraphComponent implements OnInit {
    @Input() trainingDefinitionId: number;
    @Input() trainingInstanceId: number;
    @Input() trainingRunId: number;
    public hasError = false;
    private graphviz: Graphviz<BaseType, any, BaseType, any>;

    constructor(private graphService: ReferenceGraphService) {}

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
                    () => (this.hasError = true),
                ),
            )
            .subscribe();
    }

    onResetZoom(): void {
        this.graphviz.resetZoom();
    }
}
