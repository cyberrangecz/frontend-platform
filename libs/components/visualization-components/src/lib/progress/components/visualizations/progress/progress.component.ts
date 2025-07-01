import {
    AfterViewInit,
    Component,
    EventEmitter,
    Input,
    OnChanges,
    Output,
    SimpleChanges,
    ViewEncapsulation,
} from '@angular/core';
import {
    Axis,
    NumberValue,
    ScaleBand,
    ScaleTime,
    ZoomBehavior,
    ZoomTransform,
} from 'd3';

import {
    HintTakenEvent,
    ProgressLevelInfo,
    ProgressLevelVisualizationData,
    ProgressTraineeInfo,
    ProgressVisualizationData,
    TraineeProgressData,
    WrongAnswerEvent,
} from '@crczp/visualization-model';
import { TraineeViewEnum, ViewEnum } from '../../types';
import { D3, D3Service } from '../../../../common/d3-service/d3-service';
import { PROGRESS_CONFIG } from '../../../progress-config';
import { DateUtils } from '@crczp/common';
import { Level } from '@crczp/training-model';
import { TraineeSelectionComponent } from '../trainee-selection/trainee-selection.component';
import { OverviewProgressBarComponent } from '../overview-progress-bar/overview-progress-bar.component';
import { LevelListComponent } from '../level-list/level-list.component';
import { TraineeDetailComponent } from '../trainee-detail/trainee-detail.component';
import { ColumnHeaderComponent } from '../column-header/column-header.component';
import { LegendComponent } from '../legend/legend.component';
import { MatTooltipModule } from '@angular/material/tooltip';
import { CommonModule } from '@angular/common';

@Component({
    selector: 'crczp-viz-progress',
    templateUrl: './progress.component.html',
    styleUrls: ['./progress.component.css'],
    encapsulation: ViewEncapsulation.None,
    imports: [
        CommonModule,
        MatTooltipModule,
        TraineeSelectionComponent,
        OverviewProgressBarComponent,
        LevelListComponent,
        TraineeDetailComponent,
        ColumnHeaderComponent,
        LegendComponent,
    ],
})
export class ProgressComponent implements OnChanges, AfterViewInit {
    @Input() visualizationData: ProgressVisualizationData;
    @Input() selectedTraineeView: TraineeViewEnum = TraineeViewEnum.Avatar;
    @Input() externalFilters: any;
    @Input() setDashboardView = false;
    @Input() trainingInstanceId: number;
    @Input() view = ViewEnum.Progress;
    @Input() restriction: any;
    @Input() restrictToVisibleTrainees = false;
    @Input() restrictToCustomTimelines = false;

    @Output() getMaxTime: EventEmitter<number> = new EventEmitter();
    @Output() getStepSize: EventEmitter<number> = new EventEmitter();
    //@Output() highlightedTrainee = new EventEmitter<number>();

    public filteredTrainees: ProgressTraineeInfo[] = []; // the trainees from the trainee selection
    public highlightedTraineeRefId: number;
    public traineeDetailId: number;
    public sortType = 'name';
    public sortReverse = false;
    public stripUnfinishedTimes = 0;
    public traineeRestrictedXScale = {
        min: Number.MAX_VALUE,
        max: 0,
        inactive: 0,
    };
    public customRestrictedXScale = {
        min: 0,
        max: 100,
        minRestriction: 0,
        maxRestriction: 0,
    };
    public timelineStepSize = 1000;
    xScale: ScaleTime<number, number>;
    yScale: ScaleBand<number>;
    brushYScale: ScaleBand<number>;
    contextXScale: ScaleTime<number, number>;
    xAxis: Axis<NumberValue>;
    xAxisElem;
    private filteredRuns: TraineeProgressData[] = []; // the trainee runs filtered by the trainee selection
    private readonly d3: D3;
    private svg;
    private zoom: ZoomBehavior<Element, unknown>;

    // transformTimeStamp: we need to remember a transform fire timestamp and check it,
    private brush;
    private zoomTransform: ZoomTransform;
    private brushSelection; // to maintain brush selection after filtering
    private tooltip;
    private tooltipOffset = 3;
    private approxFontWidth = 10;
    // otherwise the brush update will trigger an infinite loop (this issue emerged from d3v7)
    private transformTimeStamp = false;
    // to config/input ?
    private width = 0;
    private height = 200;

    private chartHeight: number;
    private brushHeight = 100;
    private timeIndication = 125;

    // used by margin convention in d3 (https://bl.ocks.org/mbostock/3019563)
    private margin = { top: 0, right: 140, bottom: 20, left: 230 };
    private minXAxisVal: number;
    private maxXAxisVal: number;

    // percentage of height of chart
    private gutter = 0.1;

    constructor(d3Service: D3Service) {
        this.d3 = d3Service.getD3();
        this.zoomTransform = this.d3.zoomIdentity;
        this.svg = this.d3.select('body');
    }

    ngOnChanges(changes: SimpleChanges): void {
        // if it is first call skip update and init first
        if (
            changes['visualizationData'] &&
            changes['visualizationData'].isFirstChange()
        )
            return;
        if (changes['restriction']) {
            this.customRestrictedXScale[this.restriction.type + 'Restriction'] =
                this.restriction.value;
        }
        this.updateProgressChart();
    }

    ngAfterViewInit(): void {
        this.filteredTrainees = this.visualizationData.trainees;
        this.filteredRuns = this.visualizationData.traineeProgress;
        this.sortTrainees();
        this.setWidth();
        this.setHeight();
        this.appendSVG();
        this.createTooltip();
        this.updateXScale();
        this.updateContextXScale();
        this.updateYScale();
        this.initProgressChartContainer();
        this.initProgressRowsContainer();
        this.drawXAxis();
        this.updateSideColumns();
        this.initHeaders();
        this.initProgressRow();
        this.updateWhenEmpty();
        this.drawFinished();
        this.drawActive();
        this.drawPlanned();
        this.createEvents();
        this.drawTimeline();

        this.initZoom();
        this.initBrush();
        this.createStatePatterns();
    }

    updateProgressChart() {
        this.sortTrainees();
        this.filteredRuns = this.updateDisplayedTrainees();
        this.setWidth();
        this.setHeight();
        if (this.restrictToVisibleTrainees)
            this.restrictXScaleToVisibleRange(this.filteredRuns);
        this.updateXScale();
        this.updateXAxis();
        this.updateContextXScale();
        this.updateYScale(this.filteredRuns);
        this.updateSideColumns();
        this.initHeaders();
        this.initProgressRow();
        this.updateWhenEmpty();
        this.drawFinished();
        this.drawActive();
        this.drawPlanned();
        this.createEvents();
        this.drawTimeline();

        this.transformChart(this.zoomTransform);
        this.updateZoomListenerAndBrush();
    }

    sortTrainees() {
        if (this.sortType == 'name') {
            const sortOrder = JSON.parse(
                JSON.stringify(this.visualizationData.trainees)
            )
                .sort((a, b) =>
                    this.sortReverse
                        ? b.name
                              .toLowerCase()
                              .localeCompare(a.name.toLowerCase(), 'en', {
                                  numeric: true,
                              })
                        : a.name
                              .toLowerCase()
                              .localeCompare(b.name.toLowerCase(), 'en', {
                                  numeric: true,
                              })
                )
                .map((d) => d.userRefId);

            this.visualizationData.traineeProgress.sort(
                (a, b) =>
                    sortOrder.indexOf(a.userRefId) -
                    sortOrder.indexOf(b.userRefId)
            );
        } else if (this.sortType == 'time') {
            this.visualizationData.traineeProgress =
                this.visualizationData.traineeProgress.sort((a, b) =>
                    this.sortReverse
                        ? this.getTraineeTime(b) - this.getTraineeTime(a)
                        : this.getTraineeTime(a) - this.getTraineeTime(b)
                );
        }
    }

    getTraineeTime(progress: TraineeProgressData) {
        // if the run is finished
        if (progress.levels[progress.levels.length - 1].state == 'FINISHED')
            return (
                progress.levels[progress.levels.length - 1].endTime -
                progress.levels[0].startTime
            );
        // if the run is still on
        else
            return (
                this.visualizationData.currentTime -
                progress.levels[0].startTime
            );
    }

    updateDisplayedTrainees(): TraineeProgressData[] {
        const userIds = this.filteredTrainees.map(
            (trainee) => trainee.userRefId
        );
        const visibleTrainees: TraineeProgressData[] = [];
        this.visualizationData.traineeProgress.forEach((trainee) => {
            trainee.displayRun = false;
            if (userIds.includes(trainee.userRefId)) {
                trainee.displayRun = true;
                visibleTrainees.push(trainee);
            }
        });
        return visibleTrainees;
    }

    updateWhenEmpty() {
        //traineeData: ProgressTraineeInfo[]) {
        //if (traineeData.length < 1) {
        if (this.filteredRuns.length < 1) {
            this.svg
                .append('text')
                .attr('class', 'empty-container')
                .text('No training runs to show')
                .attr('y', 50)
                .attr('x', this.width / 2)
                .style('text-anchor', 'middle');
        }
        this.svg
            .select('.progress-chart-container .timeline')
            .style('display', this.filteredRuns.length < 1 ? 'none' : 'block');
        this.d3
            .select('.progress-header')
            .style('display', this.filteredRuns.length < 1 ? 'none' : 'block');
        this.svg
            .select('.context')
            .style('display', this.filteredRuns.length < 1 ? 'none' : 'block');
        this.svg
            .select('.x-axis')
            .style('display', this.filteredRuns.length < 1 ? 'none' : 'block');
    }

    appendSVG() {
        this.svg = this.d3
            .selectAll('.progress-container')
            .append('svg')
            .attr('width', this.width + this.margin.left + this.margin.right)
            .attr('height', this.height + this.margin.top + this.margin.bottom)
            .append('g')
            .attr(
                'transform',
                'translate(' + this.margin.left + ',' + this.margin.top + ')'
            );
    }

    initZoom(): void {
        this.zoom = this.d3
            .zoom()
            .scaleExtent([1, 50])
            .extent([
                [0, 0],
                [this.width, this.chartHeight],
            ])
            .translateExtent([
                [0, 0],
                [this.width, this.chartHeight],
            ])
            .filter((event) => {
                // prevent page from zooming out when chart is fully zoomed out
                if (event.type === 'wheel') {
                    event.preventDefault();
                    return event.ctrlKey;
                }

                return true;
            })
            .on('zoom', (event) => this.zoomed(event, false));

        const zoomListenerRect = this.createZoomListener();
        zoomListenerRect.call(this.zoom);

        this.svg
            .select('.progress-chart-container')
            .on('mousewheel', (event) => this.zoomOnCtrl(event))
            .on('mousemove', (event) => this.zoomOnCtrl(event))
            .on('mousedown', (event) => this.zoomOnCtrl(event))
            .on('mouseup', () => {
                this.svg
                    .select('.zoom-listener-rect')
                    .style('pointer-events', 'none')
                    .style('cursor', 'default');
            });
    }

    initHeaders() {
        const currentTimePos =
            this.xScale(this.visualizationData.currentTime) -
            (this.xScale(this.visualizationData.currentTime) <
            this.timeIndication
                ? this.timeIndication * 0.55
                : this.timeIndication);

        this.d3
            .select('.trainee-name-header')
            .attr('x', 0)
            .style('left', this.margin.left - 80 + 'px');

        this.d3
            .select('#progress-elapsed-time')
            .style('left', this.margin.left + currentTimePos + 'px');

        this.d3
            .select('.trainee-time-header')
            .style(
                'left',
                this.margin.left + this.width - this.margin.right - 40 + 'px'
            );
    }

    zoomOnCtrl(event) {
        if (event.ctrlKey) {
            event.preventDefault();
        }
        this.svg
            .select('.zoom-listener-rect')
            .style('pointer-events', event.ctrlKey ? 'all' : 'none')
            .style('cursor', event.ctrlKey ? 'grabbing' : 'default');
    }

    zoomed(event, reset = false): void {
        this.zoomTransform = reset ? this.d3.zoomIdentity : event.transform;
        const updatedScale = this.zoomTransform.rescaleX(this.xScale);
        this.xAxis.scale(updatedScale);
        this.xAxisElem.call(this.xAxis);
        this.transformChart(this.zoomTransform);

        // here, we first need to make sure the brush won't cycle infinitely
        if (
            this.brush != undefined &&
            event &&
            event.sourceEvent &&
            this.transformTimeStamp !== event.sourceEvent.timeStamp
        ) {
            this.transformTimeStamp = event.sourceEvent.timeStamp;
            this.d3
                .selectAll('.context')
                .select('.brush')
                .call(
                    this.brush.move,
                    this.xScale
                        .range()
                        .map(this.zoomTransform.invertX, this.zoomTransform)
                );
        }
    }

    transformChart(transform: ZoomTransform) {
        // the main progress timeline text
        const currentTime = this.xScale(
            this.restrictToVisibleTrainees
                ? this.traineeRestrictedXScale.max
                : this.visualizationData.currentTime
        );
        const newPosition = currentTime * transform.k + transform.x;
        const moveTimeText =
            newPosition < this.timeIndication
                ? this.timeIndication * 0.55
                : this.timeIndication;

        this.d3
            .select('.progress-container svg')
            .attr('width', this.width + this.margin.left + this.margin.right);

        this.svg.select('#clip rect').attr('width', this.width);
        this.svg.select('.context').attr('width', this.width);
        this.svg.select('#clip-context rect').attr('width', this.width);

        this.d3
            .select('#progress-elapsed-time')
            .style('left', this.margin.left + newPosition - moveTimeText + 'px')
            .style('opacity', () => {
                return newPosition > this.xScale(this.maxXAxisVal) ||
                    newPosition < this.xScale(this.visualizationData.startTime)
                    ? '0'
                    : '1';
            });

        this.svg
            .select('.progress-chart-container .timeline')
            .attr('stroke-width', 2 / transform.k);

        // all progress rows
        this.svg
            .selectAll('.progress-row-container')
            .attr(
                'transform',
                'translate(' + transform.x + ',0) scale(' + transform.k + ',1)'
            );

        // the events need to be fully redrawn, since they form groups by proximity
        this.svg
            .select('.progress-row-events')
            .attr(
                'transform',
                'translate(' + transform.x + ',0) scale(' + 1 + ',1)'
            );
        this.createEvents(transform.k);

        // the hatched patterns need to stay put, not stretch
        this.svg
            .selectAll('defs')
            .selectAll('pattern')
            .attr('transform', 'scale(' + 1 + ')')
            .attr('width', 7 / transform.k)
            .attr('patternTransform', 'rotate(' + 45 / transform.k + ')');
        this.svg
            .selectAll('defs')
            .selectAll('pattern')
            .selectAll('rect')
            .attr('width', 3 / transform.k);
    }

    initBrush(): void {
        this.svg
            .append('defs')
            .append('clipPath')
            .attr('id', 'clip-context')
            .append('rect')
            .attr('x', 0)
            .attr('y', this.chartHeight)
            .attr('width', this.width)
            .attr('height', this.brushHeight);

        this.brush = this.d3
            .brushX()
            .extent([
                [0, this.height - this.brushHeight],
                [this.width, this.height],
            ])
            .on('brush', (event) => this.brushed(event));

        const context = this.svg
            .selectAll('.progress-chart-container')
            .append('g')
            .attr('class', 'context');

        const contextClip = context
            .append('g')
            .attr('clip-path', 'url(#clip-context)');

        contextClip
            .append('g')
            .attr('class', 'progress-row-container-context')
            .attr('transform', 'translate(0,' + this.chartHeight + ')');

        if (this.brush == undefined) return;
        context
            .append('g')
            .attr('class', 'brush')
            .call(this.brush)
            .call(this.brush.move, this.xScale.range());
    }

    brushed(event): void {
        const newPosition =
            this.xScale(this.visualizationData.currentTime) *
                this.zoomTransform.k +
            this.zoomTransform.x;
        const moveTimeText =
            newPosition < this.timeIndication
                ? this.timeIndication * 0.55
                : this.timeIndication;
        this.d3
            .select('#progress-elapsed-time')
            .style(
                'left',
                this.margin.left + newPosition - moveTimeText + 'px'
            );

        if (event.sourceEvent && event.sourceEvent.type === 'zoom') {
            return;
        } // ignore zoom-by-brush (causes stack overflow)
        const selection = event.selection || this.contextXScale;
        this.brushSelection = selection;

        const transform = this.d3.zoomIdentity
            .scale(this.width / (selection[1] - selection[0]))
            .translate(-selection[0], 0);

        this.svg.select('g.axis--x').call(this.xAxis);
        this.svg
            .select('.zoom-listener-rect')
            .call(this.zoom.transform, transform);

        //fit the bars into the brush window subBars: first identify the rows
        const subBars = this.d3
            .selectAll('.context .row-container')
            .data(
                this.visualizationData.traineeProgress.filter(
                    (d) => d.displayRun
                )
            )
            .attr('run-id', (d) => {
                return d.trainingRunId;
            });
        // then map the row data on each rect using the run-id
        subBars
            .attr('height', this.brushYScale.bandwidth())
            .each((d, i, nodes) => {
                this.d3
                    .select(nodes[i])
                    .selectAll('rect')
                    .attr('height', this.brushYScale.bandwidth())
                    .attr('y', this.brushYScale(d.trainingRunId));
            });
    }

    setWidth() {
        // set left side for trainee names by the longest name
        // 20 = additional margin before name
        this.margin.left =
            Math.max(
                ...this.visualizationData.trainees.map(
                    (trainee) => trainee.name.length
                )
            ) *
                this.approxFontWidth +
            20;

        // set right side for trainee times by the duration (only times or with days?)
        this.margin.right =
            this.getTimeString(
                this.visualizationData.currentTime -
                    this.visualizationData.startTime
            ).length *
                this.approxFontWidth +
            20; // 20 = additional margin after time

        this.width =
            (this.d3.select('.progress-container').node() as HTMLElement)
                .offsetWidth -
            this.margin.left -
            this.margin.right;
    }

    setHeight() {
        this.chartHeight =
            PROGRESS_CONFIG.traineeRowHeight * this.filteredTrainees.length;
        this.height = this.chartHeight + this.brushHeight;
    }

    onResize() {
        this.updateProgressChart();
    }

    updateXScale() {
        this.customRestrictedXScale.min = 0;
        this.customRestrictedXScale.max =
            this.visualizationData.currentTime -
            this.visualizationData.startTime;
        this.timelineStepSize =
            (this.visualizationData.currentTime -
                this.visualizationData.startTime) /
            200;

        this.minXAxisVal = this.restrictToVisibleTrainees
            ? this.traineeRestrictedXScale.min
            : this.restrictToCustomTimelines
            ? this.visualizationData.startTime +
              this.customRestrictedXScale.minRestriction
            : this.visualizationData.startTime;
        this.maxXAxisVal = this.restrictToVisibleTrainees
            ? this.traineeRestrictedXScale.max
            : this.restrictToCustomTimelines
            ? this.visualizationData.currentTime -
              this.customRestrictedXScale.maxRestriction
            : this.visualizationData.currentTime;

        const maxStripTime = this.restrictToVisibleTrainees
            ? 0
            : Math.min(
                  this.stripUnfinishedTimes,
                  this.traineeRestrictedXScale.inactive
              );
        this.getMaxTime.emit(
            this.visualizationData.currentTime -
                this.visualizationData.startTime
        );
        this.getStepSize.emit(this.timelineStepSize);
        this.xScale = this.d3
            .scaleTime()
            .domain([this.minXAxisVal, this.maxXAxisVal - maxStripTime])
            .range([0, this.width]);
    }

    restrictXScaleToVisibleRange(traineeRuns: any[]) {
        const initialStartTime = this.visualizationData.startTime;
        const initialEndTime = this.visualizationData.currentTime;
        let inactiveEndInterval = 0;
        const startTimes = traineeRuns.map((value) =>
            value.levels.length > 0
                ? value.levels[0].startTime
                : initialStartTime
        );
        const endTimes = traineeRuns
            .map((value) => {
                const levelLength = value.levels.length;
                if (levelLength > 0) {
                    // if we have levels, we get info from them
                    if (value.levels[levelLength - 1].endTime) {
                        // if the level has finished, get its end time
                        return value.levels[levelLength - 1].endTime;
                    }
                    //if the level has not finished, try to get info from events, if there are any
                    if (value.levels[levelLength - 1].events.length > 0) {
                        // there are events, get time from the last one
                        const lastTimestamp =
                            value.levels[levelLength - 1].events[
                                value.levels[levelLength - 1].events.length - 1
                            ].timestamp;
                        inactiveEndInterval =
                            this.visualizationData.currentTime - lastTimestamp;
                        return lastTimestamp;
                    } else {
                        // there is nothing, get the time of the level start time, increased by selected
                        const lastTimestamp =
                            value.levels[levelLength - 1].startTime;
                        inactiveEndInterval =
                            this.visualizationData.currentTime - lastTimestamp;
                        return this.visualizationData.currentTime;
                    }
                }
                return initialEndTime;
            })
            .filter((value) => value);
        this.traineeRestrictedXScale.min = Math.min(...startTimes);
        this.traineeRestrictedXScale.max = Math.max(...endTimes);
        this.traineeRestrictedXScale.inactive = inactiveEndInterval;
    }

    updateContextXScale() {
        const maxStripTime = Math.min(
            this.stripUnfinishedTimes,
            this.traineeRestrictedXScale.inactive
        );
        this.contextXScale = this.d3
            .scaleTime()
            .domain([this.minXAxisVal, this.maxXAxisVal - maxStripTime])
            .range([0, this.width]);

        this.svg.select('#clip-context rect').attr('y', this.chartHeight);
    }

    updateYScale(
        traineeData: TraineeProgressData[] = this.visualizationData
            .traineeProgress
    ) {
        this.yScale = this.d3
            .scaleBand<number>()
            // here we are using range of all elements of trainee progress in case that there is at least one trainee who played 2x
            .domain(traineeData.map((pp) => pp.trainingRunId))
            .range([0, this.chartHeight])
            .paddingOuter(this.gutter)
            .paddingInner(this.gutter);

        this.brushYScale = this.d3
            .scaleBand<number>()
            .domain(traineeData.map((pp) => pp.trainingRunId))
            .range([0, this.brushHeight - 20])
            .paddingInner(this.gutter * 0.5);
    }

    drawXAxis() {
        this.xAxis = this.d3
            .axisBottom(this.xScale)
            .ticks(7)
            .tickFormat((tickData) =>
                this.getTimeString(
                    tickData.valueOf() - this.visualizationData.startTime
                )
            );

        this.xAxisElem = this.svg
            .selectAll('.progress-chart-container')
            .append('g')
            .attr('class', 'x-axis')
            .attr('transform', 'translate(0,' + this.chartHeight + ')')
            .call(this.xAxis);
    }

    updateXAxis() {
        this.xAxisElem = this.svg
            .selectAll('.x-axis')
            .attr('transform', 'translate(0,' + this.chartHeight + ')');
    }

    drawTimeline() {
        this.svg.selectAll('.progress-chart-container .timeline').remove();

        this.svg
            .selectAll('.progress-chart-container .progress-row-container')
            .append('line')
            .attr('class', 'timeline')
            .attr('x1', this.xScale(this.visualizationData.currentTime))
            .attr('x2', this.xScale(this.visualizationData.currentTime))
            .attr('stroke', 'black')
            .attr('stroke-width', 2)
            .attr('y1', 1)
            .attr(
                'y2',
                this.yScale.bandwidth() *
                    this.filteredRuns.length *
                    (1 + this.gutter) +
                    1
            );

        this.d3
            .select('#progress-elapsed-time')
            .style(
                'left',
                this.margin.left +
                    this.xScale(this.visualizationData.currentTime) +
                    'px'
            );
    }

    initProgressChartContainer(): void {
        this.svg.append('g').attr('class', 'progress-chart-container');
    }

    initProgressRowsContainer(): void {
        this.svg
            .append('defs')
            .append('clipPath')
            .attr('id', 'clip')
            .append('rect')
            .attr('x', 0)
            .attr('width', this.width)
            .attr('height', this.chartHeight);

        const clip = this.svg
            .selectAll('.progress-chart-container')
            .append('g')
            .attr('clip-path', 'url(#clip)');

        clip.append('g').attr('class', 'progress-row-container');

        clip.append('g').attr('class', 'progress-row-events');
    }

    initProgressRow(): void {
        this.svg.selectAll('.row-container').remove();
        this.svg.selectAll('.empty-container').remove();

        this.svg
            .selectAll(
                '.progress-row-container,.progress-row-container-context'
            )
            .selectAll('.row-container')
            .data(this.filteredRuns)
            .enter()
            .append('g')
            .attr('class', (traineeProgress: ProgressTraineeInfo) => {
                return (
                    'run-' + traineeProgress.trainingRunId + ' row-container'
                );
            })
            .classed(
                'highlighted',
                (d: ProgressTraineeInfo) =>
                    this.highlightedTraineeRefId == d.userRefId
            )
            .on('mouseover', (event, d) => {
                this.d3
                    .select(event.currentTarget)
                    .classed('highlighted', true);
                const levelId = +this.d3.select(event.target).attr('level-id');
                const trainee = this.visualizationData.trainees.filter(
                    (trainee) => trainee.userRefId == d.userRefId
                )[0];
                const level = this.visualizationData.levels.filter(
                    (level) => level.id == levelId
                )[0];
                if (level == undefined) return; // we won't show tooltips for estimates

                this.tooltip.transition().duration(200).style('opacity', 0.9);

                // get the bounding box of a level to put the tooltip at its beginning
                const runBox = document
                    .getElementById(
                        'level-' + levelId + '-run-' + d.trainingRunId
                    )
                    .getBoundingClientRect();
                // furthermore, in the case of zoom, we need to place the tooltip into the visible chart area
                const progressBox = document
                    .querySelector(
                        '.progress-chart-container .zoom-listener-rect'
                    )
                    .getBoundingClientRect();
                const vizBox = document
                    .getElementById('viz-progress')
                    .getBoundingClientRect();
                const x =
                    runBox.x < progressBox.x
                        ? progressBox.x
                        : runBox.x + window.scrollX - vizBox.x;
                const y =
                    runBox.y +
                    window.scrollY -
                    this.yScale.bandwidth() -
                    vizBox.x +
                    this.tooltipOffset;
                this.tooltip
                    .html((): string => {
                        return (
                            'level <i>' +
                            level.title +
                            '</i> of trainee ' +
                            trainee.name
                        );
                    })
                    .style('left', x + 'px')
                    .style('top', y + 'px');
            })
            .on('mouseout', (event) => {
                this.d3
                    .select(event.currentTarget)
                    .classed('highlighted', false);
                this.tooltip
                    .transition()
                    .delay(100)
                    .duration(0)
                    .style('opacity', 0);
            })
            .exit()
            .remove();
    }

    drawFinished() {
        const finished = this.svg
            .selectAll('.row-container')
            .selectAll('.finished-trainee-segments')
            .data(
                (traineeProgress: TraineeProgressData) =>
                    traineeProgress.displayRun && traineeProgress.levels
            );

        finished
            .enter()
            .filter(
                (traineeLevel: ProgressLevelVisualizationData) =>
                    traineeLevel.state == 'FINISHED'
            )
            .append('rect')
            .attr('level-id', (d) => d.id)
            .attr('id', (_, i, j) => {
                const runId = (this.d3.select(j[i].parentNode).data() as any)[0]
                    .trainingRunId;
                return 'level-' + _.id + '-run-' + runId;
            })
            .attr('x', (traineeLevel: ProgressLevelVisualizationData) =>
                this.xScale(traineeLevel.startTime)
            )
            .attr('y', (_, i, j) =>
                this.yScale(
                    (this.d3.select(j[i].parentNode).data() as any)[0]
                        .trainingRunId
                )
            )
            .attr(
                'width',
                (traineeLevel: ProgressLevelVisualizationData) =>
                    this.xScale(traineeLevel.endTime) -
                    this.xScale(traineeLevel.startTime)
            )
            .attr('height', this.yScale.bandwidth())
            .attr(
                'fill',
                (d, i: string): string => PROGRESS_CONFIG.trainingColors[+i]
            )
            .attr('class', 'finished-trainee-segments');

        finished.exit().remove();
    }

    drawActive() {
        this.drawActiveElapsed();
        this.drawActiveEstimation();
    }

    drawActiveEstimation(): void {
        const activeEstimations = this.svg
            .selectAll('.row-container')
            .selectAll('.active-estimated-trainee-segments')
            .data((traineeProgress: TraineeProgressData) =>
                traineeProgress.levels.filter(
                    (traineeLevel: ProgressLevelVisualizationData) =>
                        traineeLevel.state == 'RUNNING'
                )
            );

        activeEstimations
            .enter()
            .append('rect')
            .attr('level-id', (d) => d.id)
            .attr('id', (_, i, j) => {
                const runId = (this.d3.select(j[i].parentNode).data() as any)[0]
                    .trainingRunId;
                return 'level-' + _.id + '-run-' + runId;
            })
            .attr('x', (traineeLevel: ProgressLevelVisualizationData) =>
                this.xScale(traineeLevel.startTime)
            )
            .attr('y', (_, i, j) =>
                this.yScale(
                    (this.d3.select(j[i].parentNode).data() as any)[0]
                        .trainingRunId
                )
            )
            .attr('width', (traineeLevel: ProgressLevelVisualizationData) => {
                return (
                    this.xScale(
                        this.getLevelById(traineeLevel.id).estimatedDuration *
                            60 +
                            traineeLevel.startTime
                    ) - this.xScale(traineeLevel.startTime)
                );
            })
            .attr(
                'fill',
                (traineeLevel: ProgressLevelVisualizationData) =>
                    'url(#diagonalHatch-' +
                    this.getActiveLevelColor(traineeLevel) +
                    ')'
            )
            .attr('height', this.yScale.bandwidth())
            .attr('class', 'active-estimated-trainee-segments');

        activeEstimations.exit().remove();
    }

    createStatePatterns() {
        const states = PROGRESS_CONFIG.levelsColorEstimates;
        this.svg
            .selectAll('defs')
            .selectAll('pattern')
            .data(states)
            .enter()
            .append('pattern')
            .attr('id', (d: string): string => 'diagonalHatch-' + d)
            .attr('patternUnits', 'userSpaceOnUse')
            .attr('width', '7')
            .attr('height', '4')
            .attr('patternTransform', 'rotate(45)')

            .append('rect')
            .attr('width', '3')
            .attr('height', '4')
            .attr('transform', 'translate(0,0)')
            .attr('fill', (d) => d)
            .style('opacity', 0.6);
    }

    drawActiveElapsed(): void {
        const activeElapsed = this.svg
            .selectAll('.row-container')
            .selectAll('.active-elapsed-trainee-segments')
            .data(
                (traineeProgress: TraineeProgressData) =>
                    traineeProgress.displayRun &&
                    traineeProgress.levels.filter(
                        (traineeLevel: ProgressLevelVisualizationData) =>
                            traineeLevel.state == 'RUNNING'
                    )
            );
        activeElapsed
            .enter()
            .append('rect')
            .attr('level-id', (d) => d.id)
            .attr('id', (_, i, j) => {
                const runId = (this.d3.select(j[i].parentNode).data() as any)[0]
                    .trainingRunId;
                return 'level-' + _.id + '-run-' + runId;
            })
            .attr('x', (traineeLevel: ProgressLevelVisualizationData) =>
                this.xScale(traineeLevel.startTime)
            )
            .attr('y', (_, i, j) =>
                this.yScale(
                    (this.d3.select(j[i].parentNode).data() as any)[0]
                        .trainingRunId
                )
            )
            .attr('width', (traineeLevel: ProgressLevelVisualizationData) => {
                const currentTime = this.restrictToVisibleTrainees
                    ? this.traineeRestrictedXScale.max
                    : this.visualizationData.currentTime;
                return (
                    this.xScale(currentTime) -
                    this.xScale(traineeLevel.startTime)
                );
            })
            .attr('height', this.yScale.bandwidth())
            .attr('fill', (d) =>
                this.d3
                    .hsl(this.getActiveLevelColor(d))
                    .brighter(1.2)
                    .toString()
            )
            .attr('class', 'active-elapsed-trainee-segments');

        activeElapsed.exit().remove();
    }

    getActiveLevelColor(traineeLevel: ProgressLevelVisualizationData) {
        const colors = PROGRESS_CONFIG.levelsColorEstimates;
        const levelTime =
            this.getLevelById(traineeLevel.id).estimatedDuration * 60;
        const currentLevelTime =
            this.visualizationData.currentTime - traineeLevel.startTime;

        if (currentLevelTime <= levelTime) return colors[0];
        if (currentLevelTime > levelTime && currentLevelTime < 2 * levelTime)
            return colors[1];
        return colors[2];
    }

    drawPlanned() {
        const planned = this.svg
            .selectAll('.row-container')
            .selectAll('.planned-trainee-segments')
            .data((traineeProgress) =>
                this.visualizationData.levels.filter(
                    (level) =>
                        !this.hasStarted(
                            level.id,
                            traineeProgress.trainingRunId
                        )
                )
            )
            .enter();

        planned
            .append('rect')
            .attr('x', (level: ProgressLevelInfo, i, j) =>
                this.xScale(
                    this.visualizationData.currentTime +
                        this.getPositionForPendingLevel(
                            level,
                            (this.d3.select(j[i].parentNode).data() as any)[0]
                        )
                )
            )
            .attr('y', (_, i, j) =>
                this.yScale(
                    (this.d3.select(j[i].parentNode).data() as any)[0]
                        .trainingRunId
                )
            )
            .attr(
                'width',
                (level: Level) =>
                    this.xScale(
                        // info level doesn't have estimated duration, so in case of info level we provide one
                        (level.estimatedDuration > 0
                            ? level.estimatedDuration
                            : PROGRESS_CONFIG.defaultEstimatedTime) *
                            60 +
                            this.visualizationData.startTime
                    ) - this.xScale(this.visualizationData.startTime)
            )
            .attr(
                'fill',
                'url(#diagonalHatch-' +
                    PROGRESS_CONFIG.levelsColorEstimates[3] +
                    ')'
            )
            .attr('height', this.yScale.bandwidth())
            .attr('class', 'planned-trainee-segments');

        planned.exit().remove();
    }

    setFilteredTrainees(trainees: ProgressTraineeInfo[]) {
        this.filteredTrainees = trainees;
        this.updateProgressChart();
    }

    setHighlightedTrainee(trainee: ProgressTraineeInfo) {
        const rows = this.svg.selectAll(
            '.progress-row-container,.progress-row-container-context'
        );

        if (!trainee) {
            rows.selectAll('.row-container').classed('highlighted', false);
            return;
        }

        this.highlightedTraineeRefId = trainee.userRefId;
        const training = this.visualizationData.traineeProgress.find(
            (p) => p.userRefId == this.highlightedTraineeRefId
        );

        if (!training) return;
        rows.select(
            '.run-' + training.trainingRunId + '.row-container'
        ).classed('highlighted', true);
    }

    getLevelById(levelId: number): ProgressLevelInfo {
        return this.visualizationData.levels.find(
            (level) => level.id === levelId
        );
    }

    hasStarted(levelId: number, trainingRunId: number) {
        return this.visualizationData.traineeProgress
            .find(
                (traineeProgress) =>
                    traineeProgress.trainingRunId === trainingRunId
            )
            .levels.some((level) => level.id === levelId);
    }

    getPositionForPendingLevel(
        level: ProgressLevelInfo,
        traineeProgress: ProgressTraineeInfo
    ) {
        // get all levels
        const estimation = this.visualizationData.levels
            //filter levels that have already started by trainee
            .filter(
                (l) => !this.hasStarted(l.id, traineeProgress.trainingRunId)
            )
            // not interested in levels with higher order than our level because they are not affecting its x position
            .filter((l) => l.order < level.order)
            //sum estimated durations of all planned < than our level
            .reduce((total, current) => total + current.estimatedDuration, 0);
        // convert from minutes to seconds
        return estimation * 60;
    }

    groupEvents(transformScale = 1): void {
        const eventIconSize: number = PROGRESS_CONFIG.eventProps.eventIconSize;
        const runsWithEvents = JSON.parse(
            JSON.stringify(this.visualizationData.traineeProgress)
        )
            .map((run) => {
                // first filter out the parts of the runs which don't contain typed events or are filtered out
                // (we don't need to display those)
                run.levels = run.levels.map((level) => {
                    level.events = level.events.filter(
                        (e) => e.type != undefined
                    );
                    return level;
                });
                run.levels = run.levels.filter(
                    (level) => level.events.length > 0
                );
                return run;
            })
            .filter(
                (progress) => progress.levels.length > 0 && progress.displayRun
            );

        // group all close events together
        runsWithEvents.forEach((run) => {
            run.eventGroups = [];
            run.levels.forEach((level) => {
                const group = [];
                level.events.forEach((ev, i) => {
                    // set some convenient params here
                    ev.position =
                        (this.xScale(ev.timestamp) -
                            this.xScale(this.visualizationData.startTime)) *
                        transformScale;
                    ev.trainingRunId = run.trainingRunId;
                    ev.levelState = level.state;

                    // if the current event is close to the previous one, add it to the previous group
                    if (
                        i > 0 &&
                        ev.position - level.events[i - 1].position <
                            eventIconSize * 0.9
                    ) {
                        group[group.length - 1].push(ev);
                    } else {
                        group[group.length] = [ev];
                    }
                });
                run.eventGroups.push(group);
            });
        });

        return runsWithEvents;
    }

    createEvents(transformScale = 1) {
        const runsWithEvents = this.groupEvents(transformScale);
        const eventProps = PROGRESS_CONFIG.eventProps;
        this.svg.selectAll('.row-events').remove();

        const eventLayers: any = this.svg
            .select('.progress-row-events')
            .selectAll('g.row-events')
            .data(runsWithEvents)
            .enter()
            .append('g')
            .attr('class', 'row-events')
            .style(
                'transform',
                (d) =>
                    'translate(' +
                    this.xScale(this.visualizationData.startTime) +
                    'px, ' +
                    this.yScale(d.trainingRunId) +
                    'px)'
            )
            .on('mouseover', (d) => {
                // preserve the team highlight
                this.svg
                    .select('.run-' + d.trainingRunId)
                    .classed('highlighted', true);
            })
            .on('mouseout', (d) => {
                // cancel the team highlight
                this.svg
                    .select('.run-' + d.trainingRunId)
                    .classed('highlighted', false);
            });

        eventLayers
            .selectAll('path.event')
            .data((d) => d.eventGroups.flat())
            .enter()
            .append('path')
            .attr('class', 'event')
            .attr('id', (d) => 'event-' + d[0].trainingTime)
            .style('display', (group) => this.setEventGroupVisibility(group))
            .attr('d', (group) => this.resolveEventGroupIcon(eventProps, group))
            .attr('fill', (d, i, nodes) => {
                const teamStruct = this.d3.select(nodes[i].parentNode).datum();
                const levelInfo = teamStruct['levels'].filter(
                    (level) => level.id == d[0].levelId
                )[0];
                if (d[0].levelState == 'FINISHED') {
                    return PROGRESS_CONFIG.levelsColorEstimates[3];
                } else {
                    return this.getActiveLevelColor(levelInfo);
                }
            })
            .attr('stroke', '#eee')
            .attr('transform', (group): string => {
                let y =
                    this.yScale.bandwidth() * 0.5 -
                    eventProps.eventIconSize / 2;
                y -= group.length > 1 ? 1.5 : 0;
                let x = group[0].position - eventProps.eventIconSize / 2;
                x -= group.length > 1 ? 1 : 0;
                const scale = group.length > 1 ? 1.15 : 1; // a group with multiple events is a bit enlarged
                return 'translate(' + x + ',' + y + ') scale(' + scale + ')';
            })
            .on('mouseover', (event, d) => {
                this.tooltip.transition().duration(200).style('opacity', 0.9);

                const id = this.d3.select(event.target).attr('id');
                const runBox = document
                    .getElementById(id)
                    .getBoundingClientRect();
                const vizBox = document
                    .getElementById('viz-progress')
                    .getBoundingClientRect();
                const x = runBox.x + window.scrollX - vizBox.x;
                const y =
                    runBox.y +
                    window.scrollY -
                    this.yScale.bandwidth() -
                    vizBox.x;
                this.tooltip
                    .html((): string => {
                        let text = '';
                        d.forEach((event) => {
                            const item = [];
                            item.push(
                                '<span class="progress-tooltip-item">',
                                '<svg width="14" height="14" viewBox="0 0 16 16">',
                                '<path d="' +
                                    eventProps.eventShapes[event.type] +
                                    '"/>',
                                '</svg>',
                                this.resolveEventTooltip(event),
                                '</span>'
                            );
                            text += item.join('');
                        });
                        return text;
                    })
                    .style('left', x + 'px')
                    .style('top', y + 'px');
            })
            .on('mouseout', () => {
                this.tooltip.transition().duration(0).style('opacity', 0);
            });

        eventLayers
            .selectAll('text.event-number')
            .data((d) => d.eventGroups.flat())
            .enter()
            .append('text')
            .filter((group) => group.length > 1)
            .style('display', (group) => this.setEventGroupVisibility(group))
            .attr('class', 'event-number')
            .attr(
                'y',
                () => this.yScale.bandwidth() - eventProps.eventIconSize / 2 - 1
            )
            .attr('x', (group) => group[0].position + 0.5)
            .text((group): string => group.length.toString());
    }

    resolveEventGroupIcon(eventProps, group) {
        const allEqual = (group) => group.every((val) => val === group[0]);

        if (allEqual && group.length > 1 && group[0].type == 'hint')
            return eventProps.eventShapes['group'];
        return eventProps.eventShapes[allEqual ? group[0].type : 'group'];
    }

    resolveEventTooltip(event: Event) {
        switch (event.type) {
            case 'hint':
                return (
                    'Hint <i>' +
                    (event as unknown as HintTakenEvent).hintTitle +
                    '</i> taken'
                );
            case 'wrong':
                return (
                    'Wrong answer <i>' +
                    (event as unknown as WrongAnswerEvent).answerContent +
                    '</i> submitted'
                );
            case 'solution':
                return 'Solution displayed';
        }
        return '';
    }

    updateSideColumns() {
        const traineesInfo = this.visualizationData.trainees;
        const traineeRuns = this.visualizationData.traineeProgress.filter(
            (d) => d.displayRun
        );
        this.addTraineeName(traineeRuns, traineesInfo);
        this.addTraineeAvatar(traineeRuns, traineesInfo);
        this.addTimeColumn(traineeRuns);
    }

    showTraineeDetail(data) {
        this.traineeDetailId = data.userRefId;
    }

    stripInactiveTime(value: number) {
        this.stripUnfinishedTimes = value;
        this.updateProgressChart();
    }

    stripInactiveTimeInput(event) {
        this.stripInactiveTime(event.target.value);
    }

    getTraineeData(traineeId: number) {
        return this.visualizationData.trainees.find(
            (trainee) => trainee.userRefId == traineeId
        );
    }

    onTraineeDetailChange() {
        this.traineeDetailId = null;
    }

    setSort(level: any) {
        console.log('sort deprecated');
    }

    onSortValueChange(
        sortType: string,
        sortReverse: boolean,
        levelIndex?: number
    ): void {
        this.sortType = sortType;
        this.sortReverse = sortReverse;
        this.updateProgressChart();
    }

    public getTimeString(seconds: number): string {
        return DateUtils.formatDurationFull(seconds);
    }

    createZoomListener() {
        return this.svg
            .selectAll('.progress-chart-container')
            .append('rect')
            .attr('class', 'zoom-listener-rect')
            .attr('x', 0)
            .attr('y', 0)
            .attr('width', this.width)
            .attr('height', this.chartHeight)
            .style('pointer-events', 'none')
            .style('opacity', 0);
    }

    updateZoomListenerAndBrush() {
        //move the main view container with the trainee rows
        this.svg
            .selectAll('.zoom-listener-rect')
            .attr('width', this.width)
            .attr('height', this.chartHeight);

        //move the zoom and brush small window
        this.brush = this.d3
            .brushX()
            .extent([
                [0, this.height - this.brushHeight],
                [this.width, this.height],
            ])
            .on('brush', (event) => this.brushed(event));

        this.svg
            .select('.progress-row-container-context')
            .attr(
                'transform',
                'translate(0,' + (this.height - this.brushHeight + 20) + ')'
            ); //20 = x axis height

        this.svg
            .select('.brush')
            .call(this.brush)
            .call(this.brush.move, this.brushSelection);
    }

    createTooltip() {
        this.tooltip = this.d3
            .select('.progress-container')
            .append('div')
            .attr('class', 'progress-tooltip')
            .style('opacity', 0);
    }

    onZoomReset() {
        this.zoomed(null, true);
    }

    /*
    TODO: Old stuff, this will not function properly now when the events group regardless their type
     */
    private setEventGroupVisibility(group) {
        if (this.externalFilters === undefined) return 'block';
        if (group[0][0].type === 'hint') {
            return this.externalFilters.hintFilter.checked ? 'block' : 'none';
        }
        if (group[0][0].type === 'wrong') {
            return this.externalFilters.wrongAnswerFilter.checked
                ? 'block'
                : 'none';
        }
        if (group[0][0].type === 'skip') {
            return this.externalFilters.skipFilter.checked ? 'block' : 'none';
        }
        return 'block';
    }

    private addTraineeName(
        traineeRuns: TraineeProgressData[],
        traineeInfo: ProgressTraineeInfo[]
    ) {
        this.svg
            .select('.progress-chart-container')
            .select('.trainee-names')
            .remove();

        this.svg
            .select('.progress-chart-container')
            .append('g')
            .attr('class', 'trainee-names')
            .selectAll('text.data-trainee')
            .data(traineeRuns)
            .enter()
            .append('text')
            .attr('trainee-id', (d) => d.userRefId)
            .text(
                (d) =>
                    traineeInfo.filter((p) => p.userRefId == d.userRefId)[0]
                        .name
            )
            .attr(
                'y',
                (d) =>
                    this.yScale(d.trainingRunId) + this.yScale.bandwidth() * 0.7
            )
            .attr('x', -40)
            .attr('width', 200)
            .style('text-anchor', 'end')
            .attr('cursor', 'pointer')
            .on('click', (event, d) => this.showTraineeDetail(d));
    }

    private addTraineeAvatar(
        traineeRuns: TraineeProgressData[],
        traineeInfo: ProgressTraineeInfo[]
    ) {
        this.svg
            .select('.progress-chart-container')
            .select('.trainee-avatars')
            .remove();

        this.svg
            .select('.progress-chart-container')
            .append('g')
            .attr('class', 'trainee-avatars')
            .selectAll('text.data-trainee')
            .data(traineeRuns)
            .enter()
            .append('image')
            .attr('trainee-id', (d) => d.userRefId)
            .attr(
                'xlink:href',
                (d) =>
                    'data:image/png;base64,' +
                    traineeInfo.filter((p) => p.userRefId == d.userRefId)[0]
                        .picture
            )
            .attr('width', 15)
            .attr('height', 15)
            .attr(
                'y',
                (d) =>
                    this.yScale(d.trainingRunId) + this.yScale.bandwidth() * 0.2
            )
            .attr('x', -25)
            .attr('cursor', 'pointer');
    }

    private addTimeColumn(traineeRuns: TraineeProgressData[]) {
        this.svg
            .select('.progress-chart-container')
            .select('.trainee-times')
            .remove();

        this.svg
            .select('.progress-chart-container')
            .append('g')
            .attr('class', 'trainee-times')
            .selectAll('text.time-trainee')
            .data(traineeRuns)
            .enter()
            .append('text')
            .attr('trainee-id', (d) => d.userRefId)
            .text((d) => this.getTimeString(this.getTraineeTime(d)))
            .attr('width', 100)
            .attr(
                'y',
                (d) =>
                    this.yScale(d.trainingRunId) + this.yScale.bandwidth() * 0.7
            )
            .attr('x', this.width + 10);
    }

    // progress: set start offsets -> place level time plan ->

    // idea2: set start offsets -> draw played from trainee start up to time line -> draw plan from time line to the end
}
