import {
    Component,
    EventEmitter,
    inject,
    Input,
    OnChanges,
    OnInit,
    Output,
    SimpleChanges,
} from '@angular/core';
import {
    AXES_CONFIG,
    BARS_CONFIG,
    CROSSHAIR_CONFIG,
    LEVEL_LABELS_CONFIG,
    PLAYER_POINT_CONFIG,
    SVG_CONFIG,
    SVG_MARGIN_CONFIG,
} from './config';

import { SvgConfig } from '../../../../shared/interfaces/configurations/svg-config';
import { TraineeModeInfo } from '../../../../shared/interfaces/trainee-mode-info';
import { take } from 'rxjs/operators';
import { ClusteringTrainingData } from '../../../model/clustering/clustering-training-data';
import { LevelTypeEnum } from '../../../model/clustering/enums/level-type.enum';
import { Level } from '../../../model/clustering/level';
import { ClusteringService } from '../shared/service/clustering.service';
import { PlayerLevelData } from '../../../model/clustering/player-level-data';
import { D3, D3Service } from '../../../../../common/d3-service/d3-service';
import { ContainerElement, ScaleBand, ScaleLinear } from 'd3';

@Component({
    selector: 'crczp-visualization-overview-levels',
    templateUrl: './levels.component.html',
    styleUrls: ['./levels.component.css'],
})
export class LevelsComponent implements OnInit, OnChanges {
    /**
     * Training data
     */
    @Input() levelsData: ClusteringTrainingData = {
        finalResults: null,
        levels: null,
    };
    /**
     * Player to highlight
     */
    @Input() selectedTrainingRunId: number;
    /**
     * Main svg dimensions.
     */
    @Input() size: SvgConfig;
    /**
     * Array of color strings for visualization.
     */
    @Input() colorScheme: string[];
    /**
     * Use if visualization should use anonymized data (without names and credentials of other users) from trainee point of view
     */
    @Input() traineeModeInfo: TraineeModeInfo;
    /**
     * List of players which should be displayed
     */
    @Input() filterPlayers: number[];
    /**
     * Emits id of selected player.
     */
    @Output() selectedTrainee = new EventEmitter<number>();
    /**
     * If visualization is used as standalone it displays all given players automatically, highlighting feedback learner
     * if provided. On the other hand, it displays only players from @filterPlayers and reacts to event selectedTrainingRunId.
     */
    @Input() standalone: boolean;
    /**
     * If provided is used for aggregated view across data from several instances.
     */
    @Input() instanceIds: number[];
    private dataService = inject(ClusteringService);
    private d3: D3;
    private xScale: ScaleLinear<number, number>;
    private yScaleBandBars: ScaleBand<string>;
    private svg;

    private svgWidth;
    private svgHeight;
    private barWidth;

    private playerClicked = false; // If no player is selected, hover out of player will cancel the highlight
    private traineesTrainingRunId: number;

    constructor() {
        const d3 = inject(D3Service);

        this.d3 = d3.getD3();
    }

    ngOnInit(): void {
        this.load();
        if (this.traineeModeInfo) {
            if (!this.standalone) {
                this.traineesTrainingRunId = this.traineeModeInfo.trainingRunId;
            }
        }
    }

    ngOnChanges(changes: SimpleChanges): void {
        if (this.levelsData.levels) {
            this.updateCanvas();
        }

        if ('selectedTrainingRunId' in changes) {
            if (
                changes['selectedTrainingRunId'].currentValue !==
                changes['selectedTrainingRunId'].previousValue
            ) {
                if (!changes['selectedTrainingRunId'].isFirstChange()) {
                    this.highlightSelectedTrainingRun();
                }
            }
        }

        if (
            'instanceIds' in changes &&
            !changes['instanceIds'].isFirstChange()
        ) {
            this.load();
        }
    }

    load(): void {
        this.dataService
            .getAllData(this.traineeModeInfo, this.instanceIds)
            .pipe(take(1))
            .subscribe((res) => {
                this.levelsData = res;
                this.updateCanvas();
            });
    }

    updateCanvas(): void {
        this.svgHeight =
            typeof this.size !== 'undefined' && this.size !== null
                ? this.size.height
                : SVG_CONFIG.height;
        this.svgWidth =
            typeof this.size !== 'undefined' && this.size !== null
                ? this.size.width
                : SVG_CONFIG.width;
        this.barWidth = 0.7 * this.svgWidth;
        this.setup();
        this.drawBars();
        this.drawAxes();
        this.drawPlayers();
        this.buildCrosshair();
        this.addListeners();
        this.highlightSelectedTrainingRun();
    }

    /**
     * Initialize scales
     */
    setup(): void {
        this.initializeScales();
        this.buildSVG();
    }

    /**
     * Initialize global D3 scales
     */
    initializeScales(): void {
        this.xScale = this.d3
            .scaleLinear()
            .range([0, this.barWidth])
            .domain([0, this.getMaxTime()]);
    }

    /**
     * Appends main SVG element to the #score-level-container and assigns it to the class svg property
     */
    buildSVG(): void {
        const container = this.d3.select('#score-level-container').html('');
        this.svg = container
            .append('svg')
            .attr(
                'width',
                this.svgWidth +
                    SVG_MARGIN_CONFIG.left +
                    SVG_MARGIN_CONFIG.right,
            )
            .attr(
                'height',
                this.svgHeight +
                    SVG_MARGIN_CONFIG.top +
                    SVG_MARGIN_CONFIG.bottom +
                    20,
            )
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
     * Draws each level bars
     */
    drawBars(): void {
        const barsGroup = this.svg.append('g').attr('id', 'score-level-bars');
        const data: Level[] = this.getTrainingLevels();
        this.initializeScaleBand(data);
        this.drawMaximumBars(barsGroup, data);
        this.drawEstimateBars(barsGroup, data);
        this.drawAverageTimeLines(barsGroup, data);
        if (this.standalone) {
            this.drawAverageScoreLines(barsGroup, data);
        }
        this.drawBarLabels();
    }

    /**
     * Initialize D3 ScaleBand and assign it to global property
     */
    initializeScaleBand(data: Level[]): void {
        this.yScaleBandBars = this.d3
            .scaleBand()
            .range([0, this.svgHeight]) // [this.svgConfig.height, 0] results with reversed order
            .domain(data.map((d) => d.order.toString()))
            .padding(BARS_CONFIG.padding);
    }

    /**
     * Draw maximum time bars
     * @param barsGroup d3 selection of group holding each bar
     * @param data holding necessary values for bar visualization
     */
    drawMaximumBars(barsGroup, data: Level[]): void {
        barsGroup
            .selectAll('.score-level-bar-max')
            .data(data)
            .enter()
            .append('rect')
            .attr('id', (level: Level) => 'score-level-bar-max-' + level.order)
            .attr('class', 'score-level-bar score-level-bar-max')
            .attr('x', 0)
            .attr('y', (level: Level) =>
                this.yScaleBandBars(level.order.toString()),
            )
            .attr('height', this.yScaleBandBars.bandwidth())
            .attr('width', (level: Level) =>
                this.xScale(level.maxParticipantTime),
            )
            .style('fill', (d, i) =>
                this.d3.interpolateGreys((1 / (data.length + 4)) * (i + 2)),
            )
            .style('opacity', BARS_CONFIG.maxBarOpacity);
    }

    /**
     * Draw estimate time bars overlaying maximum bars with hatch pattern
     * @param barsGroup d3 selection of group holding each bar
     * @param data holding necessary values for bar visualization
     */
    drawEstimateBars(barsGroup, data: Level[]): void {
        barsGroup
            .selectAll('.score-level-bar-estimate')
            .data(data)
            .enter()
            .append('rect')
            .attr(
                'id',
                (level: Level) => 'score-level-bar-estimate-' + level.order,
            )
            .attr('class', 'score-level-bar score-level-bar-estimate')
            .attr('x', 0)
            .attr('y', (level: Level) =>
                this.yScaleBandBars(level.order.toString()),
            )
            .attr('height', this.yScaleBandBars.bandwidth())
            .attr('width', (level: Level) =>
                this.xScale(level.estimatedTime) > this.barWidth
                    ? this.xScale(level.maxParticipantTime)
                    : this.xScale(level.estimatedTime),
            )
            .style('fill', (level: Level) => {
                if (level.order > 5) {
                    return 'url(#diagonalHatch)';
                } else {
                    return 'url(#diagonalHatchDarker)';
                }
            });
    }

    /**
     * Draw average time lines overlaying the maximum and estimate bars
     * @param barsGroup d3 selection of group holding each bar
     * @param data holding necessary values for bar visualization
     */
    drawAverageTimeLines(barsGroup, data: Level[]): void {
        barsGroup
            .selectAll('.score-level-line-avg')
            .data(data)
            .enter()
            .append('line')
            .attr('class', 'score-level-line score-level-line-avg')
            .style('stroke-dasharray', '5,5')
            .style('stroke-width', 2)
            .style('stroke', '#3C4445')
            .attr('x1', (level: Level) => this.xScale(level.averageTime))
            .attr('y1', (level: Level) =>
                this.yScaleBandBars(level.order.toString()),
            )
            .attr('x2', (level: Level) => this.xScale(level.averageTime))
            .attr(
                'y2',
                (level: Level) =>
                    this.yScaleBandBars.bandwidth() +
                    this.yScaleBandBars(level.order.toString()),
            );
    }

    /**
     * Draw average score lines overlaying the maximum score bars
     * @param barsGroup d3 selection of group holding each bar
     * @param data holding necessary values for bar visualization
     */
    drawAverageScoreLines(barsGroup, data: Level[]): void {
        barsGroup
            .selectAll('.max-score-level-line-avg')
            .data(data)
            .enter()
            .append('line')
            .attr('class', 'score-level-line score-level-line-avg')
            .style('stroke-dasharray', '5,5')
            .style('stroke-width', 2)
            .style('stroke', '#3C4445')
            .attr('x1', () => 0)
            .attr('y1', (level: Level) => {
                const yScale = this.d3
                    .scaleLinear()
                    .range([this.yScaleBandBars.bandwidth(), 0])
                    .domain([0, level.maxAchievableScore]);
                return (
                    this.yScaleBandBars(level.order.toString()) +
                    yScale(level.averageScore)
                );
            })
            .attr('x2', (level: Level) =>
                this.d3
                    .select('#score-level-bar-max-' + level.order)
                    .attr('width'),
            )
            .attr('y2', (level: Level) => {
                const yScale = this.d3
                    .scaleLinear()
                    .range([this.yScaleBandBars.bandwidth(), 0])
                    .domain([0, level.maxAchievableScore]);
                return (
                    this.yScaleBandBars(level.order.toString()) +
                    yScale(level.averageScore)
                );
            });
    }

    /**
     * Draw bar labels (Level number and name) next to the maximum bars
     */
    drawBarLabels(): void {
        if (this.levelsData == null) {
            return;
        }
        this.levelsData.levels.forEach((level) => {
            // we only show training levels in this visualization
            if (level.levelType === LevelTypeEnum.TrainingLevel) {
                const bar = this.d3.select(
                    '#score-level-bar-max-' + level.order,
                );
                const estimateBarWidth = Number(
                    this.d3
                        .select('#score-level-bar-estimate-' + level.order)
                        .attr('width'),
                );
                const maxBarWidth = Number(bar.attr('width'));
                const barY = bar.attr('y');
                const text = this.svg
                    .append('g')
                    .attr(
                        'transform',
                        `translate(
           ${
               +Math.max(estimateBarWidth, maxBarWidth) +
               LEVEL_LABELS_CONFIG.padding.left
           },
           ${+barY})`,
                    )
                    .append('text');

                text.append('tspan')
                    .attr('dy', '1.3em')
                    .attr('x', 0)
                    .text(`Level ${level.order}`);

                text.append('tspan')
                    .attr('dy', '1.3em')
                    .attr('x', 0)
                    .text(level.title);
            }
        });
    }

    /**
     * Draw time axis, dashed left axis and score axis for each level
     */
    drawAxes(): void {
        this.drawTimeAxis();
        this.drawDashedLeftAxis();
        this.drawScoreAxes();
    }

    /**
     * Draw time x axis, ticks every 5 minutes
     */
    drawTimeAxis(): void {
        const d3 = this.d3;
        const timeScale = this.getTimeScale();
        const xAxis = d3
            .axisBottom(timeScale)
            .tickFormat((d: number) => this.hoursMinutesSeconds(d))
            .ticks(5);

        this.svg
            .append('g')
            .attr('class', 'x-axis')
            .attr(
                'transform',
                `translate(${AXES_CONFIG.xAxis.position.x}, ${
                    this.svgHeight + 0.3 * 0.3
                })`,
            )
            .call(xAxis);
        this.drawTimeAxisLabel();
        this.styleFirstTickOfTimeAxis();
    }

    /**
     * @returns D3 TimeScale of x-axis
     */
    getTimeScale(): any {
        const scaleDomainStart = 0;
        const scaleDomainEnd = this.getMaxTime();
        const timeScale = this.d3
            .scaleLinear()
            .range([0, this.barWidth])
            .domain([scaleDomainStart, scaleDomainEnd]);
        return timeScale;
    }

    /**
     * Draws time axis label
     */
    drawTimeAxisLabel(): void {
        this.svg
            .append('text')
            .attr(
                'transform',
                `translate(${this.barWidth / 2 - 50}, ${this.svgHeight + 60})`,
            )
            .text('time per level')
            .style('fill', '#4c4a4a');
    }

    /**
     * Removes the line tick and adds circle instead on the first tick of time axis
     */
    styleFirstTickOfTimeAxis(): void {
        this.svg
            .select('.x-axis>.tick')
            .append('circle')
            .attr('r', 3.5)
            .style('fill', '#888888');
    }

    /**
     * Draws dashed left axis underneath score axis
     */
    drawDashedLeftAxis(): void {
        this.svg
            .append('g')
            .attr('class', 'y-axis-nolabel')
            .attr(
                'transform',
                `translate(${AXES_CONFIG.yAxis.position.x}, ${AXES_CONFIG.yAxis.position.y})`,
            )
            .append('path')
            .attr(
                'd',
                `M0,${this.svgHeight - SVG_MARGIN_CONFIG.bottom * 0.3}.5V0.5H0`,
            );
    }

    /**
     * Draw score axis for each level
     */
    drawScoreAxes(): void {
        const d3 = this.d3;
        const trainingLevels =
            this.levelsData !== null
                ? this.levelsData.levels.filter(
                      (level) =>
                          level.levelType === LevelTypeEnum.TrainingLevel,
                  )
                : [];
        d3.selectAll('.score-level-bar-max').each((bar) => {
            const yScale = d3
                .scaleLinear()
                .range([this.yScaleBandBars.bandwidth(), 0])
                .domain([
                    0,
                    trainingLevels[bar['order'] - 1].maxAchievableScore,
                ]);
            const yAxis = d3
                .axisLeft(yScale)
                .tickSize(AXES_CONFIG.yAxis.tickSize)
                .tickValues([
                    0,
                    trainingLevels[bar['order'] - 1].maxAchievableScore,
                ])
                .tickPadding(AXES_CONFIG.yAxis.tickPadding)
                .tickFormat((d) => (d === 0 ? '' : d.toString()));
            const barY = d3
                .select('#score-level-bar-max-' + bar['order'])
                .attr('y');

            this.svg
                .append('g')
                .attr('class', 'y-axis')
                .attr(
                    'transform',
                    `translate(${AXES_CONFIG.yAxis.position.x}, ${barY})`,
                )
                .call(yAxis);

            this.d3
                .selectAll('.y-axis>.tick>text')
                .attr('y', AXES_CONFIG.yAxis.tickPositionY);
        });

        this.drawScoreAxesLabel();
    }

    drawScoreAxesLabel(): void {
        this.svg
            .append('text')
            .attr(
                'transform',
                `translate(${AXES_CONFIG.yAxis.position.x - 50}, ${
                    this.svgHeight / 2
                }) rotate(-90)`,
            )
            .attr('text-anchor', 'middle')
            .style('fill', '#4c4a4a')
            .text('score');
    }

    /**
     * Draw players (circles) on each level bar indicating each level training time and achieved score
     */
    drawPlayers(): void {
        const levels = this.getTrainingLevels();
        levels.forEach((level, i) => {
            this.drawPlayersOnSingleBar(level.playerLevelData, i);
        });
    }

    /**
     * Draw players on current level bar
     * @param players in current level
     * @param i number of level
     */
    drawPlayersOnSingleBar(players: PlayerLevelData[], i: number): void {
        const levelNumber = i + 1;
        const barCoordinateY = this.yScaleBandBars(levelNumber.toString());
        const barHeight = barCoordinateY + this.yScaleBandBars.bandwidth();
        const trainingLevels =
            this.levelsData !== null ? this.getTrainingLevels() : [];
        const yBarScale = this.d3
            .scaleLinear()
            .range([
                barHeight, // bottom coordinate
                barCoordinateY, // top coordinate (y values goes from top to bottom)
            ])
            .domain([0, trainingLevels[i].maxAchievableScore]);

        const playersGroup = this.svg
            .append('g')
            .attr('class', 'score-level-players')
            .datum({ number: levelNumber });
        if (this.standalone) {
            players = players.filter(
                (player) =>
                    this.filterPlayers.indexOf(player.trainingRunId) !== -1,
            );
        }

        this.xScale = this.d3
            .scaleLinear()
            .range([0, this.barWidth])
            .domain([0, this.getMaxTime()]);
        playersGroup
            .selectAll('.player-point-level-' + i)
            .data(players)
            .enter()
            .append('circle')
            .attr(
                'class',
                (d: PlayerLevelData) =>
                    'player-point player-point-level-' +
                    i +
                    ' p' +
                    d.trainingRunId,
            )
            .attr('cx', (d: PlayerLevelData) => this.xScale(d.trainingTime))
            .attr('cy', (d: PlayerLevelData) =>
                yBarScale(d.participantLevelScore),
            )
            .attr('r', (d: PlayerLevelData) =>
                d.trainingRunId === this.traineesTrainingRunId
                    ? PLAYER_POINT_CONFIG.feedbackLearner.pointRadius
                    : PLAYER_POINT_CONFIG.pointRadius,
            )
            .style('fill', (d: PlayerLevelData) => d.avatarColor);
    }

    /**
     * Appends crosshair lines and its labels to the SVG and sets the opacity to 0
     */
    buildCrosshair(): void {
        const crosshairGroup = this.svg
            .append('g')
            .attr('class', 'focus-lines')
            .style('opacity', 0);

        const crosshairLabelsGroup = this.svg
            .append('g')
            .attr('class', 'focus-labels')
            .style('opacity', 0);

        this.buildScoreCrosshairLine(crosshairGroup);
        this.buildTimeCrosshairLine(crosshairGroup);
        this.buildCrosshairLabels(crosshairLabelsGroup);
    }

    buildScoreCrosshairLine(crosshairGroup): void {
        crosshairGroup
            .append('line')
            .attr('id', 'focus-line-score')
            .attr('class', 'focus-line')
            .style('pointer-events', 'none'); // Prevents events triggering when interacting with parent element
    }

    buildTimeCrosshairLine(crosshairGroup): void {
        crosshairGroup
            .append('line')
            .attr('id', 'focus-line-time')
            .attr('class', 'focus-line')
            .style('pointer-events', 'none');
    }

    buildCrosshairLabels(crosshairLabelsGroup): void {
        crosshairLabelsGroup
            .append('text')
            .attr('id', 'focus-label-score')
            .attr('class', 'focus-label');

        crosshairLabelsGroup
            .append('text')
            .attr('id', 'focus-label-time')
            .attr('class', 'focus-label');
    }

    /**
     * Add event listeners to players and bars
     */
    addListeners(): void {
        const svg = this.svg;

        svg.selectAll('.score-level-bar')
            .on('mouseover', () => this.onBarMouseover())
            .on('mousemove', (event, datum) =>
                this.onBarMousemove(event, datum),
            )
            .on('mouseout', () => this.onBarMouseout());

        svg.selectAll('.player-point')
            .on('mouseover', (event, datum) =>
                this.onPlayerPointMouseover(event, datum),
            )
            .on('mousemove', (event, datum) =>
                this.onPlayerPointMousemove(event, datum),
            )
            .on('mouseout', (_, datum) => this.onPlayerPointMouseout(datum))
            .on('click', (event, datum) =>
                this.onPlayerPointClick(event, datum),
            );

        this.d3
            .select('#score-level-container')
            .on('click', this.onContainerClick.bind(this));
    }

    onBarMouseover(): void {
        this.showCrosshair();
    }

    showCrosshair(): void {
        this.svg.select('.focus-lines').style('opacity', 1);
        this.svg.select('.focus-labels').style('opacity', 1);
    }

    /**
     *
     * @param barData
     */
    onBarMousemove(event, barData: Level) {
        const d3 = this.d3;
        const crosshairLinesGroup = this.svg.select('.focus-lines');
        const crosshairLabelsGroup = this.svg.select('.focus-labels');
        const bar = this.svg.select('#score-level-bar-max-' + barData.order);

        const coordinates = d3.pointer(event, bar.node());
        const x = coordinates[0];
        const y = coordinates[1];
        const trainingLevels =
            this.levelsData !== null
                ? this.levelsData.levels.filter(
                      (level) =>
                          level.levelType === LevelTypeEnum.TrainingLevel,
                  )
                : [];
        const xScale = this.d3
            .scaleLinear()
            .range([0, this.barWidth])
            .domain([0, this.getMaxTime()]);
        xScale.clamp(true);
        const yScale = d3
            .scaleLinear()
            .range([0, trainingLevels[barData.order - 1].maxAchievableScore])
            .domain([this.yScaleBandBars.bandwidth(), 0]);
        yScale.clamp(true);

        const groups = {
            lines: crosshairLinesGroup,
            labels: crosshairLabelsGroup,
        };

        const playersData = {
            x: x,
            y: y,
            time: this.hoursMinutesSeconds(xScale.invert(coordinates[0])),
            score: +yScale(y - bar.attr('y')).toFixed(0),
        };

        this.updateCrosshair(groups, playersData);
    }

    /**
     * Update crosshair position and label values
     */
    updateCrosshair(
        groups: { lines: any; labels: any },
        playersData: { x: number; y: number; time: string; score: number },
    ): void {
        this.updateScoreCrosshair(groups, playersData);
        this.updateTimeCrosshair(groups, playersData);
    }

    /**
     * Updates score crosshair line position and its label's value
     * @param groups reference to svg groups of crosshair lines and labels
     * @param playersData holding crosshair's position and values
     */
    updateScoreCrosshair(
        groups: { lines: any; labels: any },
        playersData: { x: number; y: number; time: string; score: number },
    ): void {
        const crosshairConfig = CROSSHAIR_CONFIG;
        groups.lines
            .select('#focus-line-score')
            .attr('x1', playersData.x)
            .attr('y1', crosshairConfig.score.line.y1)
            .attr('x2', playersData.x)
            .attr('y2', crosshairConfig.score.line.y2);

        groups.labels
            .select('#focus-label-score')
            .attr('x', crosshairConfig.score.label.x)
            .attr('y', +playersData.y + crosshairConfig.score.label.y)
            .text(playersData.score);
    }

    /**
     * Updates time crosshair line position and its label's value
     * @param groups reference to svg groups of crosshair lines and labels
     * @param playersData holding crosshair's position and values
     */
    updateTimeCrosshair(
        groups: { lines: any; labels: any },
        playersData: { x: number; y: number; time: string; score: number },
    ): void {
        const crosshairConfig = CROSSHAIR_CONFIG;
        groups.lines
            .select('#focus-line-time')
            .attr('x1', crosshairConfig.time.line.x1)
            .attr('y1', playersData.y)
            .attr('x2', crosshairConfig.time.line.x2)
            .attr('y2', playersData.y);

        groups.labels
            .select('#focus-label-time')
            .attr('x', +playersData.x + crosshairConfig.time.label.x)
            .attr(
                'y',
                this.svgHeight + BARS_CONFIG.padding * BARS_CONFIG.padding - 5,
            )
            .text(playersData.time);
    }

    /**
     * Hide crosshair when cursor leaves any bar
     */
    onBarMouseout(): void {
        this.hideCrosshair();
    }

    /**
     * Sets crosshair's opacity to 0
     */
    hideCrosshair(): void {
        this.svg.select('.focus-lines').style('opacity', 0);
        this.svg.select('.focus-labels').style('opacity', 0);
    }

    /**
     * Cancels player selection when clicked everywhere inside the container
     */
    onContainerClick(): void {
        this.playerClicked = false;
    }

    /**
     * Highlights player, shows tooltip and crosshair on hover
     * @param player
     */
    onPlayerPointMouseover(event, player: PlayerLevelData) {
        this.hideTooltip(); // Prevents showing multiple tooltips
        this.highlightHoveredPlayer(player);
        this.showTooltip(event, player);
        this.showCrosshair();
        this.emitSelectedTrainee(player.trainingRunId);
    }

    /**
     * Makes the <circle> bigger
     * @param player data held by player's <circle> element in __data__
     */
    highlightHoveredPlayer(player: PlayerLevelData): void {
        const players = this.d3.selectAll(
            '.player-point.p' + player.trainingRunId,
        );
        const isTraineesRun =
            player.trainingRunId === this.traineesTrainingRunId;
        const radius = isTraineesRun
            ? PLAYER_POINT_CONFIG.feedbackLearner.pointRadius
            : PLAYER_POINT_CONFIG.pointRadius;
        const magnifier = isTraineesRun
            ? 1.05
            : PLAYER_POINT_CONFIG.pointHighlight;
        const newRadius = radius * magnifier;

        players
            .attr('r', newRadius)
            .style('cursor', 'pointer')
            .classed('player-point-highlighted', true)
            .classed('player-point', false);
    }

    /**
     *
     * @param player data held by <circle> element in __data__ property
     */
    showTooltip(event, player: PlayerLevelData) {
        const playerTooltip = this.d3
            .select('body')
            .append('div')
            .attr('class', 'clustering-overview-player-tooltip')
            .style('opacity', 0);

        playerTooltip.transition().duration(200).style('opacity', 0.9);
        const coordinates = this.d3.pointer(
            event,
            <ContainerElement>this.d3.select('#score-level-bars').node(),
        );
        const groupHeight =
            this.yScaleBandBars.step() * this.levelsData.levels.length +
            SVG_MARGIN_CONFIG.top;
        const yOffset = groupHeight - coordinates[1] < 60 ? -50 : 10;

        playerTooltip
            .html(
                `<p><b>Player: ${player.name} <br> Score: ${player.participantLevelScore}</b>`,
            )
            .style('left', event.pageX + 10 + 'px')
            .style('top', event.pageY + yOffset + 'px');
    }

    /**
     * Show crosshair at fixed position (center of circle).
     * @param event mouse move event
     * @param player data held by player's <circle> element in __data__
     */
    onPlayerPointMousemove(event, player) {
        const d3 = this.d3;
        const playerElementNode = event.target;
        const playersGroup = playerElementNode.parentNode;
        const level = d3.select(playersGroup).datum()['number'];
        const trainingLevels =
            this.levelsData !== null
                ? this.levelsData.levels.filter(
                      (trainingLevel) =>
                          trainingLevel.levelType ===
                          LevelTypeEnum.TrainingLevel,
                  )
                : [];
        const yScale = d3
            .scaleLinear()
            .range([0, trainingLevels[level - 1].maxAchievableScore])
            .domain([this.yScaleBandBars.bandwidth(), 0]);
        yScale.clamp(true);
        const crosshairLinesGroup = this.svg.select('.focus-lines');
        const crosshairLabelsGroup = this.svg.select('.focus-labels');
        yScale.clamp(true);

        const groups = {
            lines: crosshairLinesGroup,
            labels: crosshairLabelsGroup,
        };

        const playersData = {
            x: playerElementNode.getAttribute('cx'),
            y: playerElementNode.getAttribute('cy'),
            time: this.hoursMinutesSeconds(player.trainingTime),
            score: player.participantLevelScore.toFixed(0),
        };

        this.updateCrosshair(groups, playersData);
        this.emitSelectedTrainee(player.trainingRunId);
    }

    /**
     * Unhighlights the hovered player, hides tooltip and crosshair on mouseout event
     * @param player data held by <circle> element in __data__ property
     */
    onPlayerPointMouseout(player: PlayerLevelData): void {
        this.unhighlightHoveredPlayer(player);
        this.hideTooltip();
        this.hideCrosshair();
        this.emitSelectedTrainee(player.trainingRunId);
    }

    /**
     *
     * @param player data held by <circle> element in __data__ property
     */
    unhighlightHoveredPlayer(player: PlayerLevelData): void {
        const players = this.d3.selectAll(
            '.player-point-highlighted.p' + player.trainingRunId,
        );
        const isTraineesRun =
            player.trainingRunId === this.traineesTrainingRunId;
        const radius = isTraineesRun
            ? PLAYER_POINT_CONFIG.feedbackLearner.pointRadius
            : PLAYER_POINT_CONFIG.pointRadius;
        players
            .attr('r', radius)
            .classed('player-point-highlighted', false)
            .classed('player-point', true);
    }

    /**
     * Removes player tooltip element from DOM
     */
    hideTooltip(): void {
        this.d3.selectAll('.clustering-overview-player-tooltip').remove();
    }

    /**
     * Emit selection to parent component for highlight in other component
     * @param player data held by <circle> element in __data__ property
     */
    onPlayerPointClick(event, player: PlayerLevelData) {
        event.stopPropagation();
        this.emitSelectedTrainee(player.trainingRunId);
        this.playerClicked = true;
    }

    /**
     * Set player's circles in Score Level and Score Final components to bigger radius and fill color
     */
    highlightSelectedTrainingRun(): void {
        this.hideTooltip(); // Prevents showing the tooltip when user quickly leaves the viz
        if (!this.selectedTrainingRunId) {
            return;
        }

        this.svg.selectAll('.player-point').style('opacity', 0.5);

        const player = this.svg
            .selectAll('.p' + this.selectedTrainingRunId)
            .classed('player-point', false)
            .classed('player-point-selected', true)
            .transition()
            .duration(1500)
            .ease(this.d3.easeElasticOut)
            .style('opacity', 1)
            .style('fill', (data, index, nodeList) => {
                const color = this.d3.hsl(nodeList[index].style.fill);
                return color.darker(0.8);
            });

        if (this.selectedTrainingRunId === this.traineesTrainingRunId) {
            return;
        }

        player.attr(
            'r',
            PLAYER_POINT_CONFIG.pointRadius *
                PLAYER_POINT_CONFIG.pointHighlight *
                1.1,
        );
    }

    /**
     * @returns data for bar drawing
     */
    getTrainingLevels(): Level[] {
        const levels = this.levelsData.levels.filter(
            (level) => level.levelType === LevelTypeEnum.TrainingLevel,
        );
        levels.forEach((level, i) => {
            level.order = ++i;
        });
        return levels;
    }

    private hoursMinutesSeconds(timestamp): string {
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

    private getMaxTime(): number {
        const levels = this.levelsData.levels.filter(
            (level) => level.levelType === LevelTypeEnum.TrainingLevel,
        );
        let maxTime = 0;
        levels.forEach((level) => {
            maxTime =
                level.maxParticipantTime > maxTime
                    ? level.maxParticipantTime
                    : maxTime;
        });
        return maxTime;
    }

    private emitSelectedTrainee(trainingRunId: number) {
        if (this.selectedTrainingRunId !== trainingRunId) {
            this.selectedTrainee.emit(trainingRunId);
        }
    }
}
