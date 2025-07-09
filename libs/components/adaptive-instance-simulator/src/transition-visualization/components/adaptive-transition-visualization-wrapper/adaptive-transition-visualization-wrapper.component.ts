import {Component, ElementRef, HostListener, Input, OnInit, ViewChild} from '@angular/core';
import * as d3 from 'd3';
import {AdaptiveVisualizationTask} from '../../model/phase/adaptiveVisualizationTask';
import {AdaptiveVisualizationPhase} from '../../model/phase/adaptive-visualization-phase';
import {TransitionGraphVisualizationData} from '../../model/transition-graph-visualization-data';
import {BehaviorSubject} from 'rxjs';
import {PlayersTransitionsComponent} from "../training-runs-transitions/training-runs-transitions.component";
import {PhasesTasksComponent} from "../phases-tasks/phases-tasks.component";
import {ChartBaseComponent} from "../chart-base/chart-base.component";
import {MatDivider} from "@angular/material/divider";
import {TaskPreviewComponent} from "../task-preview/task-preview.component";
import {AsyncPipe} from "@angular/common";
import {MatIcon} from "@angular/material/icon";
import {MatIconButton} from "@angular/material/button";
import {RunVisualizationPathNode} from "@crczp/visualization-model";

@Component({
    selector: 'crczp-adaptive-transition-visualization-wrapper',
    templateUrl: './adaptive-transition-visualization-wrapper.component.html',
    styleUrls: ['./adaptive-transition-visualization-wrapper.component.scss'],
    imports: [
        PlayersTransitionsComponent,
        PhasesTasksComponent,
        ChartBaseComponent,
        MatDivider,
        MatIcon,
        TaskPreviewComponent,
        MatIconButton,
        AsyncPipe
    ]
})
export class AdaptiveTransitionVisualizationWrapperComponent implements OnInit {
    @Input() data!: TransitionGraphVisualizationData;
    margin = {left: 80, right: 20, top: 20, bottom: 20};
    xScale!: d3.ScalePoint<number>;
    yScale!: d3.ScalePoint<number>;
    colorScale!: d3.ScaleOrdinal<string, string>;
    taskPreview$ = new BehaviorSubject<AdaptiveVisualizationTask | undefined>(undefined);
    colors = [
        '#556b2f',
        '#8b4513',
        '#228b22',
        '#8b0000',
        '#808000',
        '#483d8b',
        '#008080',
        '#4682b4',
        '#9acd32',
        '#00008b',
        '#daa520',
        '#8fbc8f',
        '#8b008b',
        '#b03060',
        '#d2b48c',
        '#ff0000',
        '#00ced1',
        '#ff8c00',
        '#0000cd',
        '#00ff00',
        '#9400d3',
        '#00ff7f',
        '#dc143c',
        '#00bfff',
        '#f4a460',
        '#adff2f',
        '#b0c4de',
        '#ff00ff',
        '#1e90ff',
        '#f0e68c',
        '#fa8072',
        '#ffff54',
        '#dda0dd',
        '#7b68ee',
        '#ee82ee',
        '#98fb98',
        '#7fffd4',
        '#ff69b4',
        '#ffc0cb',
        '#696969',
    ];
    @ViewChild('chart', {static: true}) private chartContainer?: ElementRef;
    private contentGroup: any;

    @HostListener('window:resize', ['$event'])
    onResize() {
        this.setScales();
    }

    ngOnInit(): void {
        this.setScales();
    }

    innerWidth(): number {
        return this.chartContainer?.nativeElement.clientWidth - this.margin.left - this.margin.right;
    }

    innerHeight(): number {
        return this.chartContainer?.nativeElement.clientHeight - this.margin.top - this.margin.bottom;
    }

    getMarginTransform(): string {
        return `translate(${this.margin.left},${this.margin.top})`;
    }

    onTaskPreviewChange(node: RunVisualizationPathNode | null) {
        const taskToPreview = this.data.phases
            .find((phase: AdaptiveVisualizationPhase) => phase.order === node?.phaseOrder)
            ?.tasks.find((task: AdaptiveVisualizationTask) => task.order === node?.taskOrder);
        this.taskPreview$.next(taskToPreview);
    }

    private setScales() {
        this.initXScale();
        this.initYScale();
        this.initColorScale();
    }

    private initXScale() {
        this.xScale = d3.scalePoint();
        this.xScale
            .domain(this.data.phases.map((phase) => phase.order))
            .range([0, this.innerWidth()])
            .padding(0.4);
    }

    private initYScale() {
        this.yScale = d3.scalePoint();
        this.yScale.domain(this.getYDomain(this.data.phases)).range([this.innerHeight(), 0]).padding(0.5);
    }

    private initColorScale() {
        this.colorScale = d3.scaleOrdinal();
        this.colorScale.range(this.colors);
    }

    private getYDomain(phases: AdaptiveVisualizationPhase[]): number[] {
        return [...phases]
            .sort((a: AdaptiveVisualizationPhase, b: AdaptiveVisualizationPhase) => b.tasks.length - a.tasks.length)[0]
            .tasks.map((task: AdaptiveVisualizationTask) => task.order)
            .reverse();
    }
}
