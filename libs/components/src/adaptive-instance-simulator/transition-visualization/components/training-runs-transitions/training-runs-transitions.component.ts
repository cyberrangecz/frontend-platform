import {
    ChangeDetectionStrategy,
    ChangeDetectorRef,
    Component,
    ElementRef,
    EventEmitter,
    inject,
    Input,
    Output
} from '@angular/core';
import * as d3 from 'd3';
import {AdaptiveRunVisualization, RunVisualizationPathNode} from "@crczp/visualization-model";
import {PlayerTransitionsComponent} from "./training-run-transitions/training-run-transitions.component";

@Component({
    // eslint-disable-next-line @angular-eslint/component-selector
    selector: 'g[training-runs-transitions]',
    templateUrl: './training-runs-transitions.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        PlayerTransitionsComponent
    ]
})
export class PlayersTransitionsComponent {
    @Input() playersTransitions!: AdaptiveRunVisualization[];
    @Input() xScale!: d3.ScalePoint<number>;
    @Input() yScale!: d3.ScalePoint<number>;
    @Input() colorScale!: d3.ScaleOrdinal<string, string>;
    @Output() taskPreviewEvent = new EventEmitter<RunVisualizationPathNode>();
    protected readonly String = String;
    private ref = inject(ChangeDetectorRef);
    private g: any;

    constructor() {
        const element = inject(ElementRef);

        this.g = d3.select(element.nativeElement);
    }

    trackByTrainingRunId(playerData: AdaptiveRunVisualization) {
        return playerData.trainingRunId;
    }

    onTaskPreviewChange(node: RunVisualizationPathNode) {
        this.taskPreviewEvent.emit(node);
    }
}
