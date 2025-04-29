import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import * as d3 from 'd3';
import { TrainingRunData, TrainingRunPathNode } from '@crczp/visualization-model';

@Component({
    // eslint-disable-next-line @angular-eslint/component-selector
    selector: 'g[training-run-transitions]',
    templateUrl: './training-run-transitions.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlayerTransitionsComponent {
    @Input() playerTransitions!: TrainingRunData;

    @Input() xScale!: d3.ScalePoint<number>;
    @Input() yScale!: d3.ScalePoint<number>;
    @Input() color!: string;

    @Output() taskPreviewEvent = new EventEmitter<TrainingRunPathNode>();

    onTaskPreviewChange(node: TrainingRunPathNode) {
        this.taskPreviewEvent.emit(node);
    }
}
