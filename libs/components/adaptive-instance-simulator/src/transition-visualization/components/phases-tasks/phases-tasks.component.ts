import {ChangeDetectionStrategy, Component, EventEmitter, Input, Output,} from '@angular/core';
import * as d3 from 'd3';
import {AdaptiveVisualizationPhase} from '../../model/phase/adaptive-visualization-phase';
import {RunVisualizationPathNode} from "@crczp/visualization-model";
import {PhaseTasksComponent} from "./phase-tasks/phase-tasks.component";

@Component({
    // eslint-disable-next-line @angular-eslint/component-selector
    selector: 'g[phases-tasks]',
    templateUrl: './phases-tasks.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        PhaseTasksComponent
    ]
})
export class PhasesTasksComponent {
    @Input() phases!: AdaptiveVisualizationPhase[];

    @Input() xScale!: d3.ScalePoint<number>;
    @Input() yScale!: d3.ScalePoint<number>;

    @Output() taskPreviewEvent = new EventEmitter<RunVisualizationPathNode>();


    trackByPhaseId(phase: AdaptiveVisualizationPhase) {
        return phase.id;
    }

    onTaskPreviewChange(node: RunVisualizationPathNode) {
        this.taskPreviewEvent.emit(node);
    }
}
