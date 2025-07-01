import {ChangeDetectionStrategy, Component, EventEmitter, Input, Output} from '@angular/core';
import * as d3 from 'd3';
import {RunVisualizationPathNode} from '../../../model/training-run-path-node';
import {AdaptiveRunVisualization} from '../../../model/training-run-data';

@Component({
    // eslint-disable-next-line @angular-eslint/component-selector
    selector: 'g[training-run-transitions]',
    templateUrl: './training-run-transitions.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlayerTransitionsComponent {
    @Input() playerTransitions!: AdaptiveRunVisualization;

    @Input() xScale!: d3.ScalePoint<number>;
    @Input() yScale!: d3.ScalePoint<number>;
    @Input() color!: string;

    @Output() taskPreviewEvent = new EventEmitter<RunVisualizationPathNode>();

    onTaskPreviewChange(node: RunVisualizationPathNode) {
        this.taskPreviewEvent.emit(node);
    }
}
