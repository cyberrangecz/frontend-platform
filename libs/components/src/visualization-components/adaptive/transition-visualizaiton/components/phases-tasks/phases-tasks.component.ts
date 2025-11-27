import { ChangeDetectionStrategy, ChangeDetectorRef, Component, ElementRef, EventEmitter, Input, Output, inject } from '@angular/core';
import * as d3 from 'd3';
import {RunVisualizationPathNode, TransitionPhase} from '@crczp/visualization-model';

@Component({
    // eslint-disable-next-line @angular-eslint/component-selector
    selector: 'g[phases-tasks]',
    templateUrl: './phases-tasks.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PhasesTasksComponent {
    private ref = inject(ChangeDetectorRef);

    @Input() phases!: TransitionPhase[];

    @Input() xScale!: d3.ScalePoint<number>;
    @Input() yScale!: d3.ScalePoint<number>;

    @Output() taskPreviewEvent = new EventEmitter<RunVisualizationPathNode>();

    private g: any;

    constructor() {
        const element = inject(ElementRef);

        this.g = d3.select(element.nativeElement);
    }

    getTime() {
        return new Date();
    }

    trackByPhaseId(phase: TransitionPhase) {
        return phase.id;
    }

    onTaskPreviewChange(node: RunVisualizationPathNode) {
        this.taskPreviewEvent.emit(node);
    }
}
