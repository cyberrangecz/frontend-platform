import {
    ChangeDetectionStrategy,
    ChangeDetectorRef,
    Component,
    ElementRef,
    EventEmitter,
    Input,
    Output,
} from '@angular/core';
import * as d3 from 'd3';
import { AdaptiveRunVisualization, RunVisualizationPathNode } from '@crczp/visualization-model';

@Component({
    // eslint-disable-next-line @angular-eslint/component-selector
    selector: 'g[training-runs-transitions]',
    templateUrl: './training-runs-transitions.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlayersTransitionsComponent {
    @Input() playersTransitions!: AdaptiveRunVisualization[];

    @Input() xScale!: d3.ScalePoint<number>;
    @Input() yScale!: d3.ScalePoint<number>;
    @Input() colorScale!: d3.ScaleOrdinal<string, string>;

    @Output() taskPreviewEvent = new EventEmitter<RunVisualizationPathNode>();

    private g: any;

    constructor(
        element: ElementRef,
        private ref: ChangeDetectorRef,
    ) {
        this.g = d3.select(element.nativeElement);
    }

    trackByTrainingRunId(playerData: AdaptiveRunVisualization) {
        return playerData.trainingRunId;
    }

    onTaskPreviewChange(node: RunVisualizationPathNode) {
        this.taskPreviewEvent.emit(node);
    }
}
