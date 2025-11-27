import {
    ChangeDetectionStrategy,
    Component,
    EventEmitter,
    inject,
    Input,
    OnChanges,
    OnDestroy,
    OnInit,
    Output,
    SimpleChanges
} from '@angular/core';
import { AXES_CONFIG, colorScheme, CONTEXT_CONFIG, SVG_MARGIN_CONFIG } from './config';
import { SvgConfig } from '../../../../shared/interfaces/configurations/svg-config';
import { SvgMarginConfig } from '../../../../shared/interfaces/configurations/svg-margin-config';
import { TraineeModeInfo } from '../../../../shared/interfaces/trainee-mode-info';
import { take } from 'rxjs/operators';
import { Timeline } from '../../../model/timeline/timeline';
import { TimelineService } from '../service/timeline.service';
import { TimelinePlayer } from '../../../model/timeline/timeline-player';
import { BasicLevelInfo, TimelineLevel } from '../../../model/timeline/timeline-level';
import { TrainingLevel } from '../../../model/timeline/training-level';
import { TimelineEvent } from '../../../model/timeline/timeline-event';
import { InfoLevel } from '../../../model/timeline/info-level';
import { AssessmentLevel } from '../../../model/timeline/assessment-level';
import { AccessLevel } from '../../../model/timeline/access-level';
import { Axis, BrushBehavior, Line, ScaleLinear, ScaleOrdinal, ZoomBehavior } from 'd3';
import { D3, D3Service } from '../../../../../common/d3-service/d3-service';
import { Subscription } from 'rxjs';
import { TableService } from '../../../../services/table.service';
import { FiltersService } from '../../../../services/filters.service';
import TimelineLevelTypeEnum = BasicLevelInfo.TimelineLevelTypeEnum;

@Component({
    selector: 'crczp-visualization-overview-line',
    templateUrl: './line.component.html',
    styleUrls: ['./line.component.css'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    // eslint-disable-next-line
    standalone: false,
})
export class LineComponent implements OnDestroy, OnChanges, OnInit {
    /**
     * Defines if all players should be displayed
     */
    @Input() enableAllPlayers = true;
    /**
     * Main svg dimensions.
     */
    @Input() size: { width: number; height: number };
    /**
     * Id of training definition
     */
    @Input() trainingDefinitionId: number;
    /**
     * Id of training instance
     */
    @Input() trainingInstanceId: number;
    /**
     * Use if visualization should use anonymized data (without names and credentials of other users) from trainee point of view
     */
    @Input() traineeModeInfo: TraineeModeInfo;
    /**
     * Emits boolean that indicates if table should be placed under the visualization
     */
    @Output() wideTable: EventEmitter<any> = new EventEmitter<any>();
    /**
     * Id of trainee which should be highlighted
     */
    @Input() highlightedTrainee: number;
    /**
     * Emits Id of trainee which should be highlighted
     */
    @Output() selectedTrainee: EventEmitter<number> = new EventEmitter();
    /**
     * If visualization is used as standalone it displays all given players automatically, highlighting feedback learner
     * if provided. On the other hand, it displays only players from @filterPlayers and reacts to event selectedTrainingRunId.
     */
    @Input() standalone: boolean;
    /**
     * List of players which should be displayed
     */
    @Input() filterPlayers: number[];
    /**
     * Active filters for timeline visualization
     */
    @Input() activeFilters: any[];
    players: TimelinePlayer[] = [];
    public svgConfig: SvgConfig = { width: 0, height: 0 };
    public svgMarginConfig: SvgMarginConfig = {
        top: 0,
        bottom: 0,
        right: 0,
        left: 0,
    };
    public playerColorScale: ScaleOrdinal<string, any>;
    public filters;
    public filtersArray;
    public isLoading: boolean;
    W;
    private tableService = inject(TableService);
    private filtersService = inject(FiltersService);
    private timelineService = inject(TimelineService);
    /**
     * Training data
     */
    private timelineData: Timeline = { timeline: null };
    private clip;
    private timeAxisScale: ScaleLinear<number, number>;
    private d3: D3;
    private svg;
    private timeScale: ScaleLinear<number, number>;
    private contextTimeScale: ScaleLinear<number, number>;
    private contextScoreScale: ScaleLinear<number, number>;
    private scoreScale: ScaleLinear<number, number>;
    private eventsColorScale: ScaleOrdinal<string, any>;
    private lineGenerator: Line<TimelineEvent>;
    private contextLineGenerator: Line<TimelineEvent>;
    private xAxis: Axis<any>;
    private zoom: ZoomBehavior<any, any>;
    private brush: BrushBehavior<any>;
    private playersGroup;
    private eventTooltip;
    private lineTooltip;
    private zoomableArea;
    private zoomTransform;
    private tableRowClicked: Subscription;
    private tableRowMouseover: Subscription;
    private tableRowMouseout: Subscription;
    private filterChanged: Subscription;
    // Temp fix (https://stackoverflow.com/questions/67035992/d3-v6-brush-chart) implemented with transition from d3v5 -> d3v7
    private sourceEvent = null;
    private traineesTrainingRun: number;

    constructor() {
        const d3service = inject(D3Service);

        this.d3 = d3service.getD3();
        this.tableRowClicked = this.tableService.tableRowClicked$.subscribe(
            (player: TimelinePlayer) => {
                this.onRowClicked(player.trainingRunId);
            },
        );
        this.tableRowMouseover = this.tableService.tableRowMouseover$.subscribe(
            (id: any) => {
                this.highlightLine(id);
            },
        );
        this.tableRowMouseout = this.tableService.tableRowMouseout$.subscribe(
            (id: any) => {
                this.unhighlightLine(id);
            },
        );
        this.filterChanged = this.filtersService.filterChanged$.subscribe(
            () => {
                this.onFilterChange();
            },
        );
    }

    ngOnDestroy(): void {
        this.tableRowClicked.unsubscribe();
        this.tableRowMouseover.unsubscribe();
        this.tableRowMouseout.unsubscribe();
    }

    ngOnChanges(changes: SimpleChanges): void {
        if (this.timelineData !== null && this.timelineData.timeline !== null) {
            this.players = this.timelineData.timeline.playerData;
            this.redraw();
        }
        if (this.zoomTransform) {
            this.onZoom(null, this.zoomTransform);
        }

        if ('highlightedTrainee' in changes) {
            if (
                changes['highlightedTrainee'].currentValue !==
                changes['highlightedTrainee'].previousValue
            ) {
                if (!changes['highlightedTrainee'].isFirstChange()) {
                    if (!this.zoomTransform) {
                        this.unhighlightLine(
                            changes['highlightedTrainee'].previousValue,
                        );
                    }
                    this.highlightLine(this.highlightedTrainee);
                }
            }
        }

        if ('activeFilters' in changes) {
            if (!changes['activeFilters'].isFirstChange()) {
                this.filters = this.activeFilters;
                this.onFilterChange();
            }
        }
    }

    ngOnInit(): void {
        this.load();
    }

    load(): void {
        this.isLoading = true;
        this.timelineService
            .getAllData(this.traineeModeInfo, this.trainingInstanceId)
            .pipe(take(1))
            .subscribe((res) => {
                this.isLoading = false;
                this.timelineData = res;
                this.players = this.timelineData.timeline.playerData;
                this.redraw();
                if (
                    TraineeModeInfo.isTrainee(this.traineeModeInfo) &&
                    !this.standalone
                ) {
                    this.onRowClicked(this.traineeModeInfo.trainingRunId);
                    this.traineesTrainingRun =
                        this.traineeModeInfo.trainingRunId;
                }
            });
    }

    redraw(): void {
        this.setup();
        this.initializeFilters();
        this.initializeScales();
        this.drawEstimatedTimeBar();
        this.drawAxes();
        this.drawLevelThresholds();
        this.addZoomableArea();
        this.buildSvgDefs();
        this.drawAverageTimeLine();
        this.buildPlayersGroup();
        this.buildTooltips();
        this.addZoomAndBrush();
        this.buildCrosshair();
        this.drawLegend();
        this.drawFeedbackLearner();
    }

    /**
     * Assign imported filters from ./filters
     */
    initializeFilters(): void {
        this.filters = this.filtersService.getFiltersObject();
        this.filtersArray = this.filtersService.getFiltersArray();
    }

    /**
     * Draws feedback learner on default
     */
    drawFeedbackLearner(): void {
        this.checkFeedbackLearner();
        if (this.traineesTrainingRun) {
            this.drawPlayer(this.traineesTrainingRun);
        } else {
            if (this.filterPlayers) {
                this.filterPlayers.forEach((playerId) =>
                    this.drawPlayer(playerId),
                );
            }
        }
    }

    /**
     * Sets checked attribute of feedback learner in players array to true
     */
    checkFeedbackLearner(): TimelinePlayer {
        if (!this.players) {
            return null;
        }
        if (!this.standalone) {
            this.players = this.players.map((player) => {
                if (player.trainingRunId === this.traineesTrainingRun) {
                    player.checked = true;
                }
                return player;
            });
        } else {
            this.players = this.filterPlayers
                ? this.players.filter(
                      (player) =>
                          this.filterPlayers.indexOf(player.trainingRunId) !==
                          -1,
                  )
                : [];
        }
        return null;
    }

    /**
     * Builds svg, initializes line generator, zoom & behavior and scales
     */
    setup(): void {
        // first we want the table to fit in
        if (
            this.timelineData !== null &&
            this.getLevels().filter((level) => level.order !== undefined)
                .length <= 4
        ) {
            this.size.width =
                window.innerWidth < 1400 && this.enableAllPlayers
                    ? this.size.width * 0.55
                    : this.size.width * 0.7;
            this.wideTable.emit(false);
        } else {
            // we want to notify the timeline, that the table should be placed under the visualization
            this.wideTable.emit(true);
        }
        this.svgConfig = {
            width:
                this.size.width > window.innerWidth
                    ? window.innerWidth
                    : this.size.width,
            height: this.size.height,
        };
        this.svgMarginConfig = SVG_MARGIN_CONFIG;
        this.buildSVG();
        this.initializeLineGenerators();
        this.initializeZoomAndBrush();
        this.initializeScales();
    }

    /**
     * Appends main SVG element to the #score-level-container and assigns it to the class svg property
     */
    buildSVG(): void {
        const container = this.d3.select('#score-progress-container').html('');
        this.svg = container
            .append('svg')
            .attr('class', 'score-progress-svg')
            .attr(
                'width',
                this.size.width +
                    SVG_MARGIN_CONFIG.left +
                    SVG_MARGIN_CONFIG.right,
            )
            .attr(
                'height',
                this.size.height +
                    SVG_MARGIN_CONFIG.top +
                    SVG_MARGIN_CONFIG.bottom,
            )
            .style('margin-right', '10px')
            .append('g')
            .attr(
                'transform',
                'translate(' +
                    SVG_MARGIN_CONFIG.left +
                    ',' +
                    SVG_MARGIN_CONFIG.top +
                    ')',
            );
    }

    /**
     * Define line generator and its accessors for progress lines generating
     */
    initializeLineGenerators(): void {
        this.lineGenerator = this.d3
            .line<TimelineEvent>()
            .curve(this.d3.curveStepAfter)
            .x((event) => +this.timeScale(event.time).toFixed(0))
            .y((event) => +this.scoreScale(event.score).toFixed(0));

        this.contextLineGenerator = this.d3
            .line<TimelineEvent>()
            .curve(this.d3.curveStepAfter)
            .x((event) => +this.contextTimeScale(event.time).toFixed(0))
            .y((event) => +this.contextScoreScale(event.score).toFixed(0));
    }

    /**
     * Define zoom and brush behavior
     */
    initializeZoomAndBrush(): void {
        this.zoom = this.d3
            .zoom()
            .filter((event, _) => {
                if (event.ctrlKey) {
                    event.preventDefault();
                }
                if (event.type === 'wheel') {
                    // don't allow zooming without pressing [ctrl] key
                    return event.ctrlKey;
                }
                return true;
            })
            .scaleExtent([1, Infinity])
            .translateExtent([
                [0, 0],
                [this.size.width, this.size.height],
            ])
            .extent([
                [0, 0],
                [this.size.width, this.size.height],
            ])
            .on('start', (event, _) => this.onZoomStart(event))
            .on('zoom', (event, _) => this.onZoom(event))
            .on('end', (event, _) => this.onZoomEnd(event));

        this.brush = this.d3
            .brushX()
            .extent([
                [0, 0],
                [this.size.width, 70],
            ])
            .on('start', () => this.onBrushStart())
            .on('brush', (event, _) => this.onBrush(event))
            .on('end', () => this.onBrushEnd());
    }

    /**
     * Change cursor to grab and shrink clip to prevent showing events outside the area
     */
    onZoomStart(event) {
        if (event.sourceEvent && event.sourceEvent.type === 'mousedown') {
            // Panning start
            this.zoomableArea.classed('grabbed', true);
            this.clip.attr('x', 3);
        }
    }

    /**
     * Main zoom and pan behavior
     */
    onZoom(event, transformZoom?) {
        if (this.sourceEvent === 'brush' && event) return; // ignore zoom-by-brush
        this.sourceEvent = 'zoom';
        this.playersGroup
            .selectAll('circle') // Hide if out of area
            .style('opacity', function () {
                return this.cx.animVal.value < 0 ? 0 : 1;
            });
        let transform;
        if (event) {
            transform = event.transform;
        } else {
            transform = transformZoom;
        }
        const newDomain = transform.rescaleX(this.contextTimeScale).domain();
        this.timeScale.domain(newDomain);
        const scaleDomainStart = newDomain[0];
        const scaleDomainEnd = newDomain[1];
        this.timeAxisScale.domain([scaleDomainStart, scaleDomainEnd]);

        if (transform.k !== 1) {
            this.zoomTransform = transform;
        }
        this.redrawAxes(transform.k);
        this.redrawPlayers();
        this.redrawBars(transform);
        if (
            event &&
            event.sourceEvent &&
            event.sourceEvent.type !== 'dbclick'
        ) {
            this.updateCrosshair(event);
        }
        this.svg
            .select('.brush')
            .call(
                this.brush.move,
                this.timeScale.range().map(transform.invertX, transform),
            );
        this.sourceEvent = null;
    }

    /**
     * Change cursor and clip to normal.
     */
    onZoomEnd(event) {
        if (event.sourceEvent && event.sourceEvent.type === 'mouseup') {
            // Panning end
            this.zoomableArea.classed('grabbed', false);
            this.clip.attr('x', -7);
        }
    }

    /**
     * Change cursor to grab
     */
    onBrushStart(): void {
        this.svg
            .select('.brush>.selection')
            .attr('cursor', null)
            .classed('grabbed', true);
    }

    /**
     * Main brush behavior.
     */
    onBrush(event) {
        if (this.sourceEvent === 'zoom') return; // ignore brush-by-zoom
        this.sourceEvent = 'brush';
        const selection = event.selection || this.contextTimeScale;
        const newDomain = selection.map(
            this.contextTimeScale.invert,
            this.contextTimeScale,
        );
        this.timeScale.domain(newDomain);

        const scaleDomainStart = newDomain[0];
        const scaleDomainEnd = newDomain[1];
        this.timeAxisScale.domain([scaleDomainStart, scaleDomainEnd]);

        const transform = this.d3.zoomIdentity
            .scale(this.size.width / (selection[1] - selection[0]))
            .translate(-selection[0], 0);

        // dont update stored zoom when brush zoom is really not happening
        if (transform.k !== 1) {
            this.zoomTransform = transform;
        }

        this.redrawAxes(transform.k);
        this.redrawPlayers();
        this.redrawBars(transform);
        this.svg
            .select('.score-progress-zoom')
            .call(this.zoom.transform, transform);
        this.sourceEvent = null;
    }

    /**
     * Change cursor back to normal.
     */
    onBrushEnd(): void {
        this.svg.select('.brush>.selection').classed('grabbed', false);
    }

    /**
     * We reserve 0.5 of the score domain to display the edges of the player lines correctly
     * Define D3 scales
     */
    initializeScales(): void {
        this.playerColorScale = this.d3.scaleOrdinal().range(colorScheme);
        this.tableService.sendPlayerColorScale(this.playerColorScale);

        const scaleDomainStart = 0;
        const scaleDomainEnd = this.timelineData.timeline.maxParticipantTime;

        this.timeAxisScale = this.d3
            .scaleLinear()
            .range([0, this.size.width])
            .domain([scaleDomainStart, scaleDomainEnd]);
        this.scoreScale = this.d3
            .scaleLinear()
            .range([this.size.height, 0])
            .domain([
                -0.5,
                Math.max(...this.timelineData.timeline.maxScoreOfLevels) + 0.5,
            ]);

        this.scoreScale.clamp(true);

        this.timeScale = this.d3
            .scaleLinear()
            .range([0, this.size.width])
            .domain([0, this.timelineData.timeline.maxParticipantTime]);

        this.contextTimeScale = this.d3
            .scaleLinear()
            .range([0, this.size.width])
            .domain([0, this.timelineData.timeline.maxParticipantTime]);

        this.contextScoreScale = this.d3
            .scaleLinear()
            .range([CONTEXT_CONFIG.height, 0])
            .domain([
                -0.5,
                Math.max(...this.timelineData.timeline.maxScoreOfLevels) + 0.5,
            ]);

        this.eventsColorScale = this.d3.scaleOrdinal().range(colorScheme);
    }

    /**
     * Draw grey hatched time bar indicating estimated training run time
     */
    drawEstimatedTimeBar(): void {
        if (this.timelineData.timeline === null) {
            return;
        }

        this.svg
            .append('defs')
            .append('pattern')
            .attr('id', 'diagonalHatch')
            .attr('patternUnits', 'userSpaceOnUse')
            .attr('width', '7')
            .attr('height', '4')
            .attr('patternTransform', 'rotate(45)')
            .append('rect')
            .attr('width', '3')
            .attr('height', '4')
            .attr('transform', 'translate(0,0)')
            .attr('fill', 'lightgrey')
            .attr('opacity', '0.5');

        this.svg
            .append('rect')
            .style('fill', 'url(#diagonalHatch)')
            .attr('x', 5)
            .attr('y', 0)
            .attr(
                'width',
                this.timelineData.timeline.estimatedTime -
                    Math.abs(
                        this.size.width -
                            this.timelineData.timeline.estimatedTime,
                    ),
            )
            .attr('height', this.size.height)
            .attr('fill', 'url(#diagonalHatch)');
    }

    /**
     * Draw time axis, score axis and add labels
     */
    drawAxes(): void {
        this.drawTimeAxis();
        this.drawScoreAxis();
        this.drawAxesLabels();
    }

    /**
     * Draw time x axis with ticks every 30 minutes
     */
    drawTimeAxis(): void {
        const d3 = this.d3;
        this.xAxis = d3
            .axisBottom(this.timeAxisScale)
            .tickFormat((d: number) => this.hoursMinutesSeconds(d))
            .ticks(5);

        this.svg
            .append('g')
            .attr('class', 'score-progress x-axis')
            .attr(
                'transform',
                `translate(${AXES_CONFIG.xAxis.position.x}, ${
                    this.size.height + 20
                })`,
            )
            .call(this.xAxis);
    }

    /**
     * Draw score y axis, ticks accumulated/summed maximum gainable score for each levels completed
     */
    drawScoreAxis(): void {
        if (this.timelineData.timeline === null) {
            return;
        }
        const axesConfig = AXES_CONFIG;
        const yAxis = this.d3
            .axisLeft(this.scoreScale)
            .tickValues(this.timelineData.timeline.maxScoreOfLevels)
            .tickSize(axesConfig.xAxis.tickSize)
            .tickSizeOuter(0);

        this.svg
            .append('g')
            .attr('class', 'score-progress y-axis')
            .attr(
                'transform',
                `translate(${axesConfig.yAxis.position.x}, ${axesConfig.yAxis.position.y})`,
            )
            .call(yAxis);
    }

    /**
     * Draws axes labels
     */
    drawAxesLabels(): void {
        this.svg
            .append('text')
            .attr(
                'transform',
                `translate(${this.svgConfig.width / 2 - 50}, ${
                    this.svgConfig.height + 65
                })`,
            )
            .text('training time')
            .style('fill', '#4c4a4a');

        this.svg
            .append('text')
            .attr(
                'transform',
                `translate(${AXES_CONFIG.yAxis.position.x - 75}, ${
                    this.svgConfig.height / 2
                }) rotate(-90)`,
            )
            .attr('text-anchor', 'middle')
            .style('fill', '#4c4a4a')
            .text('score development'); // score increase per level

        const scores = this.svg.select('.y-axis').selectAll('.tick').data();
        const scoresWithZero = [0].concat(scores);
        const coordinates = [];
        for (let i = 0; i < scoresWithZero.length - 1; i++) {
            const midScore = (scoresWithZero[i + 1] + scoresWithZero[i]) / 2;
            const coordinate = this.scoreScale(midScore);
            coordinates.push(coordinate);
        }
    }

    /**
     * Draw vertical line indicating average game time of training
     */
    drawAverageTimeLine(): void {
        this.svg
            .append('line')
            .attr('id', 'average-time-line')
            .attr('class', 'time-line')
            .style('stroke-dasharray', '5,5')
            .style('stroke-width', 2)
            .attr('x1', this.timeScale(this.timelineData.timeline.averageTime))
            .attr('y1', 0)
            .attr('x2', this.timeScale(this.timelineData.timeline.averageTime))
            .attr('y2', this.size.height + 1);
    }

    /**
     * Draw horizontal lines indicating maximum gainable score for each levels completed
     */
    drawLevelThresholds(): void {
        const levelScores: number[] = this.svg
            .select('.y-axis')
            .selectAll('.tick')
            .data();
        const levelScoresWithoutLastLevel = levelScores.slice(
            0,
            levelScores.length - 1,
        );
        const lineGenerator = this.d3.line();
        const thresholdsGroup = this.svg
            .append('g')
            .attr('class', 'score-progress-thresholds');

        thresholdsGroup
            .selectAll('path')
            .data(levelScoresWithoutLastLevel)
            .enter()
            .append('path')
            .attr('d', (score: number) => {
                const x1 = 0;
                const y1 = this.scoreScale(score);
                const x2 = this.size.width;
                const y2 = y1;
                return lineGenerator([
                    [x1, y1],
                    [x2, y2],
                ]);
            });
    }

    /**
     * Appends rect with SVG dimensions, zoom behavior is called on this element
     */
    addZoomableArea(): void {
        this.zoomableArea = this.svg
            .append('rect')
            .attr('class', 'score-progress-zoom')
            .attr('width', this.size.width)
            .attr('height', this.size.height);
    }

    /**
     * Defines clip defs
     */
    buildSvgDefs(): void {
        this.clip = this.svg
            .append('defs')
            .append('svg:clipPath')
            .attr('id', 'clip')
            .append('svg:rect')
            .attr('width', this.size.width + 20)
            .attr('height', this.size.height + 20)
            .attr('x', -7)
            .attr('y', -7);

        this.svg
            .append('defs')
            .append('svg:clipPath')
            .attr('id', 'lineClip')
            .append('svg:rect')
            .attr('width', this.size.width + 5)
            .attr('height', this.size.height)
            .attr('x', 3)
            .attr('y', 0);
    }

    /**
     * Appends SVG group for holding players
     */
    buildPlayersGroup(): void {
        this.playersGroup = this.svg
            .append('g')
            .attr('class', 'score-progress-players')
            .attr('clip-path', 'url(#clip)')
            .style('isolation', 'isolate');
    }

    /**
     * Appends tooltip HTML elements to DOM
     */
    buildTooltips(): void {
        this.eventTooltip = this.d3
            .select('body')
            .append('div')
            .style('display', 'none');

        this.lineTooltip = this.d3
            .select('body')
            .append('div')
            .style('display', 'none');
    }

    /**
     * Call brush and zoom behaviors predefiend elements (zoomableArea and context)
     */
    addZoomAndBrush(): void {
        this.addBrush();
        this.addZoom();
    }

    /**
     * Build context element to DOM and call brush behavior on it
     */
    addBrush(): void {
        this.buildContextAndReturn()
            .context.append('g')
            .attr('class', 'brush')
            .attr('transform', `translate(0,10)`)
            .call(this.brush)
            .call(this.brush.move, this.timeScale.range());
    }

    /**
     * Appends context element to SVG and return it
     */
    buildContextAndReturn() {
        const context = this.svg
            .append('g')
            .attr('class', 'context')
            .attr(
                'transform',
                `translate(${AXES_CONFIG.xAxis.position.x}, ${
                    this.size.height + CONTEXT_CONFIG.height
                })`,
            );

        context
            .append('g')
            .attr('class', 'score-progress-context-x-axis')
            .attr('transform', `translate(0, ${CONTEXT_CONFIG.height + 10})`)
            .call(this.xAxis);

        return context;
    }

    /**
     * Calls zoom behavior on zoomableArea/
     */
    addZoom(): void {
        this.zoomableArea.call(this.zoom);
    }

    /**
     * Append crosshair to SVG and sets opacity to 0
     */
    buildCrosshair(): void {
        const crosshairGroup = this.svg
            .append('g')
            .attr('class', 'score-progress-crosshair')
            .style('opacity', 0);

        this.buildTimeCrosshair(crosshairGroup);

        this.zoomableArea
            .on('mouseover', this.onAreaMouseover.bind(this))
            .on('mousemove', (event, _) => this.onAreaMousemove(event))
            .on('mouseout', this.onAreaMouseout.bind(this));
    }

    /**
     * Appends time crosshair
     * @param crosshairGroup svg group holding crosshair
     */
    buildTimeCrosshair(crosshairGroup): void {
        crosshairGroup
            .append('line')
            .attr('id', 'focus-line-time')
            .attr('class', 'focus-line')
            .style('pointer-events', 'none'); // Prevents events triggering when interacting with parent element

        const crosshairLabelsGroup = crosshairGroup
            .append('g')
            .attr('class', 'focus-labels');

        crosshairLabelsGroup
            .append('text')
            .attr('id', 'focus-label-time')
            .attr('class', 'focus-label');
    }

    /**
     * Show crosshair whenever cursor enters the area
     */
    onAreaMouseover(): void {
        this.showCrosshair();
    }

    /**
     * @ignore
     */
    showCrosshair(): void {
        this.svg.select('.score-progress-crosshair').style('opacity', 1);
    }

    /**
     * Updates crosshair values and position
     */
    onAreaMousemove(event) {
        this.updateCrosshair(event);
    }

    /**
     * Updates crosshair's position and label values
     * @param staticCoordinates undefines if not passed otherwise static coordinates of hovered element (event) - for snapping
     */
    updateCrosshair(event, staticCoordinates?: [number, number]) {
        const d3 = this.d3;
        const focusLines = d3.select('.score-progress-crosshair');
        const focusLabels = d3.select('.score-progress-crosshair');
        const isStaticCoordinatesUsed = staticCoordinates === undefined;
        const coords = isStaticCoordinatesUsed
            ? this.d3.pointer(event, this.zoomableArea.node())
            : staticCoordinates;
        const x = coords[0];
        const time = this.hoursMinutesSeconds(this.timeScale.invert(x));
        // Vertical line - time
        focusLines
            .select('#focus-line-time')
            .attr('x1', +x)
            .attr('y1', -10)
            .attr('x2', +x)
            .attr('y2', this.size.height + 35);

        focusLabels
            .select('#focus-label-time')
            .attr('x', +x + 10)
            .attr('y', this.size.height + 15)
            .text(time);
    }

    /**
     * Hides crosshair whenever cursor leaves the zoomable area
     */
    onAreaMouseout(): void {
        this.hideCrosshair();
    }

    /**
     * @ignore
     */
    hideCrosshair(): void {
        this.svg.select('.score-progress-crosshair').style('opacity', 0);
    }

    /**
     * Draw legends to the right of the graph
     */
    drawLegend(): void {
        const x = -7; // 0;
        const y = -40;
        const legendGroup = this.svg
            .append('g')
            .attr('transform', 'translate(10, 0)');

        const rectWidth = 80;
        const rectHeight = 20;

        legendGroup
            .append('rect')
            .attr('width', rectWidth)
            .attr('height', rectHeight)
            .attr('transform', `translate(${x}, ${y})`)
            .style('mask', 'url(#mask)')
            .style('fill', 'grey');

        legendGroup
            .append('rect')
            .attr('width', rectWidth)
            .attr('height', rectHeight)
            .attr('transform', `translate(${x}, ${y})`)
            .style('stroke', 'black')
            .style('fill', 'url(#diagonalHatch)');

        legendGroup
            .append('text')
            .attr(
                'transform',
                `translate(${x + rectWidth + 10}, ${y + rectHeight / 1.5 + 1})`,
            )
            .html('Estimated time');

        legendGroup
            .append('line')
            .style('stroke-dasharray', '3,5')
            .style('stroke-width', 2)
            .attr('x1', x + 250)
            .attr('y1', y)
            .attr('x2', x + 250)
            .attr('y2', y + 20);
        legendGroup
            .append('text')
            .attr(
                'transform',
                `translate(${x + rectWidth + 179}, ${y + rectHeight / 1.5 + 1})`,
            )
            .html('Average time');
    }

    /**
     * Draws main line, events. Returns without any drawing if the players are not defined or the
     * current playerId is not among the participants -> e.g., supervisor
     * @param trainingRunId of player's trainig run to be drawn
     */
    drawPlayer(trainingRunId: number): void {
        if (this.players === null) {
            return;
        }
        const player: TimelinePlayer = this.players.filter(
            (p) => p.trainingRunId === trainingRunId,
        )[0];
        if (player === undefined) {
            return;
        }
        const playerGroup = this.playersGroup
            .append('g')
            .attr('id', 'score-progress-player-' + player.trainingRunId)
            .style('mix-blend-mode', 'multiply');

        this.drawMainLine(playerGroup, player);
        this.drawContextLine(player);
        if (trainingRunId === this.traineesTrainingRun) {
            this.highlightLine(trainingRunId);
        }
    }

    /**
     * Draws main line and events
     * @param playersGroup svg group holding main line and events
     * @param player holding id and events
     * @param level
     */
    drawMainLine(playersGroup, player: TimelinePlayer) {
        const lineGroup = playersGroup
            .append('g')
            .attr('clip-path', 'url(#lineClip)');

        const line = lineGroup
            .append('path')
            .attr('d', this.lineGenerator(this.getEvents(player)))
            .attr('class', 'score-progress-player')
            .classed(
                'score-progress-player-highlight',
                player.trainingRunId === this.traineesTrainingRun,
            )
            .classed('visible-line', true)
            .datum(player)
            .style('opacity', '0')
            .style('stroke', player.avatarColor);

        line.transition().duration(1000).style('opacity', '100');

        const clickableLine = lineGroup
            .append('path')
            .attr('d', this.lineGenerator(this.getEvents(player)))
            .attr('class', 'score-progress-player')
            .datum(player)
            .style('fill', 'none')
            .style('stroke', 'transparent')
            .style('stroke-width', '15px');

        this.addListenersToLine(clickableLine);

        playersGroup
            .append('g')
            .attr('id', 'score-progress-events-' + player.trainingRunId);
        this.drawPlayersEvents(player);

        return line;
    }

    /**
     * @ignore
     */
    addListenersToLine(line): void {
        line.on('mouseover', (event, datum) =>
            this.onLineMouseover(event, datum),
        )
            .on('mousemove', (event, datum) =>
                this.onLineMousemove(event, datum),
            )
            .on('mouseout', (event, datum) => this.onLineMouseout(datum))
            .on('wheel', (event, _) => this.disableScrolling(event));
    }

    /**
     * Highlights the line, show tooltip and crosshair
     * @param player
     */
    onLineMouseover(event, player: TimelinePlayer): void {
        this.highlightLine(player.trainingRunId);
        if (this.standalone) {
            this.lineTooltip = this.d3
                .select('body')
                .append('div')
                .style('display', 'none');
            this.updateLineTooltip(event, player);
        }
        this.lineTooltip.style('display', 'inline');
        this.showCrosshair();
        if (player.trainingRunId !== this.highlightedTrainee) {
            this.emitSelectedTrainee(player.trainingRunId);
        }
    }

    /**
     * @ignore
     */
    highlightLine(playerId: number): void {
        const playerGroup = this.d3.select(
            '#score-progress-player-' + playerId,
        );
        const path = playerGroup.select('.visible-line');
        path.classed('score-progress-player-highlight', true);
    }

    /**
     * Update tooltip and crosshair
     */
    onLineMousemove(event, player: TimelinePlayer) {
        this.updateLineTooltip(event, player);
        this.updateCrosshair(event);
    }

    /**
     * Add player's name/id to tooltip and updates its position
     * @param player
     */
    updateLineTooltip(event, player: TimelinePlayer) {
        const x: number = event.pageX;
        const y: number = event.pageY;
        const topMargin = -50;
        const top: number = y + topMargin;

        const content = `Player: <br> ${player.name.toString()}`;
        this.lineTooltip
            .attr('class', 'score-progress-line-tooltip')
            .style('left', x - 5 + 'px')
            .style('top', top + 'px')
            .style('margin-left', -content.length / 4 + 'em');
        this.lineTooltip.html(content);
    }

    /**
     * Unhighlights the line, hides tooltip and crosshair
     * @param player
     */
    onLineMouseout(player: TimelinePlayer): void {
        if (this.standalone) {
            this.d3.select('.score-progress-line-tooltip').remove();
        } else {
            this.unhighlightLine(player.trainingRunId);
        }
        this.lineTooltip.style('display', 'none');
        this.hideCrosshair();
    }

    /**
     * @ignore
     */
    unhighlightLine(playerId: number): void {
        if (playerId === this.traineesTrainingRun) {
            return;
        }
        const playerGroup = this.d3.select(
            '#score-progress-player-' + playerId,
        );
        const path = playerGroup.select('path');
        path.classed('score-progress-player-highlight', false);
    }

    /**
     * Draws line in a context bar
     * @param player holding its id and events
     * @param level
     */
    drawContextLine(player: TimelinePlayer): void {
        const contextLine = this.svg
            .select('.context')
            .append('path')
            .attr('d', this.contextLineGenerator(this.getEvents(player)))
            .attr('id', 'score-progress-context-player-' + player.trainingRunId)
            .attr('class', 'score-progress-context-player')
            .style('opacity', '0')
            .style('stroke', player.avatarColor);
        contextLine.transition().duration(1000).style('opacity', '100');
    }

    /**
     * Draws events onto main line
     * @param player
     */
    drawPlayersEvents(player: TimelinePlayer): void {
        const filteredEvents = this.filterEvents(this.getEvents(player));
        const colorScale = this.eventsColorScale;
        const eventsGroup = this.playersGroup
            .select('#score-progress-player-' + player.trainingRunId)
            .select('#score-progress-events-' + player.trainingRunId);

        let events = eventsGroup
            .selectAll('.event')
            .data(filteredEvents, (event) => event.time);

        this.removeFilteredEvents(events);
        events = this.addNewEventsAndReturnThem(events);
        events
            .attr('r', 7)
            .attr('cx', (event) => this.timeScale(event.time))
            .attr('cy', (event) => this.scoreScale(event.score))
            .style('opacity', '0')
            .style('fill', (event) => {
                if (event.levelOrder === undefined) {
                    return 'lightgray';
                }
                return this.d3.interpolateGreys(
                    (1 / (player.levels.length + 4)) * (event.levelOrder + 2),
                );
            })
            .datum((event) => {
                event.playerId = player.trainingRunId;
                return event;
            })
            .style('stroke', 'black')
            .style('stroke-width', '0.5');

        this.drawInnerLevelUps(eventsGroup, filteredEvents, colorScale);
        this.addFadeInEffectTransition(events);
        this.addListenersToEvents(events);
    }

    /**
     * Filters elements with checked filters
     * @param unfilteredEvents to be filtered
     * @param playerId player's id
     */
    filterEvents(unfilteredEvents: TimelineEvent[]) {
        let events = [];
        // checks if there is any checked filter if not empty array of events is set
        if (
            Object.keys(this.filters).some(
                (key) => this.filters[key].checked === true,
            )
        ) {
            Object.keys(this.filters).forEach((key) => {
                const filter = this.filters[key];
                if (filter.checked) {
                    // Union operation between all events and filtered events. This needs to be done so filtering by multiple
                    // filters won't filter events from each other
                    events = [
                        ...new Set([
                            ...events,
                            ...unfilteredEvents.filter(filter.filterFunction),
                        ]),
                    ];
                }
            });
        } else {
            events = [];
        }
        return events;
    }

    /**
     * @ignore
     */
    removeFilteredEvents(events): void {
        events.exit().transition().duration(200).attr('r', 0).remove();
    }

    addNewEventsAndReturnThem(events): void {
        return events
            .enter()
            .append('circle')
            .attr('r', 0)
            .attr('class', 'event');
    }

    /**
     * @ignore
     */
    addFadeInEffectTransition(events): void {
        const fadeInEffect = this.d3.transition().duration(1000);

        events.transition(fadeInEffect).style('opacity', '100');
    }

    addListenersToEvents(events): void {
        events
            .on('mouseover', (event, datum) =>
                this.onEventMouseover(event, datum),
            )
            .on('mousemove', (event, _) => this.onEventMousemove(event))
            .on('mouseout', (event, datum) => this.onEventMouseout(datum))
            .on('wheel', (event) => this.disableScrolling(event));
    }

    /**
     * Draws small circles in correct answer submit events
     * @param eventsGroup
     * @param filteredEvents
     * @param colorScale
     */
    drawInnerLevelUps(
        eventsGroup,
        filteredEvents: TimelineEvent[],
        colorScale,
    ): void {
        let levelUpsInnerFill = eventsGroup
            .selectAll('.level-up')
            .data(filteredEvents, (event) => event.time);

        levelUpsInnerFill.exit().remove();

        levelUpsInnerFill = levelUpsInnerFill
            .enter()
            .filter(
                (event) =>
                    event.text.toUpperCase().split(' ')[0] === 'CORRECT' &&
                    event.level !== this.getLevels().length,
            )
            .append('circle')
            .attr('class', 'level-up')
            .attr('r', 4)
            .attr('cx', (event) => this.timeScale(event.time))
            .attr('cy', (event) => this.scoreScale(event.score))
            .style('fill', (event) =>
                this.d3
                    .hsl(colorScale((event.level + 1).toString()).toString())
                    .darker(0.9),
            )
            .style('stroke', 'black')
            .style('stroke-width', '0.2');
        this.addFadeInEffectTransition(levelUpsInnerFill);
        this.addListenersToEvents(levelUpsInnerFill);
    }

    /**
     * Shows tooltip and snaps crosshair.
     * @param player
     */
    onEventMouseover(event, player) {
        this.eventTooltip.style('display', 'inline');
        this.updateEventTooltip(event, player);
        this.highlightLine(player.playerId);
        this.showCrosshair();
    }

    /**
     * Updates tooltip details.
     * @param player
     */
    updateEventTooltip(event, player) {
        const topMargin = -75;
        const leftMargin = 8;
        const left = event.pageX + leftMargin;
        const top = event.pageY + topMargin;
        this.eventTooltip
            .attr('class', 'score-progress-tooltip')
            .style('left', left + 'px')
            .style('top', top + 'px');
        const eventMessage = this.getEventMessage(player);
        const content = `
    ${eventMessage}
    <br>
    <b>${player.scoreChange > 0 ? '+' : ''}${
        player.scoreChange !== 0 ? player.scoreChange : ''
    }</b>
    <hr style='margin: 5px'>
    Score: ${player.score}`;
        this.eventTooltip.html(content);
    }

    /**
     * Snaps crosshair on event
     * @param d
     * @param index
     * @param nodeList
     */
    onEventMousemove(event) {
        const eventElement = event.target;
        const x = eventElement.getAttribute('cx');
        const y = eventElement.getAttribute('cy');
        this.updateCrosshair([x, y], [x, y]);
    }

    /**
     * Parses the event message and returns our required message.
     * @param event
     * @returns any
     */
    getEventMessage(event: TimelineEvent): string {
        return event.text;
    }

    /**
     * Hides tooltip, crosshair and highlight of the line
     * @param d
     */
    onEventMouseout(d): void {
        this.eventTooltip.style('display', 'none');
        if (!this.standalone) {
            this.unhighlightLine(d.playerId);
        }
        this.hideCrosshair();
    }

    /**
     * Disables scrolling when wheeling over events
     */
    disableScrolling(event) {
        event.preventDefault();
    }

    /**
     * Removes player's line and events from the plane
     * @param playerId
     */
    removePlayer(playerId: number): void {
        this.playersGroup.select('#score-progress-player-' + playerId).remove();
        this.svg
            .select('.context')
            .select('#score-progress-context-player-' + playerId)
            .remove();
    }

    /**
     * Calculate new ticks when zooming.
     */
    redrawAxes(_k): void {
        // this.xAxis.tickArguments([this.d3.timeMinute.every(this.tickLength / Math.round(k))]);
        this.svg.select('.score-progress.x-axis').call(this.xAxis);
    }

    /**
     * Updates line length when zooming
     */
    redrawPlayers(): void {
        this.playersGroup
            .selectAll('.score-progress-player')
            .attr('d', (d) => this.lineGenerator(this.getEvents(d)));
        this.playersGroup
            .selectAll('circle')
            .attr('cx', (d) => this.timeScale(d.time));
    }

    /**
     * Updates bar length when zooming
     * @param transform
     */
    redrawBars(transform): void {
        this.svg
            .select('.score-progress-bars')
            .selectAll('rect')
            .attr(
                'transform',
                `translate(${transform.x},0) scale(${transform.k}, 1)`,
            );
    }

    /**
     * Retrieves all levels from all players
     */
    getLevels(): TimelineLevel[] {
        let levels = [];
        this.timelineData.timeline.playerData.forEach((player) => {
            levels = [...levels, ...player.levels];
        });

        // Filter duplicate levels
        levels = levels.filter(
            (level, index, self) =>
                index ===
                self.findIndex(
                    (t) => t.id === level.id && t.name === level.name,
                ),
        );
        return levels;
    }

    /**
     * Retrieves all events from player
     */
    getEvents(player: TimelinePlayer): TimelineEvent[] {
        let events = [];
        player.levels.forEach((level) => {
            if (level.levelType === TimelineLevelTypeEnum.TRAINING) {
                events = [...events, ...(level as TrainingLevel).events];
            } else if (level.levelType === TimelineLevelTypeEnum.INFO) {
                events = [...events, ...(level as InfoLevel).events];
            } else if (level.levelType === TimelineLevelTypeEnum.ASSESSMENT) {
                events = [...events, ...(level as AssessmentLevel).events];
            } else if (level.levelType === TimelineLevelTypeEnum.ACCESS) {
                events = [...events, ...(level as AccessLevel).events];
            }
        });
        return events;
    }

    /**
     * Activates filter.
     */
    onFilterChange(): void {
        if (!this.standalone) {
            const checkedPlayers = this.players.filter(
                (player) => player.checked,
            );
            checkedPlayers.forEach((player) => {
                this.drawPlayersEvents(player);
            });
        } else {
            this.players.forEach((player) => {
                this.drawPlayersEvents(player);
            });
        }
    }

    /**
     * Draws or removes player from the plane when row in score table clicked.
     */
    onRowClicked(trainingRunId: number): void {
        const p = this.players.find((el) => el.trainingRunId === trainingRunId);
        p.checked = !p.checked;
        if (p.checked) {
            this.drawPlayer(p.trainingRunId);
        } else {
            this.removePlayer(p.trainingRunId);
        }
    }

    /**
     * Resets zoom to normal
     */
    onResetZoom(): void {
        this.svg
            .select('.score-progress-zoom')
            .transition()
            .duration(250)
            .call(this.zoom.transform, this.d3.zoomIdentity);
    }

    private hoursMinutesSeconds(timestamp: number): string {
        const hours = Math.floor(timestamp / 3600)
            .toString()
            .padStart(2, '0');
        const minutes = Math.floor((timestamp % 3600) / 60)
            .toString()
            .padStart(2, '0');
        const seconds = Math.floor(timestamp % 60)
            .toString()
            .padStart(2, '0');
        return `${hours}:${minutes}:${seconds}`;
    }

    private emitSelectedTrainee(trainingRunId: number) {
        if (this.highlightedTrainee !== trainingRunId) {
            this.selectedTrainee.emit(trainingRunId);
        }
    }
}
