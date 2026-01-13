import {
    AfterViewInit,
    Component,
    computed,
    inject,
    input,
    OnChanges,
    output,
    signal,
    ViewEncapsulation,
} from '@angular/core';
import { PROGRESS_CONFIG } from '../../../progress-config';
import { TraineeViewEnum, ViewEnum } from '../../types';
import {
    HintTakenEvent,
    PlanDataEntry,
    PreparedData,
    ProgressDataEntry,
    ProgressEvent,
    ProgressLevelInfo,
    ProgressLevelVisualizationData,
    ProgressTraineeInfo,
    ProgressVisualizationData,
    TrainingData,
    TrainingDataEntry,
    TrainingRunEndedEvent,
    WrongAnswerEvent,
} from '@crczp/visualization-model';
import { TrainingAnalysisEventService } from './training-analysis-event-service';
import { BaseConfig, Padding } from '../../../base-config';
import { D3, D3Service } from '../../../../common/d3-service/d3-service';
import { Axis, ScaleBand, ScaleLinear } from 'd3';
import { PlanConfig, PlanData } from '../../../plan-config';
import { FilteringService } from '../../../services/filtering.service';
import { ProgressConfigService } from '../../../services/progress-config.service';
import { SortingService } from '../../../services/sorting.service';
import { AbstractLevelTypeEnum } from '@crczp/training-model';
import { TraineeDetailComponent } from '../trainee-detail/trainee-detail.component';
import { ColumnHeaderComponent } from '../column-header/column-header.component';
import { CommonModule } from '@angular/common';
import { MouseWheelDirective } from '../../../directives/mousewheel.directive';
import { MouseMoveDirective } from '../../../directives/mousemove.directive';
import { LegendComponent } from '../legend/legend.component';
import { FormsModule } from '@angular/forms';
import { Utils } from '@crczp/utils';

@Component({
    selector: 'crczp-viz-hurdling',
    templateUrl: './training-analysis.component.html',
    styleUrls: ['./training-analysis.component.css'],
    encapsulation: ViewEncapsulation.None,
    imports: [
        CommonModule,
        TraineeDetailComponent,
        ColumnHeaderComponent,
        MouseWheelDirective,
        MouseMoveDirective,
        LegendComponent,
        FormsModule,
    ],
})
export class TrainingAnalysisComponent implements OnChanges, AfterViewInit {
    private static readonly DATA_COLUMN_MAPPING = {
        team: 'ctf-progress-teamcolumn',
        time: 'ctf-progress-timecolumn',
        score: 'ctf-progress-scorecolumn',
        hints: 'ctf-progress-hintscolumn',
        answers: 'ctf-progress-answerscolumn',
        compare: 'ctf-progress-comparecolumn',
    };
    private static readonly FONT_WIDTH_APPROXIMATION = 10;
    // Inputs
    readonly visualizationData = input.required<ProgressVisualizationData>();
    readonly trainingInstanceId = input.required<number>();
    readonly selectedTrainees = input<ProgressTraineeInfo[]>([]);
    readonly view = input<ViewEnum>(PROGRESS_CONFIG.defaultView);
    readonly selectedTraineeView = input<TraineeViewEnum>(TraineeViewEnum.Both);
    readonly colorScheme = input<string[]>(undefined);
    readonly eventService = input<TrainingAnalysisEventService>();
    readonly setDashboardView = input<boolean>(false);
    readonly trainingColors = input<string[]>(PROGRESS_CONFIG.trainingColors);
    readonly traineeColorScheme = input<string[]>(
        PROGRESS_CONFIG.traineeColors,
    );
    // Outputs
    readonly outputSelectedTrainees = output<number[]>();
    readonly highlightedTrainee = output<number>();
    // Constants
    protected readonly COLUMNS: string[] = [
        'time',
        'score',
        'hints',
        'answers',
    ];
    // Signals
    protected readonly filteredTrainees = signal<ProgressTraineeInfo[]>([]);
    protected errorMessage = signal<string | null>(null);
    protected traineeDetailId = signal<number | null>(null);

    // Computed signals
    protected readonly time = computed(() => this.getTime());
    protected readonly startTime = computed(() =>
        this.getFirstEventTimestamp(),
    );
    // Properties
    protected filterStatus = '';
    protected sortType = 'name';
    protected sortReverse = false;
    protected sortLevel = 0;
    protected levelSortOptions: any[] = [];
    protected selectedFilterValue = 1;
    protected hasData = false;
    protected runsToCompare: Array<{ id: string; avatar: string }> = [];
    protected readonly PROGRESS_CONFIG = PROGRESS_CONFIG;
    // Services
    private readonly sortingService = inject(SortingService);
    private readonly filteringService = inject(FilteringService);
    private readonly configService = inject(ProgressConfigService);
    private readonly d3: D3 = inject(D3Service).getD3();
    private wrapperWidth: number;
    private wrapperHeight: number;
    private width: number;
    private height: number;
    private padding: Padding;
    private bounds: any;
    private fullTime: number;
    private trainingDataSet: TrainingDataEntry[] = [];
    private levelKeys: string[] = [];
    private levelsTimePlan: number[];
    private selectedTraineeIds: number[] = [];
    // domains
    private planDomain: number;
    private trainingDomain: number;
    // references to svg elements
    private readonly elementRefs: {
        outerWrapper: any;
        chart: any;
        plan: any;
        planSegments: any;
        tooltip: any;
        trainingChartWrapper: any;
        trainingChart: any;
        boundSegments: any;
        yScale: ScaleBand<string>;
        xScale: ScaleLinear<number, number>;
        xAxis: Axis<number | { valueOf(): number }>;
    } = {
        outerWrapper: null,
        chart: null,
        plan: null,
        planSegments: null,
        tooltip: null,
        trainingChartWrapper: null,
        trainingChart: null,
        boundSegments: null,
        xScale: null,
        yScale: null,
        xAxis: null,
    };
    // zooming
    private panValue = 0;
    private overviewZoomValue = 1;
    private zoomValue = 1;
    private trainingData: TrainingData;
    private planData: PlanData;

    ngOnChanges(): void {
        this.configService.trainingColors = this.trainingColors();
        this.drawChart();
    }

    ngAfterViewInit(): void {
        this.setData();
        this.setFilterStatus();
        this.initializeZoom();
        this.setColumnsWidth();
    }

    setData() {
        this.trainingDataSet = this.populateTrainingDataset();
        this.levelsTimePlan = this.getLevelsTimePlan();
        this.levelKeys = this.getLevelKeys();
        this.drawChart();
    }

    getTime(): number {
        const allFinished =
            this.visualizationData()
                .traineeProgress.map(
                    (traineeProgress) => traineeProgress.levels,
                )
                .reduce((accumulator, value) => accumulator.concat(value), [])
                .map((levels) => levels.events)
                .reduce((accumulator, value) => accumulator.concat(value), [])
                .filter((event) => event instanceof TrainingRunEndedEvent)
                .length == this.visualizationData().traineeProgress.length;

        if (allFinished) {
            return this.getLatestEventTimestamp() - this.startTime();
        } else {
            return this.visualizationData().currentTime - this.startTime();
        }
    }

    getLatestEventTimestamp(): number {
        return this.visualizationData()
            .traineeProgress.map((traineeProgress) => traineeProgress.levels)
            .reduce((accumulator, value) => accumulator.concat(value), [])
            .map((levels) => levels.events)
            .reduce((accumulator, value) => accumulator.concat(value), [])
            .map((event) => event.timestamp)
            .sort()
            .pop();
    }

    getFirstEventTimestamp(): number {
        return this.visualizationData()
            .traineeProgress.map((traineeProgress) => traineeProgress.levels)
            .reduce((accumulator, value) => accumulator.concat(value), [])
            .map((levels) => levels.events)
            .reduce((accumulator, value) => accumulator.concat(value), [])
            .map((event) => event.timestamp)
            .sort((a, b) => b - a)
            .pop();
    }

    populateTrainingDataset(): TrainingDataEntry[] {
        const trainingDataSet = [];
        this.visualizationData().traineeProgress.forEach((traineeProgress) => {
            const trainingDataEntry = new TrainingDataEntry();
            trainingDataEntry.trainingRunId = traineeProgress.trainingRunId;
            trainingDataEntry.traineeId = traineeProgress.userRefId;
            trainingDataEntry.traineeName = this.getTraineeData(
                traineeProgress.userRefId,
            ).name;
            trainingDataEntry.traineeAvatar = this.getTraineeData(
                traineeProgress.userRefId,
            ).picture;
            trainingDataEntry.teamIndex = this.getTraineeData(
                traineeProgress.userRefId,
            ).teamIndex;
            trainingDataEntry.hints = this.getHintsForTrainee(
                traineeProgress.userRefId,
            );
            trainingDataEntry.score = this.getScoreForTrainee(
                traineeProgress.userRefId,
            );
            trainingDataEntry.answers = this.getAnswersForTrainee(
                traineeProgress.userRefId,
            );
            trainingDataEntry.events = this.getEventsForTrainee(
                traineeProgress.userRefId,
            );
            trainingDataEntry.totalTime = this.getTotalTime(
                traineeProgress.userRefId,
            );
            trainingDataEntry.currentState = this.getStateForTrainee(
                traineeProgress.userRefId,
            );
            trainingDataEntry['start'] =
                this.getFirstLevelTimestamp(traineeProgress.userRefId) -
                this.startTime();
            traineeProgress.levels.forEach((level, index = 1) => {
                if (level.state == 'FINISHED') {
                    trainingDataEntry['level' + (index + 1)] =
                        level.endTime - level.startTime;
                }
            });
            trainingDataSet.push(trainingDataEntry);
        });
        return trainingDataSet;
    }

    getFirstLevelTimestamp(traineeId: number): number {
        return this.getProgressLevelVisualizationDatas(traineeId)
            .values()
            .next().value.startTime;
    }

    getScoreForTrainee(traineeId: number): number {
        return this.getProgressLevelVisualizationDatas(traineeId)
            .map((level) => level.score)
            .reduce((a, b) => a + b);
    }

    getStateForTrainee(traineeId: number): string {
        const levelsFinishedCount = this.getProgressLevelVisualizationDatas(
            traineeId,
        ).filter((traineeLevel) => traineeLevel.state == 'FINISHED').length;
        return levelsFinishedCount == this.visualizationData().levels.length
            ? 'FINISHED'
            : 'level' + (levelsFinishedCount + 1);
    }

    getTotalTime(traineeId: number): number {
        const traineeStartTime =
            this.getFirstLevelTimestamp(traineeId) - this.startTime();
        if (this.getStateForTrainee(traineeId) == 'FINISHED') {
            const traineeLevels =
                this.getProgressLevelVisualizationDatas(traineeId);
            return (
                traineeLevels[traineeLevels.length - 1].events.slice(-1)[0]
                    .trainingTime -
                traineeStartTime +
                this.trainingDataSet.find(
                    (trainee) => trainee.traineeId == traineeId,
                )?.start
            );
        }
        return this.visualizationData().currentTime - traineeStartTime;
    }

    getHintsForTrainee(traineeId: number) {
        return this.getProgressLevelVisualizationDatas(traineeId)
            .map((level) => level.hintsTaken)
            .filter((hint) => hint != null)
            .reduce((a, b) => a.concat(b), []).length;
    }

    getAnswersForTrainee(traineeId: number) {
        return this.getProgressLevelVisualizationDatas(traineeId)
            .map((level) => level.wrongAnswers_number)
            .filter((wrongAnswerNumber) => wrongAnswerNumber != null)
            .reduce((a, b) => a + b, 0);
    }

    getEventsForTrainee(traineeId: number): ProgressEvent[] {
        return this.getProgressLevelVisualizationDatas(traineeId)
            .map((level) => level.events)
            .reduce((a, b) => a.concat(b), [])
            .map((event) => {
                event.levelNumber = this.getLevelNumber(event.levelId);
                event.traineeName = this.getTraineeData(traineeId).name;
                event.traineeId = traineeId;
                return event;
            });
    }

    getLevelNumber(levelId: number) {
        return (
            this.visualizationData().levels.find(
                (level) => level.id === levelId,
            ).order + 1
        );
    }

    getProgressLevelVisualizationDatas(
        traineeId: number,
    ): ProgressLevelVisualizationData[] {
        return this.visualizationData().traineeProgress.find(
            (trainee) => trainee.userRefId == traineeId,
        ).levels;
    }

    getTraineeData(traineeId: number) {
        return this.visualizationData().trainees.find(
            (trainee) => trainee.userRefId == traineeId,
        );
    }

    getLevelsTimePlan() {
        return this.visualizationData().levels.map(
            (level: ProgressLevelInfo) =>
                level.estimatedDuration > 0 ? level.estimatedDuration * 60 : 60,
        );
    }

    setFilteredTrainees(trainees: ProgressTraineeInfo[]) {
        this.filteredTrainees.set(trainees);
        this.drawChart();
    }

    drawChart(): void {
        const data: PreparedData = this.getPreparedData();
        this.applyData(data.trainingDataSet, data.planDataSet);
        this.pan();
    }

    initializeZoom(): void {
        if (typeof this.planDomain !== 'undefined') {
            // in the case of overview mode, we initially want to see only the trainee progress, not the whole training plan
            this.overviewZoomValue = Math.max(
                // but we don't want the zooming to be extreme
                Math.min(
                    PROGRESS_CONFIG.maxZoomValue,
                    this.elementRefs.xScale(this.planDomain) /
                        this.elementRefs.xScale(this.time()),
                ),
                1,
            );
            this.zoomValue = this.overviewZoomValue;
        }
    }

    getPreparedData(): PreparedData {
        const filteredTrainingDataSet = this.filteringService.filter(
            this.trainingDataSet,
            this.selectedFilterValue,
        );

        let sortedTrainingDataSet = this.sortingService.sort(
            filteredTrainingDataSet,
            this.sortReverse,
            this.sortType,
            this.sortLevel,
            this.visualizationData().levels,
        );
        let sortedPlanDataSet = this.getUpdatedPlanDataSet(
            sortedTrainingDataSet,
        );

        // filter out the trainees from trainee selection component
        if (this.selectedTrainees()) {
            sortedTrainingDataSet = sortedTrainingDataSet.filter((data) =>
                this.selectedTrainees().find(
                    (trainee) => trainee.userRefId === data.traineeId,
                ),
            );
            sortedPlanDataSet = sortedPlanDataSet.filter((data) =>
                this.selectedTrainees().find(
                    (trainee) => trainee.userRefId === data.traineeId,
                ),
            );
        } else if (!this.selectedTrainees() && this.filteredTrainees()) {
            sortedTrainingDataSet = sortedTrainingDataSet.filter(
                (dataRow) =>
                    this.filteredTrainees().find(
                        (trainee) => trainee.name === dataRow.traineeName,
                    ) !== undefined,
            );
            sortedPlanDataSet = sortedPlanDataSet.filter(
                (dataRow) =>
                    this.filteredTrainees().find(
                        (trainee) => trainee.name === dataRow.traineeName,
                    ) !== undefined,
            );
        }
        return {
            trainingDataSet: sortedTrainingDataSet,
            planDataSet: sortedPlanDataSet,
        };
    }

    getUpdatedPlanDataSet(trainingDataSet: object[]): PlanDataEntry[] {
        const planDataset: PlanDataEntry[] = [];

        trainingDataSet.forEach((d: TrainingDataEntry) => {
            const planDataEntry = new PlanDataEntry();
            planDataEntry.traineeName = d.traineeName;
            planDataEntry.traineeId = d.traineeId;
            planDataEntry['start'] = 0;
            this.visualizationData().levels.forEach((level, index) => {
                planDataEntry['level' + (level.order + 1)] =
                    this.levelsTimePlan[index];
            });
            planDataset.push(planDataEntry);
        });
        return planDataset;
    }

    applyData(trainingDataSet: any[], planDataSet): void {
        if (trainingDataSet.length === 0 || planDataSet.length === 0) {
            this.hasData = false;
            this.clear();
            return;
        }

        this.hasData = true;

        this.trainingData = {
            time: this.time(),
            levels: this.visualizationData().levels,
            keys: this.levelKeys,
            teams: trainingDataSet,
        };

        const planData = {
            keys: this.levelKeys,
            teams: planDataSet,
        };

        this.levelSortOptions = [];

        const estimatedTime = this.getEstimatedTime();
        this.fullTime = this.trainingData.time;
        this.drawChartBase({
            data: planData,
            element: 'ctf-progress-chart',
            outerWrapperElement: 'ctf-progress-wrapper',
            time: 0,
            padding: {
                top: 10,
                bottom: 40,
            },
            minBarHeight: PROGRESS_CONFIG.minBarHeight,
            maxBarHeight: PROGRESS_CONFIG.maxBarHeight,
            estimatedTime: estimatedTime,
        });

        this.drawPlan({
            data: planData,
            time: 0,
            estimatedTime: estimatedTime,
        });

        this.drawTraining({
            data: this.trainingData,
            eventShapePaths: this.getEventShapePaths(),
            currentLevelColor: PROGRESS_CONFIG.darkColor,
            time: this.trainingData.time,
        });

        this.addDataColumns();
    }

    getEstimatedTime(): number {
        return this.levelsTimePlan.reduce((a, b) => a + b, 0);
    }

    getLongestEstimate(): number {
        let longestEstimate = 0;
        const elapsedTime =
            this.visualizationData().currentTime -
            this.visualizationData().startTime;
        this.visualizationData().traineeProgress.forEach((traineeProgress) => {
            const remainingTime = traineeProgress.levels
                .map((traineeLevel, i) => {
                    return traineeLevel.state != 'FINISHED'
                        ? this.visualizationData().levels[i].estimatedDuration *
                              60
                        : 0;
                })
                .reduce((a, b) => a + b, 0);
            const estimate = elapsedTime + remainingTime;
            if (longestEstimate < estimate) {
                longestEstimate = estimate;
            }
        });
        return longestEstimate;
    }

    drawChartBase(baseConfig: BaseConfig): void {
        const d3: D3 = this.d3,
            element: string = baseConfig.element,
            planData: PlanData = baseConfig.data,
            padding: Padding = baseConfig.padding,
            estimatedTime: number = baseConfig.estimatedTime,
            stack = d3.stack().keys(planData.keys).offset(d3.stackOffsetNone),
            layers = stack(planData.teams);
        //this.time.set(baseConfig.time);
        this.padding = padding;

        // clear wrapper content
        d3.select('#' + element).html('');
        this.elementRefs.outerWrapper = d3.select(
            '.' + baseConfig.outerWrapperElement,
        );
        // create svg
        // calculate the height first, width can change when the scrollbar is added
        this.wrapperWidth = Math.max(
            document.getElementById(element)?.getBoundingClientRect().width, // original (standalone) size
            window.innerWidth - window.innerWidth * 0.37,
        ); // get width in the dashboard as a 75% piece of a halfpage
        const maxHeight: number = Math.min(
            this.wrapperWidth * 0.7,
            window.innerHeight - 130,
            baseConfig.maxBarHeight * planData.teams.length,
        );
        const minHeight: number =
            baseConfig.minBarHeight * planData.teams.length + 80;
        this.wrapperHeight = Math.max(maxHeight, minHeight);

        this.elementRefs.chart = d3
            .select('#' + element)
            .append('svg')
            .attr('class', 'ctf-progress-chart')
            .attr('height', this.wrapperHeight)
            .attr('width', this.wrapperWidth)
            .attr('transform', 'translate(0, ' + padding.top + ')');

        this.width = this.wrapperWidth * this.zoomValue;
        this.height = this.wrapperHeight - padding.top - padding.bottom;

        this.planDomain = Math.max(
            estimatedTime,
            d3.max(layers[layers.length - 1], (d: number[]): number => {
                return d[1];
            }),
        );

        this.initializeScales(planData);
        this.createAxis(estimatedTime);
    }

    initializeScales(planData) {
        // init x and y scales
        let yScalePadding: number;
        if (this.wrapperHeight > 550) yScalePadding = 0.02;
        else yScalePadding = 0.05;

        const yDomain = planData.teams.map((d): string => d.traineeName);

        const paddingOffset = PROGRESS_CONFIG.finalViewBarPadding;
        this.elementRefs.xScale = this.d3
            .scaleLinear()
            .rangeRound([0, this.width - paddingOffset]);
        this.elementRefs.xScale.domain([0, this.planDomain]);
        this.elementRefs.yScale = this.d3
            .scaleBand()
            .rangeRound([this.height, 0])
            .padding(yScalePadding);
        this.elementRefs.yScale.domain(yDomain);
    }

    createAxis(estimatedTime) {
        this.elementRefs.xAxis = this.d3
            .axisBottom(this.elementRefs.xScale)
            .tickFormat((d) => this.getXAxisTickFormat(d))
            .tickSize(5)
            .tickValues(
                this.d3.range(0, estimatedTime, this.getXAxisTickInterval()),
            );

        this.elementRefs.trainingChartWrapper = this.elementRefs.chart
            .append('g')
            .attr('class', 'ctf-training-overview');
        this.elementRefs.trainingChart = this.elementRefs.trainingChartWrapper
            .append('g')
            .attr('class', 'ctf-training');

        // append x axis
        this.elementRefs.trainingChart
            .append('g')
            .attr('class', 'axis axis-x')
            .attr('transform', 'translate(0,' + (this.height + 10) + ')')
            .call(this.elementRefs.xAxis);

        this.elementRefs.trainingChart
            .append('text')
            .attr(
                'transform',
                'translate(' +
                    (this.wrapperWidth / 2) * this.zoomValue +
                    ', ' +
                    this.wrapperHeight +
                    ')',
            )
            .style('text-anchor', 'middle')
            .text('Time');
    }

    getXAxisTickFormat(data): string {
        return this.wrapperWidth > 650
            ? this.getTimeString(data)
            : this.getTimeString(data).substring(0, 5);
    }

    getXAxisTickInterval(): number {
        let interval: number =
            this.wrapperWidth < 500
                ? 1800
                : this.elementRefs.xScale(this.fullTime) < 1000
                  ? 300
                  : 900;
        if (this.wrapperWidth > 500 && this.wrapperWidth < 1200) {
            interval = 600;
        }
        return Math.floor(interval / Math.floor(this.zoomValue));
    }

    drawPlan(planConfig: PlanConfig): void {
        const d3: D3 = this.d3,
            planData: PlanData = planConfig.data,
            stack = d3.stack().keys(planData.keys).offset(d3.stackOffsetNone),
            layers = stack(planData.teams);
        this.elementRefs.plan = this.elementRefs.trainingChart
            .append('g')
            .attr('class', 'plan');

        this.createPattern(planData);
        this.createStatePatterns();
        const planLayers = this.createPlanLayersAndReturnThem(layers);
        this.createPlanSegments(planLayers);
        this.createBoundingLines(layers);
    }

    createPattern(planData) {
        const defs = this.elementRefs.plan.append('defs');
        const pattern = defs
            .selectAll('pattern')
            .data(planData.keys)
            .enter()
            .append('pattern')
            .attr('id', (d: object, i: string): string => 'diagonalHatch' + i)
            .attr('patternUnits', 'userSpaceOnUse')
            .attr('width', '7')
            .attr('height', '4')
            .attr('patternTransform', 'rotate(45)');
        pattern
            .append('rect')
            .attr('width', '3')
            .attr('height', '4')
            .attr('transform', 'translate(0,0)')
            .attr('fill', (r: object, i: string): string =>
                this.getPlanColor(+i),
            )
            .style('opacity', '0.5');
    }

    createPlanLayersAndReturnThem(layers) {
        return this.elementRefs.plan
            .selectAll('.plan-layer')
            .data(layers)
            .enter()
            .append('g')
            .attr('class', 'plan-layer')
            .style(
                'fill',
                (d: object, i: string): string =>
                    'url(#diagonalHatch' + i + ')',
            );
    }

    createPlanSegments(planLayers) {
        // draw segment (row in column) for each team
        const displayedParticipants = this.filteredTrainees
            ? this.filteredTrainees.length
            : this.visualizationData().trainees.length;

        let index = -1;
        this.elementRefs.planSegments = planLayers
            .selectAll('.plan-segment')
            .data((d: object): object => d)
            .enter()
            .append('rect')
            .style('fill', (d): string => {
                return (
                    'url(#diagonalHatch-' +
                    this.getSegmentColor(
                        d.data.traineeName,
                        Math.floor(++index / displayedParticipants),
                    ) +
                    ')'
                );
            })
            .attr('y', (d): number =>
                this.elementRefs.yScale(String(d.data.traineeName)),
            )
            .attr('x', (d): number => this.elementRefs.xScale(d[0]))
            .attr('height', this.elementRefs.yScale.bandwidth())
            .attr(
                'width',
                (d): number =>
                    this.elementRefs.xScale(d[1]) -
                    this.elementRefs.xScale(d[0]),
            );
    }

    getSegmentColor(team: string, levelIndex: number): string {
        const teamData = this.trainingDataSet.find(
            (data) => data.traineeName === team,
        );
        const estimatedTimeForLevel = this.levelsTimePlan[levelIndex - 1];
        let previousLevelTime = 0;
        for (let i = 1; i <= levelIndex; i++) {
            if (teamData['level' + i]) {
                previousLevelTime += teamData['level' + i];
            }
        }

        const currentLevelTime =
            this.visualizationData().currentTime -
            previousLevelTime -
            teamData.start;
        if (teamData.currentState !== 'level' + levelIndex) {
            return 'gray';
        } else {
            if (currentLevelTime <= estimatedTimeForLevel) {
                return 'green';
            }
            if (
                estimatedTimeForLevel < currentLevelTime &&
                currentLevelTime <= 1.5 * estimatedTimeForLevel
            ) {
                return 'orange';
            }
            if (currentLevelTime > 1.5 * estimatedTimeForLevel) {
                return 'red';
            }
        }
        return 'gray';
    }

    createStatePatterns() {
        const states = ['green', 'orange', 'red', 'gray'];
        const defs = this.elementRefs.plan.append('defs');
        const pattern = defs
            .selectAll('pattern')
            .data(states)
            .enter()
            .append('pattern')
            .attr('id', (d: string): string => 'diagonalHatch-' + d)
            .attr('patternUnits', 'userSpaceOnUse')
            .attr('width', '7')
            .attr('height', '4')
            .attr('patternTransform', 'rotate(45)');
        pattern
            .append('rect')
            .attr('width', '3')
            .attr('height', '4')
            .attr('transform', 'translate(0,0)')
            .attr('fill', (d): string => d)
            .style('opacity', (color) => (color === 'gray' ? '0.5' : '1'));
    }

    createBoundingLines(layers) {
        // draw bounding lines for each team
        const boundWidth = 2;
        this.bounds = this.elementRefs.trainingChart
            .append('g')
            .attr('class', 'bounds');
        const boundGroups = this.bounds
            .selectAll('.bounds-layer')
            .data(layers)
            .enter()
            .append('g')
            .attr('class', 'bounds-layer')
            .style('fill', (d: object, i: string): string => {
                return this.getPlanColor(+i);
            });

        this.elementRefs.boundSegments = boundGroups
            .selectAll('rect.plan-bound')
            .data((d: object): object => d)
            .enter()
            .append('rect')
            .attr('y', (d): number =>
                this.elementRefs.yScale(String(d.data.traineeName)),
            )
            .attr('x', (d): string =>
                (<number>this.elementRefs.xScale(d[1]) - boundWidth).toString(),
            )
            .attr('height', this.elementRefs.yScale.bandwidth())
            .attr('width', boundWidth);
    }

    drawTraining(trainingConfig): void {
        const d3: D3 = this.d3,
            trainingData: any = trainingConfig.data,
            eventShapePaths = trainingConfig.eventShapePaths,
            stack = d3
                .stack()
                .keys(trainingData.keys)
                .offset(d3.stackOffsetNone),
            layers = stack(trainingData.teams); // !!

        this.trainingDomain = Math.max(
            this.time(),
            d3.max(
                layers[layers.length - 1],
                (d: number[]): number => d['data'].totalTime,
            ),
        );

        if (!isNaN(this.trainingDomain)) {
            this.elementRefs.xScale.domain([
                0,
                Math.max(this.planDomain, this.trainingDomain),
            ]);
        }

        this.updateXAxis();
        const layer = this.createColumnForEachLevel(layers);

        // draw segment (row in column) for each team
        this.createSegmentForEachTeam({
            layer: layer,
            trainingData: trainingData,
            layers: layers,
        });

        // update plan according to actual data
        this.updatePlan(trainingData);
        // tooltip for events
        this.createEventTooltips();

        const eventIconWidth = 17,
            groupCircleWidth = 18;

        // group events
        this.groupEvents(eventIconWidth);

        this.createEvents({
            trainingData: trainingData,
            eventShapePaths: eventShapePaths,
            groupCircleWidth: groupCircleWidth,
            eventIconWidth: eventIconWidth,
        });

        // pan bounds to top
        this.bounds.raise();

        // add labels to header above the bounds, for sorting by level time
        this.createSortingLabels(trainingData);
    }

    updateXAxis() {
        this.elementRefs.xAxis = this.d3
            .axisBottom(this.elementRefs.xScale)
            .tickFormat((d) => this.getXAxisTickFormat(d))
            .tickSize(5)
            .tickValues(
                this.d3.range(0, this.time(), this.getXAxisTickInterval()),
            );
        this.d3.select('.axis.axis-x').call(this.elementRefs.xAxis as any);
    }

    createColumnForEachLevel(layers) {
        const training = this.elementRefs.trainingChart
            .append('g')
            .attr('class', 'training');
        return training
            .selectAll('.training-layer')
            .data(layers)
            .enter()
            .append('g')
            .attr('class', 'training-layer')
            .attr('fill', (d, i: string) => this.getColor(+i));
    }

    createSegmentForEachTeam({ layer, trainingData, layers }) {
        const xScale: ScaleLinear<number, number> = this.elementRefs.xScale;
        layer
            .selectAll('rect.training-segment')
            .data((d) => d)
            .enter()
            .append('rect')
            .attr('y', (d): number =>
                this.elementRefs.yScale(d.data.traineeName),
            )
            .attr('x', (d, i: number): number => {
                const x: number = d[0];
                // when sorting by level, align the teams by this level
                if (this.sortType === 'level') {
                    if (typeof trainingData.teams[i].offsets === 'undefined') {
                        trainingData.teams[i].offsets = [];
                    }
                    if (
                        typeof trainingData.teams[i].offsets[this.sortLevel] ===
                        'undefined'
                    ) {
                        if (typeof this.sortLevel === 'undefined') {
                            // trainingData.teams[i].offsets[this.sortLevel] = 0;
                        } else {
                            const levelsTimePlanSum = this.levelsTimePlan
                                .slice(0, this.sortLevel - 1)
                                .reduce((a, b) => a + b, 0);
                            const teamLevelStart =
                                layers[this.sortLevel - 1][i][0];
                            trainingData.teams[i].offsets[this.sortLevel] =
                                levelsTimePlanSum - teamLevelStart;
                        }
                    }
                    return (
                        this.elementRefs.xScale(x) +
                        this.elementRefs.xScale(
                            trainingData.teams[i].offsets[this.sortLevel],
                        )
                    );
                } else {
                    return this.elementRefs.xScale(x);
                }
            })
            .attr('height', this.elementRefs.yScale.bandwidth())
            .attr('width', (d: object, i: number, nodes) => {
                const level: any = this.d3.select(nodes[i].parentNode).datum(),
                    levelIndex: number = level.index,
                    levelKey: string = 'level' + (levelIndex + 1),
                    data: Record<number, any> = layers[levelIndex][i]['data'],
                    currentLevelData: number =
                        layers[levelIndex][i]['data'][levelKey],
                    currentState: string = data['currentState'];
                const allNodes = this.d3.select(nodes[i]);
                allNodes
                    .classed('preserved', (data: any) =>
                        this.runsToCompare.some(
                            (run) => run.id === data.data.id,
                        ),
                    )
                    .classed(
                        'faded',
                        (data: any) =>
                            this.runsToCompare.length > 0 &&
                            !this.runsToCompare.some(
                                (run) => run.id === data.data.id,
                            ),
                    );

                if (typeof currentLevelData === 'undefined') {
                    allNodes
                        .classed('training-segment-finished', true)
                        .style('opacity', () =>
                            this.sortLevel !== 0 &&
                            typeof data['level' + this.sortLevel] ===
                                'undefined' &&
                            currentState !== 'level' + this.sortLevel
                                ? 0.3
                                : 0.5,
                        );
                }

                let finalWidth = 0;
                if (typeof currentLevelData !== 'undefined') {
                    finalWidth = xScale(d[1]) - xScale(d[0]);
                } else if (currentState === levelKey) {
                    finalWidth = xScale(this.levelsTimePlan[levelIndex]);
                }
                return finalWidth;
            })
            .on('mouseover', (event, d) => {
                this.highlightedTrainee.emit(d.data.traineeId);
                // highlight team on hover
                this.elementRefs.outerWrapper.classed(
                    'ctf-progress-hover',
                    true,
                );
                this.d3
                    .selectAll('.data text')
                    .filter((data: any) => data.traineeId === d.data.traineeId)
                    .classed('data-hover', true);
                this.d3
                    .selectAll('.training .training-layer rect')
                    .filter(
                        (data: any) => data.data.traineeId === d.data.traineeId,
                    )
                    .classed('data-hover', true);
                this.elementRefs.tooltip
                    .transition()
                    .duration(200)
                    .delay(500)
                    .style('opacity', 0.9);

                const datum: any = this.d3
                    .select(event.currentTarget.parentNode)
                    .datum();
                const thisLevel = this.findLevelByKey(datum.index + 1);
                this.elementRefs.tooltip
                    .html((): string => {
                        return (
                            '<div>' +
                            '<span class="ctf-progress-tooltip-item"> ' +
                            (thisLevel.levelType === 'info'
                                ? 'Info level'
                                : thisLevel.levelType === 'access'
                                  ? 'Access level'
                                  : thisLevel.levelType === 'assessment'
                                    ? 'Questionnaire level'
                                    : 'ProgressLevelInfo ' +
                                      this.getTrainingLevelIndex(thisLevel)) +
                            ' </span>' +
                            '<span>' +
                            thisLevel.title +
                            '</span>' +
                            '</div>'
                        );
                    })
                    .style('left', event.offsetX + 'px')
                    .style('top', event.offsetY + 'px');
                if (this.eventService()) {
                    this.eventService().trainingAnalysisOnBarMouseover(
                        d.data.id.toString(),
                    );
                }
            })
            .on('mouseout', (_, d) => {
                this.elementRefs.tooltip
                    .transition()
                    .duration(0)
                    .style('opacity', 0);
                // remove team highlighting
                if (this.runsToCompare.length === 0)
                    this.elementRefs.outerWrapper.classed(
                        'ctf-progress-hover',
                        false,
                    );
                this.d3
                    .selectAll('.data text')
                    .filter(
                        (data: any) =>
                            !this.runsToCompare.some(
                                (run) => run.id === data.id,
                            ),
                    )
                    .classed('data-hover', false);
                this.d3
                    .selectAll('.training .training-layer rect')
                    .filter((data: any) => data.data.id === d.data.id)
                    .classed('data-hover', false);
                if (this.eventService()) {
                    this.eventService().trainingAnalysisOnBarMouseout(
                        d.data.id.toString(),
                    );
                }
            })
            .on('click', (_, d) => {
                if (this.runsToCompare.some((run) => run.id === d.data.id)) {
                    this.runsToCompare = this.runsToCompare.filter(
                        (item) => item.id !== d.data.id,
                    );
                } else {
                    this.runsToCompare.push({
                        id: d.data.id,
                        avatar: d.data.traineeAvatar,
                    });
                }
                if (this.eventService()) {
                    this.eventService().trainingAnalysisOnBarClick(
                        d.data.id.toString(),
                    );
                }
                if (
                    this.selectedTraineeIds.indexOf(d.data.trainingRunId) !== -1
                ) {
                    this.selectedTraineeIds.splice(
                        this.selectedTraineeIds.indexOf(d.data.trainingRunId),
                        1,
                    );
                } else {
                    this.selectedTraineeIds.push(d.data.trainingRunId);
                }
                this.outputSelectedTrainees.emit(this.selectedTraineeIds);

                this.elementRefs.outerWrapper.classed(
                    'ctf-progress-hover',
                    true,
                );
                this.d3
                    .selectAll('.data text')
                    .filter((data: any) => data.id === d.data.id)
                    .classed('data-hover', true);
                this.d3
                    .selectAll('.training .training-layer rect')
                    .filter((data: any) => data.data.id === d.data.id)
                    .classed('preserved', (data: any) => {
                        if (this.view() == ViewEnum.Overview) {
                            return this.selectedTraineeIds.some(
                                (run) => run === data.data.trainingRunId,
                            );
                        } else {
                            return this.runsToCompare.some(
                                (run) => run.id === data.data.id,
                            );
                        }
                    });

                this.d3
                    .selectAll('.training .training-layer rect')
                    .classed('faded', this.selectedTraineeIds.length > 0);
            })
            .style('fill', (d: object, i: string, nodes) => {
                const level: any = this.d3.select(nodes[i].parentNode).datum(),
                    levelIndex: number = level.index,
                    levelKey: string = 'level' + (levelIndex + 1),
                    teamIndex: number = +i,
                    data: Record<number, any> =
                        layers[levelIndex][teamIndex]['data'],
                    currentState: string = data['currentState'];
                if (currentState === levelKey) {
                    return 'url(#diagonalHatch' + levelIndex + ')';
                }
                return (r: object, i: string): string => this.getPlanColor(+i);
            });
    }

    findLevelByKey(levelIndex: number): ProgressLevelInfo {
        return this.visualizationData().levels[levelIndex - 1];
    }

    getTrainingLevelIndex(level: ProgressLevelInfo): number {
        const trainingLevels = this.visualizationData().levels.filter(
            (level) => level.levelType == AbstractLevelTypeEnum.Training,
        );
        return trainingLevels.indexOf(level) + 1;
    }

    updatePlan(trainingData: any): void {
        const d3: D3 = this.d3,
            offset: number[] = [],
            xScale: ScaleLinear<number, number> = this.elementRefs.xScale,
            stack = d3
                .stack()
                .keys(trainingData.keys)
                .offset(d3.stackOffsetNone),
            layers = stack(trainingData.teams);

        // pan plan to top
        this.elementRefs.plan.raise();
        this.elementRefs.planSegments
            .style('opacity', (d: object, i: number, nodes): number => {
                const level: any = d3.select(nodes[i].parentNode).datum(),
                    levelIndex: number = level.index,
                    levelKey: string = 'level' + levelIndex,
                    teamIndex: number = i,
                    data: Record<number, any> =
                        layers[levelIndex][teamIndex]['data'],
                    currentState: string = data['currentState'];

                return currentState === 'FINISHED' ||
                    currentState === levelKey ||
                    levelIndex >= parseInt(currentState.split('level')[1])
                    ? 1
                    : 0;
            })
            .attr('x', (d: any, i: number, nodes): number => {
                const level: any = d3.select(nodes[i].parentNode).datum(),
                    levelIndex: number = level.index,
                    teamIndex: number = i,
                    currentData: Record<number, any> =
                        layers[levelIndex][teamIndex],
                    isUnfinishedLevel: boolean = isNaN(currentData[1]),
                    currentState = currentData['data']['currentState'];
                let x: number = d[0];

                if (
                    isUnfinishedLevel &&
                    'level' + levelIndex === currentState
                ) {
                    offset[teamIndex] = currentData[0] - x;
                } else if (
                    isUnfinishedLevel &&
                    'level' + levelIndex !== currentState
                ) {
                    let num = 0;
                    // first we want to compute the added distance based on the previous extimated times
                    for (
                        let j = 1;
                        levelIndex - j > currentState.split('level')[1];
                        j++
                    ) {
                        const computedEstimate =
                            d['data']['level' + (levelIndex - j)];
                        if (computedEstimate !== undefined) {
                            num += computedEstimate;
                        }
                    }
                    // now we will check if the trainee is behind the current scheduled estimate or not
                    const currentEstimate = d['data'][currentState];
                    if (currentData[0] + currentEstimate > this.time) {
                        return xScale(
                            Math.max(1, currentData[0] + currentEstimate + num),
                        );
                    }
                    return xScale(Math.max(1, this.time() + num));
                }
                if (offset[teamIndex] !== undefined) {
                    x = x + offset[teamIndex];
                }
                return xScale(Math.max(1, x));
            })
            .attr(
                'width',
                (d: object): number =>
                    // rescale to new x domain
                    this.elementRefs.xScale(d[1]) -
                    this.elementRefs.xScale(d[0]),
            )
            .style('transform', (d: object, i: number): string => {
                let teamOffset = 0;
                if (
                    typeof trainingData.teams[i].offsets !== 'undefined' &&
                    typeof trainingData.teams[i].offsets[this.sortLevel] !==
                        'undefined'
                ) {
                    teamOffset = trainingData.teams[i].offsets[this.sortLevel];
                }
                return 'translateX(' + xScale(teamOffset) + 'px)';
            });

        // rescale bounds (xScale could change)
        this.elementRefs.boundSegments.attr('x', (d: object): number =>
            this.elementRefs.xScale(d[1]),
        );
    }

    createEventTooltips() {
        if (typeof this.elementRefs.tooltip !== 'undefined') this.elementRefs.tooltip.remove();

        this.elementRefs.tooltip = this.d3
            .select('#ctf-progress-chart')
            .append('div')
            .attr('class', 'ctf-progress-tooltip')
            .style('opacity', 0);
    }

    groupEvents(eventIconWidth: number): void {
        const eventsDataset: object[] = this.trainingData.teams.slice(0);
        eventsDataset.forEach((team: any) => {
            const eventsGroups: any[] = [];
            if (Array.isArray(team.events) && team.events.length > 0) {
                const first: ProgressEvent = team.events[0],
                    lastIndex: number = team.events.length - 1;
                let previousEvent: ProgressEvent = null,
                    group = {
                        events: [],
                        level: first.levelNumber,
                    },
                    previousOffset = false,
                    isDuplicated = false;

                team.events.forEach((event: ProgressEvent, index) => {
                    if (previousEvent != null) {
                        const levelX: number = this.elementRefs.xScale(
                                team['level' + event.levelNumber],
                            ),
                            eventX: number = this.elementRefs.xScale(
                                event.timestamp,
                            ),
                            currentEventX: number =
                                levelX - eventX < eventIconWidth / 2
                                    ? eventX - eventIconWidth / 2
                                    : eventX,
                            previousEventX: number = previousOffset
                                ? this.elementRefs.xScale(
                                      previousEvent.timestamp,
                                  ) +
                                  eventIconWidth / 2
                                : this.elementRefs.xScale(
                                      previousEvent.timestamp,
                                  ),
                            diff: number = currentEventX - previousEventX;
                        isDuplicated =
                            event.getContent() === previousEvent.getContent() &&
                            event.timestamp === previousEvent.timestamp &&
                            event.levelNumber === previousEvent.levelNumber;

                        if (
                            diff > 7 ||
                            event.levelNumber !== previousEvent.levelNumber ||
                            event.type !== previousEvent.type
                        ) {
                            const groupCopy: any = Object.assign({}, group);
                            eventsGroups.push(groupCopy);
                            group = {
                                events: [],
                                level: event.levelNumber,
                            };
                        }
                    }
                    previousOffset =
                        this.elementRefs.xScale(event.timestamp) <
                        eventIconWidth / 2;

                    // don't push duplicated events
                    if (!isDuplicated) group.events.push(event);
                    previousEvent = event;

                    if (index === lastIndex) {
                        const groupCopy: any = Object.assign({}, group);
                        eventsGroups.push(groupCopy);
                    }
                });
            }
            eventsGroups.forEach((group) => {
                const events = group.events;
                const groupLevelX: number = this.elementRefs.xScale(
                    team['level' + group.level],
                );
                const firstGroupEvent: ProgressEvent = events[0];
                const lastGroupEvent: ProgressEvent = events[events.length - 1];
                const firstX: number = this.elementRefs.xScale(
                    firstGroupEvent.trainingTime,
                );
                const lastX: number = this.elementRefs.xScale(
                    lastGroupEvent.trainingTime,
                );
                let x: number;
                if (firstX === lastX) x = firstX;
                else x = firstX + (lastX - firstX) / 2;

                if (x < eventIconWidth / 2 || groupLevelX < eventIconWidth * 2)
                    x += eventIconWidth / 2;
                if (
                    typeof groupLevelX !== 'undefined' &&
                    groupLevelX - x < eventIconWidth / 2
                )
                    x -= eventIconWidth / 2;
                group['x'] = x;
            });
            team.eventsGroups = eventsGroups;
        });
    }

    createEvents({
        trainingData,
        eventShapePaths,
        groupCircleWidth,
        eventIconWidth,
    }) {
        const d3 = this.d3;
        const eventsLayer = this.elementRefs.trainingChart
            .append('g')
            .attr('class', 'events');
        const eventLayers = eventsLayer
            .selectAll('g.events-row')
            .data(trainingData.teams)
            .enter()
            .append('g')
            .attr('class', 'events-row')
            .style('transform', (d: object, i: number): string => {
                let teamOffset = 0;
                if (
                    typeof trainingData.teams[i].offsets !== 'undefined' &&
                    typeof trainingData.teams[i].offsets[this.sortLevel] !==
                        'undefined'
                ) {
                    teamOffset = trainingData.teams[i].offsets[this.sortLevel];
                }
                return (
                    'translateX(' + this.elementRefs.xScale(teamOffset) + 'px)'
                );
            })
            .attr('data-index', (d: object, i: number): number => i)
            .on('mouseover', (_, d) => {
                // preserve team highlight
                this.elementRefs.outerWrapper.classed('ctf-progress-hover', true);
                d3.selectAll(
                    '.data text:nth-child(' + (d.teamIndex + 1) + ')',
                ).classed('data-hover', true);
            })
            .on('mouseout', (_, d) => {
                if (this.runsToCompare.length > 0) return;
                this.elementRefs.outerWrapper.classed('ctf-progress-hover', false);
                d3.selectAll(
                    '.data text:nth-child(' + (d.teamIndex + 1) + ')',
                ).classed('data-hover', false);
            });

        eventLayers
            .selectAll('path.event')
            .data((d: any): ProgressEvent[] => d.eventsGroups)
            .enter()
            .append('path')
            .attr('class', 'event')
            .attr('d', (group: any): string => {
                if (group.events.length === 1) {
                    const event = group.events[0];
                    return eventShapePaths[event.type];
                } else {
                    return eventShapePaths[group.events[0].type];
                }
            })
            .attr('fill', (d: any, i, nodes): string => {
                const teamStruct: ProgressDataEntry = <ProgressDataEntry>(
                    d3.select(nodes[i].parentNode).datum()
                );
                const colorIndex: number = +d.level - 1; // in final overview is no first transparent column for start
                // check if the event is in current unfinished level
                return teamStruct['currentState'] === 'level' + d.level &&
                    this.view() !== ViewEnum.Overview
                    ? this.getSegmentColor(d.events[0].traineeName, d.level)
                    : this.getPlanColor(colorIndex);
            })
            .attr('stroke', '#eee')
            .attr('transform', (group: any, i: number, nodes): string => {
                // event absolute time from training start
                const iconWidth: number =
                    group.events.length > 1 ? groupCircleWidth : eventIconWidth;
                const scale = group.events.length > 1 ? 1.2 : 1; // a group with multiple events is a bit enlarged
                const teamStruct: ProgressDataEntry = <ProgressDataEntry>(
                    d3.select(nodes[i].parentNode).datum()
                );
                let y =
                    this.elementRefs.yScale(teamStruct.traineeName) +
                    this.elementRefs.yScale.bandwidth() * 0.5 -
                    iconWidth / 2;
                y -= group.events.length > 1 ? 1.5 : 0;
                const x = group.x - iconWidth / 2;
                return 'translate(' + x + ',' + y + ') scale(' + scale + ')';
            })
            .on('mouseover', (_, d) => {
                this.elementRefs.tooltip.transition().duration(200).style('opacity', 0.9);
                const teamNode = d,
                    teamStruct: ProgressDataEntry = teamNode,
                    y =
                        this.elementRefs.yScale(teamStruct.traineeName) +
                        this.elementRefs.yScale.bandwidth() * 0.5 +
                        3;
                let teamOffset = 0;
                const teamIndex: string = teamNode.level;
                if (
                    typeof trainingData.teams[teamIndex]?.offsets !==
                        'undefined' &&
                    typeof trainingData.teams[teamIndex]?.offsets[
                        this.sortLevel
                    ] !== 'undefined'
                ) {
                    teamOffset =
                        trainingData.teams[teamIndex].offsets[this.sortLevel];
                }
                const x =
                    d.x +
                    2 +
                    this.panValue +
                    this.elementRefs.xScale(teamOffset);
                this.elementRefs.tooltip
                    .html((): string => {
                        let text = '';
                        d.events.forEach((event) => {
                            const item = [];
                            item.push(
                                '<span class="ctf-progress-tooltip-item">',
                                '<svg width="14" height="14" viewBox="0 0 16 16">',
                                '<path d="' +
                                    eventShapePaths[event.type] +
                                    '"/>',
                                '</svg>',
                                this.resolveEventTooltip(event),
                                '</span>',
                            );
                            text += item.join('');
                        });
                        return text;
                    })
                    .style('left', x + 'px')
                    .style('top', y + 'px');
            })
            .on('mouseout', () => {
                this.elementRefs.tooltip.transition().duration(0).style('opacity', 0);
            });

        eventLayers
            .selectAll('text.event-number')
            .data((d: any): ProgressEvent[] => d.eventsGroups)
            .enter()
            .append('text')
            .filter((group) => group.events.length > 1)
            .attr('class', 'event-number')
            .attr('y', (d: object, i: number, nodes): string => {
                const teamStruct: ProgressDataEntry = <ProgressDataEntry>(
                        d3.select(nodes[i].parentNode).datum()
                    ),
                    y =
                        this.elementRefs.yScale(teamStruct.traineeName) +
                        this.elementRefs.yScale.bandwidth() * 0.5 +
                        groupCircleWidth / 5;
                return y.toString();
            })
            .attr('x', (group: any): string => {
                return group.x.toString();
            })
            .attr('fill', '#fff')
            .attr('font-size', '11px')
            .attr('text-anchor', 'middle')
            .text((group): string => group.events.length.toString());
    }

    resolveEventTooltip(event: ProgressEvent) {
        switch (event.type) {
            case 'hint':
                return (
                    'Hint <i>' +
                    (event as HintTakenEvent).hintTitle +
                    '</i> taken'
                );
            case 'wrong':
                return (
                    'Wrong answer submitted: <i>' +
                    (event as WrongAnswerEvent).answerContent +
                    '</i>'
                );
            case 'solution':
                return 'Solution displayed';
        }
        return '';
    }

    createSortingLabels(trainingData) {
        let previous = 0;
        let difference = 0;
        if (trainingData['teams'].length) {
            trainingData['levels'].forEach(
                (levelKey: string, index: number): void => {
                    // let levelTime: number = this.levelTimePlan;
                    const levelsTimePlanSum = this.levelsTimePlan
                        .slice(0, index + 1)
                        .reduce((a, b) => a + b, 0);
                    const x: number =
                        this.elementRefs.xScale(levelsTimePlanSum);

                    difference = levelsTimePlanSum - previous;
                    previous = levelsTimePlanSum;

                    let sortLevelName: string;
                    if (
                        this.visualizationData().levels[index].levelType ===
                        'info'
                    ) {
                        sortLevelName = difference > 530 ? 'Info' : 'I';
                    }
                    if (
                        this.visualizationData().levels[index].levelType ===
                        'access'
                    ) {
                        sortLevelName = difference > 530 ? 'Access' : 'A';
                    }
                    if (
                        this.visualizationData().levels[index].levelType ===
                        'assessment'
                    ) {
                        sortLevelName = difference > 530 ? 'Q' : 'Q';
                    }
                    if (
                        this.visualizationData().levels[index].levelType ===
                        'training'
                    ) {
                        let levelNum = 0;
                        for (let i = 0; i <= index; i++) {
                            if (
                                this.visualizationData().levels[i].levelType ===
                                'training'
                            ) {
                                levelNum++;
                            }
                        }
                        sortLevelName =
                            difference > 530
                                ? 'ProgressLevelInfo ' + levelNum
                                : 'L' + levelNum;
                    }
                    this.levelSortOptions.push({
                        index: index + 1,
                        key: levelKey,
                        name: sortLevelName,
                        x: x + 'px',
                        translate: 'translate(calc(-100% + 5px), 0)',
                    });
                },
            );
        }
    }

    addDataColumns() {
        // append columns with data (team, time, score)
        this.addOneColumn('time', true);
        this.addOneColumn('score', true);
        this.addOneColumn('hints', true);
        this.addOneColumn('answers', true);
        const teamDataLayer: any = this.addOneColumn('team');
        const compareDataLayer: any = this.addOneColumn('compare');

        if (this.selectedTraineeView() === 'avatar') {
            this.addTraineeAvatar(teamDataLayer);
        } else if (this.selectedTraineeView() === 'name') {
            this.addTraineeName(teamDataLayer, this.trainingData, 160);
        } else {
            this.addTraineeAvatar(teamDataLayer);
            this.addTraineeName(teamDataLayer, this.trainingData);
        }

        const colors: string[] =
            this.traineeColorScheme() || PROGRESS_CONFIG.traineeColors;
        compareDataLayer
            .selectAll('text.data-compare')
            .data(this.trainingData.teams)
            .enter()
            .append('svg')
            .attr('height', this.elementRefs.yScale.bandwidth())
            .attr('width', '5')
            .attr(
                'y',
                (d: PlanDataEntry): number =>
                    this.elementRefs.yScale(d.traineeName) + 8,
            )
            .attr('x', 0)
            .append('path')
            .attr('width', '5')
            .attr('fill', (d, i) => {
                if (d.compare === undefined) {
                    d.compare = colors[i];
                }
                return d.compare;
            })
            .attr('d', (_d) => {
                const h = this.elementRefs.yScale.bandwidth();
                const w = 5;
                return 'M0 ' + h + ' L ' + w + ' ' + h + ' L' + w + ' 0 L0 0 Z';
            });
    }

    pan(left?: number) {
        if (typeof this.elementRefs.trainingChart === 'undefined') {
            return;
        }

        if (typeof left === 'undefined') left = 0;
        let pan: number = this.panValue + left;
        pan = Math.max(-(this.width - this.wrapperWidth), pan);
        pan = Math.min(0, pan);
        this.elementRefs.trainingChart.style(
            'transform',
            'translate(' + pan + 'px, 0)',
        );
        this.d3
            .selectAll('#ctf-progress-time')
            .style('transform', 'translate(' + pan + 'px ,0px)');
    }

    onResize() {
        this.drawChart();
        this.setColumnsWidth();
    }

    onMouseWheelUp($event) {
        if (this.zoomValue < PROGRESS_CONFIG.maxZoomValue) {
            const newZoomValue = Math.min(
                    PROGRESS_CONFIG.maxZoomValue,
                    this.zoomValue + PROGRESS_CONFIG.zoomStep,
                ),
                scale = newZoomValue / this.zoomValue,
                dx =
                    (-$event.left + this.panValue) * scale +
                    $event.left -
                    this.panValue;

            this.zoomValue = newZoomValue;
            this.drawChart();

            // because of team highlighting animation, add class which cancels the animation after zoom
            this.elementRefs.outerWrapper.classed('ctf-progress-zoom', true);
            setTimeout(() => {
                this.elementRefs.outerWrapper.classed('ctf-progress-zoom', false);
            }, 150);

            this.pan(dx);
            this.updatePanValue();
        }
    }

    onMouseWheelDown($event) {
        if (this.zoomValue > 1) {
            const newZoomValue = Math.max(
                    1,
                    this.zoomValue - PROGRESS_CONFIG.zoomStep,
                ),
                scale = newZoomValue / this.zoomValue,
                dx =
                    (-$event.left + this.panValue) * scale +
                    $event.left -
                    this.panValue;
            this.zoomValue = newZoomValue;
            this.drawChart();

            // because of team highlighting animation, add class which cancels the animation after zoom
            this.elementRefs.outerWrapper.classed('ctf-progress-zoom', true);
            setTimeout(() => {
                this.elementRefs.outerWrapper.classed('ctf-progress-zoom', false);
            }, 150);

            this.pan(dx);
            this.updatePanValue();
        }
    }

    onMouseDrag($event) {
        this.pan($event.left);
    }

    onMouseUp() {
        this.updatePanValue();
    }

    onFilterValueChange(): void {
        this.setFilterStatus();
        this.drawChart();
    }

    onSortValueChange(
        sortType: string,
        sortReverse: boolean,
        levelIndex?: number,
    ): void {
        this.sortType = sortType;
        this.sortReverse = sortReverse;
        if (typeof levelIndex !== 'undefined') {
            this.sortLevel = levelIndex;
        } else {
            this.sortLevel = 0;
        }
        this.drawChart();
        if (this.runsToCompare.length > 0) {
            this.elementRefs.outerWrapper.classed('ctf-progress-hover', true);
            this.d3
                .selectAll('.data text')
                .filter((data: any) =>
                    this.runsToCompare.some(
                        (run) => run.id === data.traineeName,
                    ),
                )
                .classed('data-hover', true);
        }
    }

    updatePanValue() {
        if (typeof this.elementRefs.trainingChart === 'undefined') return;

        const transform: string =
                this.elementRefs.trainingChart.style('transform'),
            translate: string[] = transform
                .substring(
                    transform.indexOf('translate(') + 10,
                    transform.indexOf(')'),
                )
                .split(','),
            xStr: string = translate[0];

        let x: number = parseInt(xStr.substr(0, xStr.length - 2));
        if (!x) x = 0;
        this.panValue = x;
    }

    getColor(level: number): string {
        const colors: string[] =
            this.colorScheme() || this.configService.trainingColors;
        const colorsCount: number = colors.length;
        return colors[level % colorsCount];
    }

    getPlanColor(level: number): string {
        const colors: string[] =
            this.colorScheme() || this.configService.trainingColors;
        const colorsCount: number = colors.length;
        const color = this.d3.hsl(colors[level % colorsCount]);
        return color.darker(1.1).toString();
    }

    getLightenedColor(level: number): string {
        const colors: string[] =
            this.colorScheme() || this.configService.trainingColors;
        const colorsCount: number = colors.length;
        const color = this.d3.hsl(colors[level % colorsCount]);
        return color.brighter(0.8).toString();
    }

    clear(): void {
        this.d3.select('#ctf-progress-chart').html('');
        this.d3.selectAll('.ctf-progress-column-data').html('');
    }

    setFilterStatus(): void {
        switch (this.selectedFilterValue) {
            case 1:
                this.filterStatus = '';
                break;
            case 2:
                this.filterStatus = 'finished';
                break;
            case 3:
                this.filterStatus = 'unfinished';
                break;
        }
    }

    highlightGivenTrainee(traineeId: number): void {
        this.elementRefs.outerWrapper?.classed('ctf-progress-hover', true);
        // remove fade class from text
        this.d3
            .selectAll('.data text')
            .filter((data: any) => {
                return data.traineeId === traineeId;
            })
            .classed('fade', false);

        // remove fade class from training segments
        this.d3
            .selectAll('.training .training-layer rect')
            .filter((data: any) => {
                return data.data.traineeId === traineeId;
            })
            .classed('fade', false);

        // remove fade class from plan segments
        this.d3
            .selectAll('.plan .plan-layer rect')
            .filter((data: any) => {
                return data.data.traineeId === traineeId;
            })
            .classed('fade', false)
            .classed('hidden', false);

        // remove fade class from events
        this.d3
            .selectAll('.events .events-row path')
            .filter((data: any) => {
                return data.events[0].traineeId === traineeId;
            })
            .classed('fade', false);
    }

    unhighlightGivenTrainee(traineeId: number): void {
        this.elementRefs.outerWrapper?.classed('ctf-progress-hover', false);
        // add fade class to text
        this.d3
            .selectAll('.data text')
            .filter((data: any) => data.traineeId === traineeId)
            .classed('fade', true);

        // add fade class to training segments
        this.d3
            .selectAll('.training .training-layer rect')
            .filter((data: any) => data.data.traineeId === traineeId)
            .classed('fade', true);

        // add fade class to plan segments
        this.d3
            .selectAll('.plan .plan-layer rect')
            .filter((data: any) => {
                return data.data.traineeId === traineeId;
            })
            .classed('fade', true);

        const totalTime = this.trainingDataSet.find(
            (trainee) => trainee.traineeId == traineeId,
        ).totalTime;

        // add hidden class to plan segments for already passed levels
        this.d3
            .selectAll('.plan .plan-layer rect')
            .filter((data: any) => {
                return data.data.traineeId === traineeId && data[1] < totalTime;
            })
            .classed('hidden', true);

        // add fade class to events
        this.d3
            .selectAll('.events .events-row path')
            .filter((data: any) => {
                return data.events[0].traineeId === traineeId;
            })
            .classed('fade', true);
    }

    /**
     * unused method, to preserve trainees based on event from distinct visualization
     * missing method to match avatars
     * @param traineeId
     */
    preserveHighlightedTrainee(traineeId: string): void {
        if (this.runsToCompare.some((run) => run.id === traineeId)) {
            this.runsToCompare = this.runsToCompare.filter(
                (item) => item.id !== traineeId,
            );
        } else {
            this.runsToCompare.push({ id: traineeId, avatar: '' });
        }

        this.d3
            .selectAll('.training .training-layer rect')
            .filter((data: any) => data.data.id === traineeId)
            .classed('preserved', (data: any) =>
                this.runsToCompare.includes(data.data.id),
            );

        this.d3
            .selectAll('.training .training-layer rect')
            .classed('faded', (_data: any) => this.runsToCompare.length > 0);
    }

    onTraineeViewChange() {
        this.drawChart();
    }

    onTraineeDetailChange() {
        this.traineeDetailId = null;
        this.drawChart();
    }

    onZoomReset() {
        this.zoomValue = 1;
        this.drawChart();
    }

    setHighlightedTrainee(trainee: ProgressTraineeInfo) {
        if (trainee) {
            this.visualizationData().traineeProgress.forEach((p) => {
                if (p.userRefId == trainee.userRefId) {
                    this.highlightGivenTrainee(p.userRefId);
                } else {
                    this.unhighlightGivenTrainee(p.userRefId);
                }
            });
        } else {
            this.visualizationData().traineeProgress.forEach((p) => {
                this.highlightGivenTrainee(p.userRefId);
            });
        }
    }

    showTraineeDetail(event) {
        if (this.view() == ViewEnum.Progress)
            this.traineeDetailId = event.path[0].attributes.traineeId?.value;
    }

    getEventShapePaths() {
        return {
            ...PROGRESS_CONFIG.shapes,
            ...PROGRESS_CONFIG.eventProps.eventShapes,
        };
    }

    getTimeString(seconds: number): string {
        const hours: number = Math.floor(seconds / 3600);
        const minutes: number = Math.floor((seconds - hours * 3600) / 60);
        seconds = Math.floor(seconds - hours * 3600 - minutes * 60);

        return (
            hours.toString().padStart(2, '0') +
            ':' +
            minutes.toString().padStart(2, '0') +
            ':' +
            seconds.toString().padStart(2, '0')
        );
    }

    setColumnsWidth() {
        const progressColumnWidth =
            (this.d3.select('.visualization-container').node() as HTMLElement)
                .offsetWidth -
            80 - // name column
            21 -
            50 -
            80 - // time column
            80 - // score column
            80 - // hints column
            80; // answers column

        const nameColWith =
            Math.max(
                ...this.visualizationData().trainees.map(
                    (trainee) => trainee.name.length,
                ),
            ) * TrainingAnalysisComponent.FONT_WIDTH_APPROXIMATION;

        const timeColumnWidth =
            this.getTimeString(
                this.visualizationData().currentTime -
                    this.visualizationData().startTime,
            ).length * TrainingAnalysisComponent.FONT_WIDTH_APPROXIMATION;

        // column size adjustment
        this.d3
            .selectAll('.ctfh-col-2')
            .filter('*:not(.short)')
            .style('max-width', '80px');
        this.d3
            .selectAll('.ctfh-col-8')
            .style('max-width', progressColumnWidth + 'px');
        this.d3
            .selectAll('.final-2-name')
            .style('max-width', nameColWith + 'px');
        this.d3
            .selectAll('.ctfh-col-2 .ctf-progress-timecolumn')
            .style('max-width', timeColumnWidth + 'px');
    }

    private getLevelKeys(): string[] {
        // in progress view we want to also see start time offset
        return this.visualizationData().levels.map(
            (level) => 'level' + (level.order + 1),
        );
    }

    private addTraineeName(
        teamDataLayer,
        trainingData: TrainingData,
        xPosition = 130,
    ) {
        teamDataLayer
            .selectAll('text.data-team')
            .data(this.trainingData.teams)
            .enter()
            .append('text')
            .attr('traineeId', (d: any) => d.traineeId)
            .text((d: any): string => d.traineeName)
            .attr(
                'y',
                (d: any): number =>
                    this.elementRefs.yScale(d.traineeName) +
                    this.elementRefs.yScale.bandwidth() * 0.6 +
                    this.padding.top,
            )
            .attr('x', xPosition)
            .style('text-anchor', 'end')
            .attr('cursor', 'default');
    }

    private addTraineeAvatar(teamDataLayer) {
        teamDataLayer
            .selectAll('text.data-team')
            .data(this.trainingData.teams)
            .enter()
            .append('image')
            .attr('traineeId', (d: TrainingDataEntry) => d.traineeId)
            .attr(
                'xlink:href',
                (d: TrainingDataEntry): string =>
                    'data:image/png;base64,' + d.traineeAvatar,
            )
            .attr('width', 15)
            .attr('height', 15)
            .attr(
                'y',
                (d: TrainingDataEntry): number =>
                    this.elementRefs.yScale(d.traineeName) +
                    this.elementRefs.yScale.bandwidth() * 0.6 +
                    this.padding.top -
                    10,
            )
            .attr('x', 145)
            .attr('cursor', 'default');
    }

    private addOneColumn(name, append = false) {
        this.d3
            .select('#' + TrainingAnalysisComponent.DATA_COLUMN_MAPPING[name])
            .html('');

        const data = this.d3
            .select('#' + TrainingAnalysisComponent.DATA_COLUMN_MAPPING[name])
            .append('svg')
            .attr('height', this.wrapperHeight)
            .attr('width', 90);
        const dataLayer = data.append('g').attr('class', 'data');

        if (append) {
            dataLayer
                .selectAll('text.data-time')
                .data<TrainingDataEntry>(this.trainingData.teams)
                .enter()
                .append('text')
                .text((d): string => {
                    switch (name) {
                        case 'time':
                            return !isNaN(d.totalTime)
                                ? Utils.Date.formatDurationFull(d.totalTime)
                                : '';
                        case 'score':
                            return !isNaN(d.score) ? String(d.score) : '';
                        case 'hints':
                            return !isNaN(d.hints) ? String(d.hints) : '';
                        case 'answers':
                            return !isNaN(d.answers) ? String(d.answers) : '';
                        default:
                            return '';
                    }
                })
                .attr(
                    'y',
                    (d) =>
                        this.elementRefs.yScale(d.traineeName) +
                        this.elementRefs.yScale.bandwidth() * 0.6 +
                        this.padding.top,
                )
                .attr('x', 0);
        }
        return dataLayer;
    }
}
