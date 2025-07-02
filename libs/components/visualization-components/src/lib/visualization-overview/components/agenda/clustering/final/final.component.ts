import { Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges, inject } from '@angular/core';
import {AXES_CONFIG, BAR_CONFIG, CROSSHAIR_CONFIG, PLAYER_POINT_CONFIG, SVG_CONFIG, SVG_MARGIN_CONFIG} from './config';
import {SvgConfig} from '../../../../shared/interfaces/configurations/svg-config';
import {TraineeModeInfo} from '../../../../shared/interfaces/trainee-mode-info';
import {take} from 'rxjs/operators';
import {ClusteringTrainingData} from '../../../model/clustering/clustering-training-data';
import {ClusteringService} from '../shared/service/clustering.service';
import {D3, D3Service} from '../../../../../common/d3-service/d3-service';
import {ContainerElement, ScaleLinear} from 'd3';
import {FinalResults} from '../../../model/clustering/final-results';
import {PlayerData} from '../../../model/clustering/player-data';

@Component({
    selector: 'crczp-visualization-overview-final',
    templateUrl: './final.component.html',
    styleUrls: ['./final.component.css'],
    standalone: false
})
export class FinalComponent implements OnInit, OnChanges {
    private dataService = inject(ClusteringService);

    /**
     * Training data
     */
    @Input() dataClusteringFinal: ClusteringTrainingData = {finalResults: null, levels: null};
    /**
     * Player to highlight
     */
    @Input() selectedTrainingRunId: number;
    /**
     * Array of color strings for visualization.
     */
    @Input() colorScheme: string[];
    /**
     * Main svg dimensions.
     */
    @Input() size: SvgConfig;
    /**
     * Use if visualization should use anonymized data (without names and credentials of other users) from trainee point of view
     */
    @Input() traineeModeInfo: TraineeModeInfo;
    /**
     * Emits id of selected player.
     */
    @Output() selectedTrainee = new EventEmitter<number>();
    /**
     * List of players which should be displayed
     */
    @Input() filterPlayers: number[];
    /**
     * If visualization is used as standalone it displays all given players automatically, highlighting feedback learner
     * if provided. On the other hand, it displays only players from @filterPlayers and reacts to event selectedTrainingRunId.
     */
    @Input() standalone: boolean;

    /**
     * If provided is used for aggregated view across data from several instances.
     */
    @Input() instanceIds: number[];

    private d3: D3;
    private xScale: ScaleLinear<number, number>;
    private yScale: ScaleLinear<number, number>;
    private svg; // D3 selection of main <svg> element

    private barWidth;
    private svgHeight;
    private svgWidth;

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

    load(): void {
        this.dataService
            .getAllData(this.traineeModeInfo, this.instanceIds)
            .pipe(take(1))
            .subscribe((res) => {
                this.dataClusteringFinal = res;
                this.updateCanvas();
            });
    }

    ngOnChanges(changes: SimpleChanges): void {
        if (this.dataClusteringFinal.finalResults) {
            this.updateCanvas();
        }

        if ('selectedTrainingRunId' in changes) {
            if (changes.selectedTrainingRunId.currentValue !== changes.selectedTrainingRunId.previousValue) {
                if (!changes.selectedTrainingRunId.isFirstChange()) {
                    this.highlightSelectedTrainingRun();
                }
            }
        }

        if ('instanceIds' in changes && !changes['instanceIds'].isFirstChange()) {
            this.load();
        }
    }

    updateCanvas(): void {
        this.barWidth = typeof this.size !== 'undefined' && this.size !== null ? this.size.width : SVG_CONFIG.width;
        this.barWidth *= 0.7;
        this.svgHeight = typeof this.size !== 'undefined' && this.size !== null ? this.size.height : SVG_CONFIG.height;
        this.svgWidth = typeof this.size !== 'undefined' && this.size !== null ? this.size.width : SVG_CONFIG.width;
        this.setup();
        this.drawBars();
        this.drawAxes();
        this.drawPlayers();
        this.buildCrosshair();
        this.addListeners();
        this.highlightSelectedTrainingRun();
    }

    /**
     * Initialize D3 scales and build SVG element
     */
    setup(): void {
        this.initializeScales();
        this.buildSVG();
    }

    /**
     * Initialize D3 scales for time/x axis and score/y axis.
     */
    initializeScales(): void {
        this.xScale = this.d3
            .scaleLinear()
            .range([0, this.barWidth])
            .domain([0, this.dataClusteringFinal.finalResults.maxParticipantTime]);

        this.yScale = this.d3
            .scaleLinear()
            .range([SVG_CONFIG.height, 0])
            .domain([0, this.dataClusteringFinal.finalResults.maxAchievableScore]);
    }

    /**
     * Adds main SVG element to the #container and assign it to svg property
     */
    buildSVG(): void {
        const container = this.d3.select('#container').html(''); // Clear the container
        this.svg = container
            .append('svg')
            .attr('width', this.svgWidth + SVG_MARGIN_CONFIG.left + SVG_MARGIN_CONFIG.right)
            .attr('height', this.svgHeight + SVG_MARGIN_CONFIG.top + SVG_MARGIN_CONFIG.bottom + 30)
            .append('g')
            .attr('transform', 'translate(' + SVG_MARGIN_CONFIG.left + ',' + SVG_MARGIN_CONFIG.top + ')');
    }

    /**
     * Draws average and maximum time bars
     */
    drawBars(): void {
        const barsGroup = this.svg.append('g').attr('class', 'score-final-bars');

        this.drawMaximumTimeBar(barsGroup, this.dataClusteringFinal.finalResults);
        this.drawEstimatedTimeBar(barsGroup, this.dataClusteringFinal.finalResults);
        this.drawAverageTimeLine(barsGroup, this.dataClusteringFinal.finalResults);
        if (this.standalone) {
            this.drawAverageScoreLine(barsGroup, this.dataClusteringFinal.finalResults);
        }
        this.drawBarLabel();
    }

    /**
     * Creates maximum time bar of training
     * @param barsGroup D3 selection of group holding both bars
     * @param data
     */
    drawMaximumTimeBar(barsGroup, data: FinalResults): void {
        barsGroup
            .append('rect')
            .attr('class', 'score-final-bar-max')
            .attr('x', 0)
            .attr('y', 0)
            .attr('height', this.svgHeight)
            .attr('width', this.xScale(data.maxParticipantTime))
            .attr('fill', BAR_CONFIG.fillColorBright);
    }

    /**
     * Creates estimated time bar for training
     * @param barsGroup D3 selection of group holding both bars
     * @param data
     */
    drawEstimatedTimeBar(barsGroup, data: FinalResults): void {
        this.svg
            .append('defs')
            .append('pattern')
            .attr('id', 'diagonalHatchDarker')
            .attr('patternUnits', 'userSpaceOnUse')
            .attr('width', '7')
            .attr('height', '4')
            .attr('patternTransform', 'rotate(45)')
            .append('rect')
            .attr('width', '3')
            .attr('height', '4')
            .attr('transform', 'translate(0,0)')
            .attr('fill', '#9A9A9A')
            .attr('opacity', '0.5');

        barsGroup
            .append('rect')
            .attr('class', 'score-final-bar-estimate')
            .attr('x', 0)
            .attr('y', 0)
            .attr('height', this.svgHeight)
            .attr(
                'width',
                this.xScale(data.estimatedTime) > this.barWidth
                    ? this.xScale(data.maxParticipantTime)
                    : this.xScale(data.estimatedTime)
            )
            .attr('fill', 'url(#diagonalHatchDarker)');
    }

    /**
     * Creates average time line of training
     * @param barsGroup D3 selection of group holding both bars
     * @param data
     */
    drawAverageTimeLine(barsGroup, data: FinalResults): void {
        barsGroup
            .append('line')
            .attr('id', 'time-final-line-average')
            .style('stroke-dasharray', '5,5')
            .style('stroke-width', 2)
            .style('stroke', '#3C4445')
            .attr('x1', this.xScale(data.averageTime))
            .attr('y1', 1)
            .attr('x2', this.xScale(data.averageTime))
            .attr('y2', this.svgHeight + 1);
    }

    /**
     * Creates average score line of training
     * @param barsGroup D3 selection of group holding both bars
     * @param data
     */
    drawAverageScoreLine(barsGroup, data: FinalResults): void {
        const yScale = this.d3
            .scaleLinear()
            .range([SVG_CONFIG.height, 0])
            .domain([0, this.dataClusteringFinal.finalResults.maxAchievableScore]);

        barsGroup
            .append('line')
            .attr('id', 'score-final-line-average')
            .style('stroke-dasharray', '5,5')
            .style('stroke-width', 2)
            .style('stroke', '#3C4445')
            .attr('x1', 0)
            .attr('y1', yScale(data.averageScore))
            .attr('x2', this.d3.select('.score-final-bar-max').attr('width'))
            .attr('y2', yScale(data.averageScore));
    }

    /**
     * Draws label on the right of the bars
     */
    drawBarLabel(): void {
        this.drawLegend();
    }

    /**
     * Draws legend under bar label
     */
    drawLegend(): void {
        const x = 0.75 * this.svgWidth;
        const y = this.svgHeight * 0.15;
        const yOffset = 30;
        const labelOffset = 35;
        const timeLabelOffset = 35;

        this.drawMaximumTimeLegend({x: x, y: y}, timeLabelOffset);
        this.drawEstimatedTimeLegend({x: x, y: y + yOffset}, timeLabelOffset);
        this.drawAverageTimeLegend({x: x, y: y + yOffset * 2}, labelOffset);
        if (this.standalone) {
            this.drawAverageScoreLegend({x: x, y: y + yOffset * 3}, labelOffset);
        }

        if (this.traineesTrainingRunId != null) {
            this.drawOtherPlayersLegend({x: x, y: y + yOffset * 3}, labelOffset);
            this.drawFeedbackLearnerLegend({x: x, y: y + yOffset * 4}, labelOffset);
        }
    }

    drawMaximumTimeLegend(coordinates: { x: number; y: number }, labelOffset): void {
        this.svg
            .append('rect')
            .attr('x', coordinates.x)
            .attr('y', coordinates.y)
            .attr('width', 30)
            .attr('height', 10)
            .style('fill', '#D6D6D6');
        this.svg
            .append('text')
            .attr('x', coordinates.x + labelOffset)
            .attr('y', coordinates.y + 9.5)
            .html('Maximum time');
    }

    drawEstimatedTimeLegend(coordinates: { x: number; y: number }, labelOffset): void {
        this.svg
            .append('rect')
            .attr('x', coordinates.x)
            .attr('y', coordinates.y)
            .attr('width', 30)
            .attr('height', 10)
            .style('fill', 'url(#diagonalHatchDarker)');

        this.svg
            .append('text')
            .attr('x', coordinates.x + labelOffset)
            .attr('y', coordinates.y + 9.5)
            .html('Estimated time');
    }

    drawAverageTimeLegend(coordinates: { x: number; y: number }, labelOffset): void {
        this.svg
            .append('line')
            .style('stroke-dasharray', '3,5')
            .style('stroke-width', 2)
            .style('stroke', '#3C4445')
            .attr('x1', coordinates.x + 5)
            .attr('y1', coordinates.y - 3)
            .attr('x2', coordinates.x + 5)
            .attr('y2', coordinates.y + 20);
        this.svg
            .append('text')
            .attr('x', coordinates.x + labelOffset)
            .attr('y', coordinates.y + 9.5)
            .html('Average time');
    }

    drawAverageScoreLegend(coordinates: { x: number; y: number }, labelOffset): void {
        this.svg
            .append('line')
            .style('stroke-dasharray', '3,5')
            .style('stroke-width', 2)
            .style('stroke', '#3C4445')
            .attr('x1', coordinates.x + 5)
            .attr('y1', coordinates.y + 5)
            .attr('x2', coordinates.x + 28)
            .attr('y2', coordinates.y + 5);
        this.svg
            .append('text')
            .attr('x', coordinates.x + labelOffset)
            .attr('y', coordinates.y + 9.5)
            .html('Average score');
    }

    drawOtherPlayersLegend(coordinates: { x: number; y: number }, labelOffset): void {
        this.svg
            .append('circle')
            .attr('cx', coordinates.x + PLAYER_POINT_CONFIG.pointRadius)
            .attr('cy', coordinates.y + PLAYER_POINT_CONFIG.pointRadius)
            .attr('r', PLAYER_POINT_CONFIG.pointRadius)
            .style('fill', PLAYER_POINT_CONFIG.fillColor);
        this.svg
            .append('text')
            .attr('x', coordinates.x + labelOffset)
            .attr('y', coordinates.y + 9.5)
            .html('Other players');
    }

    drawFeedbackLearnerLegend(coordinates: { x: number; y: number }, labelOffset): void {
        this.svg
            .append('circle')
            .attr('cx', coordinates.x + PLAYER_POINT_CONFIG.pointRadius + 1)
            .attr('cy', coordinates.y + PLAYER_POINT_CONFIG.feedbackLearner.pointRadius / 1.5)
            .attr('r', PLAYER_POINT_CONFIG.feedbackLearner.pointRadius)
            .style('fill', PLAYER_POINT_CONFIG.fillColor);
        this.svg
            .append('text')
            .attr('x', coordinates.x + labelOffset)
            .attr('y', coordinates.y + 9.5)
            .html('You');
    }

    /**
     * Draw time/x axis and score/y axis
     */
    drawAxes(): void {
        this.drawTimeAxis();
        this.drawScoreAxis();
    }

    /**
     * Draws time/x axis, ticks every 30 minutes
     * @param timeScale D3 time scale of domain
     */
    drawTimeAxis(): void {
        const timeScale = this.getTimeScale();
        const d3 = this.d3;
        const xAxis = d3
            .axisBottom(timeScale)
            .tickFormat((d: number) => this.hoursMinutesSeconds(d))
            .ticks(5);
        this.svg
            .append('g')
            .attr('class', 'x-axis')
            .attr('transform', `translate(${AXES_CONFIG.xAxis.position.x}, ${SVG_CONFIG.height + 20})`)
            .call(xAxis);

        this.drawTimeAxisLabel();
        this.styleFirstTickOfTimeAxis();
    }

    /**
     * Initialize time scale of range [0, this.barWidth] and domain [0, maximum training time]
     * @returns D3 ScaleTime
     */
    getTimeScale(): any {
        const scaleDomainStart = 0;
        const scaleDomainEnd = this.dataClusteringFinal.finalResults.maxParticipantTime;
        const timeScale = this.d3.scaleLinear().range([0, this.barWidth]).domain([scaleDomainStart, scaleDomainEnd]);
        return timeScale;
    }

    /**
     * Draws time axis label
     */
    drawTimeAxisLabel(): void {
        this.svg
            .append('text')
            .attr('transform', `translate(${this.barWidth / 2 - 50}, ${this.svgHeight + 75})`)
            .style('fill', '#4c4a4a')
            .text('training time');
        /*.style('font-weight', 'bold');*/
    }

    /**
     * Removes the line tick and adds circle instead oprocessDatan the first tick of time axis
     */
    styleFirstTickOfTimeAxis(): void {
        this.svg.select('.x-axis>.tick>line').remove();
        this.svg.select('.x-axis>.tick').append('circle').attr('r', 3.5).style('fill', '#888888');
    }

    /**
     * Draws score with single tick, the 0-tick is ignored by tickFormat
     */
    drawScoreAxis(): void {
        const axesConfig = AXES_CONFIG;
        const maximumScore = this.dataClusteringFinal.finalResults.maxAchievableScore;
        const scoreScale = this.yScale;

        const yAxis = this.d3
            .axisLeft(scoreScale)
            .tickSize(axesConfig.yAxis.tickSize)
            .tickValues([0, maximumScore])
            .tickFormat((value) => (value === 0 ? '' : value.toString()))
            .tickPadding(axesConfig.yAxis.tickPadding);

        this.svg
            .append('g')
            .attr('class', 'y-axis')
            .attr('transform', `translate(${axesConfig.yAxis.position.x}, ${axesConfig.yAxis.position.y})`)
            .call(yAxis);

        this.drawScoreAxisLabel();
    }

    drawScoreAxisLabel(): void {
        this.svg
            .append('text')
            .attr('transform', `translate(${AXES_CONFIG.xAxis.position.x - 35}, ${this.svgHeight / 2}) rotate(-90)`)
            .text('score')
            .attr('text-anchor', 'middle')
            .style('fill', '#4c4a4a');
    }

    /**
     * Draw players (circles) on the bar
     */
    drawPlayers(): void {
        const playersGroup = this.svg.append('g').attr('class', 'score-final-players');
        let players = this.dataClusteringFinal.finalResults.playerData;
        if (this.standalone) {
            players = this.dataClusteringFinal.finalResults.playerData.filter(
                (player) => this.filterPlayers.indexOf(player.trainingRunId) !== -1
            );
        }

        playersGroup
            .selectAll('circle')
            .data(players)
            .enter()
            .append('circle')
            .attr('class', (playerData: PlayerData) => 'player-point p' + playerData.trainingRunId)
            .attr('id', (playerData: PlayerData) => 'p' + playerData.trainingRunId)
            .attr('cx', (playerData: PlayerData) => this.xScale(playerData.trainingTime))
            .attr('cy', (playerData: PlayerData) => this.yScale(playerData.trainingScore))
            .attr('r', (playerData: PlayerData) =>
                playerData.trainingRunId === this.traineesTrainingRunId
                    ? PLAYER_POINT_CONFIG.feedbackLearner.pointRadius
                    : PLAYER_POINT_CONFIG.pointRadius
            )
            .style('fill', (playerData: PlayerData) => playerData.avatarColor);
    }

    /**
     * Appends crosshair lines and its labels to the SVG and sets the opacity to 0
     */
    buildCrosshair(): void {
        const crosshairGroup = this.svg.append('g').attr('class', 'focus-lines').style('opacity', 0);

        const crosshairLabelsGroup = this.svg.append('g').attr('class', 'focus-labels').style('opacity', 0);

        this.buildScoreCrosshairLine(crosshairGroup);
        this.buildTimeCrosshairLine(crosshairGroup);
        this.buildCrosshairLabels(crosshairLabelsGroup);
    }

    /**
     * Appends score crosshair line to the svg group
     * @param crosshairGroup D3 selection of svg group holding crosshair lines
     */
    buildScoreCrosshairLine(crosshairGroup): void {
        crosshairGroup
            .append('line')
            .attr('id', 'focus-line-score')
            .attr('class', 'focus-line')
            .style('pointer-events', 'none'); // Prevents events triggering when interacting with parent element
    }

    /**
     * Appends time crosshair line to the svg group
     * @param crosshairGroup D3 selection of svg group holding crosshair lines
     */
    buildTimeCrosshairLine(crosshairGroup): void {
        crosshairGroup
            .append('line')
            .attr('id', 'focus-line-time')
            .attr('class', 'focus-line')
            .style('pointer-events', 'none');
    }

    /**
     * Appends text svg element to the svg group
     * @param crosshairLabelsGroup D3 selection of svg group holding crosshair lines labels
     */
    buildCrosshairLabels(crosshairLabelsGroup): void {
        crosshairLabelsGroup.append('text').attr('id', 'focus-label-score').attr('class', 'focus-label');

        crosshairLabelsGroup.append('text').attr('id', 'focus-label-time').attr('class', 'focus-label');
    }

    /**
     * Adds event listeners to players and bars
     */
    addListeners(): void {
        this.addListenersToPlayers();
        this.addListenersToBars();
    }

    /**
     * Adds hover and click events listeners to players
     */
    addListenersToPlayers(): void {
        this.svg
            .selectAll('.player-point')
            .on('mouseover', (event, datum) => this.onPlayerMouseover(event, datum))
            .on('mousemove', (event, datum) => this.onPlayerMousemove(event, datum))
            .on('mouseout', (_, datum) => this.onPlayerMouseout(datum))
            .on('click', (event, datum) => this.onPlayerClick(event, datum));
    }

    /**
     * Highlights _ALL_ player's points (also in Score Level Component) and shows tooltip
     * @param player data held by player's <circle> element in __data__
     */
    onPlayerMouseover(event, player: PlayerData) {
        this.hideTooltip(); // Prevents showing multiple tooltips
        this.highlightHoveredPlayer(player.trainingRunId);
        this.showTooltip(event, player);
        this.showCrosshair();
        this.emitSelectedTrainee(player.trainingRunId);
    }

    /**
     * Makes the <circle> bigger
     * @param trainingRunId training run id of trainee which should be highlighted
     */
    highlightHoveredPlayer(trainingRunId: number): void {
        const players = this.d3.selectAll('.player-point.p' + trainingRunId);
        const isTraineesRun = trainingRunId === this.traineesTrainingRunId;
        const radius = isTraineesRun
            ? PLAYER_POINT_CONFIG.feedbackLearner.pointRadius
            : PLAYER_POINT_CONFIG.pointRadius;
        const magnifier = isTraineesRun ? 1.05 : PLAYER_POINT_CONFIG.pointHighlight;
        const newRadius = radius * magnifier;

        players
            .attr('r', newRadius)
            .style('cursor', 'pointer')
            .classed('player-point-highlighted', true)
            .classed('player-point', false);
    }

    /**
     * Shows tooltip with player's name and score
     * @param player data held by player's <circle> element in __data__
     */
    showTooltip(event, player: PlayerData) {
        const playerTooltip = this.d3
            .select('body')
            .append('div')
            .attr('class', 'clustering-overview-player-tooltip')
            .style('opacity', 0);

        playerTooltip.transition().duration(200).style('opacity', 0.9);

        const coordinates = this.d3.pointer(event, <ContainerElement>this.d3.select('.score-final-bars').node());
        const yOffset = coordinates[1] > 55 ? -50 : 10;
        const x = event.pageX + 10;
        const y = event.pageY + yOffset;

        playerTooltip
            .html(`<p><b>Player: ${player.name} <br> Score: ${player.trainingScore}</b>`)
            .style('left', x + 'px')
            .style('top', y + 'px');
    }

    /**
     * Sets crosshair groups opacity to 1
     */
    showCrosshair(): void {
        this.svg.select('.focus-lines').style('opacity', 1);
        this.svg.select('.focus-labels').style('opacity', 1);
    }

    /**
     * Show crosshair at fixed position (center of circle).
     * @param player data held by player's <circle> element in __data__
     * @param index of current circle
     * @param nodeList of all <circle> elements
     */
    onPlayerMousemove(event, player: PlayerData) {
        const d3 = this.d3;
        const crosshairLinesGroup = d3.select('.focus-lines');
        const crosshairLabelsGroup = d3.select('.focus-labels');

        const playerElementNode = event.target;

        const groups = {
            lines: crosshairLinesGroup,
            labels: crosshairLabelsGroup
        };

        const playersData = {
            x: playerElementNode.getAttribute('cx'),
            y: playerElementNode.getAttribute('cy'),
            time: this.hoursMinutesSeconds(player.trainingTime),
            score: player.trainingScore
        };

        this.updateCrosshair(groups, playersData);
        this.emitSelectedTrainee(player.trainingRunId);
    }

    /**
     * Update crosshair position and label values
     */
    updateCrosshair(
        groups: { lines: any; labels: any },
        playersData: { x: number; y: number; time: string; score: number }
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
        playersData: { x: number; y: number; time: string; score: number }
    ): void {
        const crosshairConfig = CROSSHAIR_CONFIG;
        groups.lines
            .select('#focus-line-score')
            .attr('x1', playersData.x)
            .attr('y1', crosshairConfig.score.line.y1)
            .attr('x2', playersData.x)
            .attr('y2', this.svgHeight + 30);

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
        playersData: { x: number; y: number; time: string; score: number }
    ): void {
        const crosshairConfig = CROSSHAIR_CONFIG;
        groups.lines
            .select('#focus-line-time')
            .attr('x1', crosshairConfig.time.line.x1)
            .attr('y1', playersData.y)
            .attr('x2', this.barWidth + 10)
            .attr('y2', playersData.y);

        groups.labels
            .select('#focus-label-time')
            .attr('x', +playersData.x + crosshairConfig.time.label.x)
            .attr('y', this.svgHeight + 15)
            .text(playersData.time);
    }

    /**
     * Unhighlights the hovered player, hides tooltip and crosshair on mouseout event
     * @param player data held by <circle> element in __data__ property
     */
    onPlayerMouseout(player: PlayerData): void {
        this.unhighlightHoveredPlayer(player);
        this.hideTooltip();
        this.hideCrosshair();
        // if (this.playerClicked === false) {
        //   this.outputSelectedTrainingRunId.emit(); // Unhiglight with fade
        // }
        this.emitSelectedTrainee(player.trainingRunId);
    }

    /**
     *
     * @param player data held by <circle> element in __data__ property
     */
    unhighlightHoveredPlayer(player: PlayerData): void {
        const players = this.d3.selectAll('.player-point-highlighted.p' + player.trainingRunId);
        const isFeedbackLearner = player.trainingRunId === this.traineesTrainingRunId;
        const radius = isFeedbackLearner
            ? PLAYER_POINT_CONFIG.feedbackLearner.pointRadius
            : PLAYER_POINT_CONFIG.pointRadius;
        players.attr('r', radius).classed('player-point-highlighted', false).classed('player-point', true);
    }

    /**
     * Removes player tooltip element from DOM
     */
    hideTooltip(): void {
        this.d3.selectAll('.clustering-overview-player-tooltip').remove();
    }

    /**
     * Sets crosshair's opacity to 0
     */
    hideCrosshair(): void {
        this.d3.select('.focus-lines').style('opacity', 0);
        this.d3.select('.focus-labels').style('opacity', 0);
    }

    /**
     * Emit selection to parent component for highlight in other component
     * @param player data held by <circle> element in __data__ property
     */
    onPlayerClick(event, player: PlayerData) {
        event.stopPropagation();
        this.playerClicked = true;
        this.emitSelectedTrainee(player.trainingRunId);
    }

    /**
     * Adds hover and click event listeners to bars
     */
    addListenersToBars(): void {
        this.svg
            .select('.score-final-bars')
            .on('mouseover', this.onBarMouseover.bind(this))
            .on('mousemove', (event, _) => this.onBarMousemove(event))
            .on('mouseout', this.onBarMouseout.bind(this));

        this.d3.select('#container').on('click', this.onContainerClick.bind(this));
    }

    /**
     * Shows crosshair while hovering over bar
     */
    onBarMouseover(): void {
        this.showCrosshair();
    }

    /**
     * Updates crosshair position and values
     */
    onBarMousemove(event) {
        const d3 = this.d3;
        const crosshairConfig = CROSSHAIR_CONFIG;
        const crosshairLinesGroup = d3.select('.focus-lines');
        const crosshairLabelsGroup = d3.select('.focus-labels');
        const coordinates = this.d3.pointer(event, <ContainerElement>this.d3.select('.score-final-bars').node());
        this.yScale.clamp(true);

        const groups = {
            lines: crosshairLinesGroup,
            labels: crosshairLabelsGroup
        };

        const xScale = this.d3
            .scaleLinear()
            .range([0, this.barWidth])
            .domain([0, this.dataClusteringFinal.finalResults.maxParticipantTime]);

        xScale.clamp(true);

        const playersData = {
            x: coordinates[0],
            y: coordinates[1],
            time: this.hoursMinutesSeconds(xScale.invert(coordinates[0])),
            score: +this.yScale.invert(coordinates[1]).toFixed(0)
        };

        this.updateCrosshair(groups, playersData);
    }

    /**
     * Hides crosshair when cursor leaves the bar
     */
    onBarMouseout(): void {
        this.hideCrosshair();
    }

    /**
     * Cancel player selection by clicking anywhere in the container except players
     */
    onContainerClick(): void {
        this.playerClicked = false;
    }

    /**
     * Set player's circles in Score Level and Score Final components to bigger radius and fill color
     */
    highlightSelectedTrainingRun(): void {
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
                return color.darker(1.5);
            });

        if (this.selectedTrainingRunId === this.traineesTrainingRunId) {
            return;
        }

        player.attr('r', PLAYER_POINT_CONFIG.pointRadius * PLAYER_POINT_CONFIG.pointHighlight * 1.1);
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
        if (this.selectedTrainingRunId !== trainingRunId) {
            this.selectedTrainee.emit(trainingRunId);
        }
    }
}
