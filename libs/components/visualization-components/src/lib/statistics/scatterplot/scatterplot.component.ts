import {
    ChangeDetectionStrategy,
    Component,
    EventEmitter,
    HostListener,
    Input,
    OnChanges,
    OnInit,
    Output,
    SimpleChanges
} from '@angular/core';
import * as d3 from 'd3';
import {
    IStatisticsFilter,
    LevelStatistics,
    ParticipantStatistics,
    TrainingInstanceStatistics
} from '@crczp/visualization-model';
import { AxesCreationService } from '../service/axes-creation-service';
import { TooltipCreationService } from '../service/tooltip-creation-service';
import { SvgConfigurationService } from '../service/svg-configuration-service';
import { LegendCreationService } from '../service/legend-creation-service';
import { MatCardModule } from '@angular/material/card';
import { MatGridListModule } from '@angular/material/grid-list';
import { MatDividerModule } from '@angular/material/divider';
import { MatButtonModule } from '@angular/material/button';
import { MatRadioModule } from '@angular/material/radio';

@Component({
    selector: 'crczp-scatterplot',
    templateUrl: './scatterplot.component.html',
    styleUrls: ['./scatterplot.component.css'],
    imports: [
        MatCardModule,
        MatButtonModule,
        MatGridListModule,
        MatDividerModule,
        MatRadioModule
    ],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class ScatterplotComponent implements OnInit, OnChanges {
    @Input() trainingInstanceStatistics: TrainingInstanceStatistics[];

    @Input() highlightedParticipants: number[];
    @Input() highlightedInstances: number[];
    @Output() highlightInstance: EventEmitter<number[]> = new EventEmitter();
    // should be visualized by the color scheme
    public zScaleValue = 'hint';
    // Marks the sizes of the svgs
    private chartWidth: number;

    // Marks the currently selected attribute that
    private legendWidth: number;
    private svgHeight: number;
    private margin: number;
    // which has not been filtered by trainings instances, yet
    private originalPlayers: ParticipantStatistics[] = [];
    // the most suitable form for visualization
    private players: ParticipantStatistics[] = [];
    // Represents the data got from the Filter component,
    private maxTime: number;
    // Contains data after filtration, transformed to
    private minTime: number;
    private maxScore: number;
    private minScore = 0;
    private minHints = 0;
    private maxHints: number;
    private colorRanges: number[];
    // Marks the scales required for the creation of the chart
    private xScale: d3.ScaleLinear<number, number>;
    private yScale: d3.ScaleLinear<number, number>;
    private zScale: d3.ScaleQuantile<string>;
    private zScaleToIndex: d3.ScaleQuantile<string>;
    // the legend which has been clicked by the user
    private selectedGroup: string = null;
    private componentWidth: string[] = ['100%', '100%'];
    // Marks the currently selected group based on the part of
    private componentHeight: string[] = ['28vw', '50vw'];
    private circleColors: string[] = ['#46d246', '#adebad', '#d9d9d9', '#999999'];
    private tooltipColors: string[] = ['#000000', '#ffffff'];

    constructor(
        private axesCreationService: AxesCreationService,
        private tooltipCreationService: TooltipCreationService,
        private svgConfigurationService: SvgConfigurationService,
        private legendCreationService: LegendCreationService
    ) {
    }

    @HostListener('window:resize') onResizeEvent() {
        this.onResize();
    }

    @HostListener('window:orientationchange') onOrientationChangeEvent() {
        this.onOrientationChange();
    }

    /**
     * While the component is being created:
     * tests the input parameters,
     * sets the size of the component based on the actual configuration
     * and sets the title of the chart
     */
    public ngOnInit(): void {
        this.checkInputs();
        this.setComponentSize();
        this.setTitle();
    }

    /**
     * This method is called by the Filter component to pass
     * the data - after its transformation - to scatterplot
     * Saves the original data and calls 'initializeScatterplotData'
     * to initialize and create this diagram
     * @param players - original data about players, which is shared by
     *                  all the components
     */
    ngOnChanges(changes: SimpleChanges): void {
        if ('trainingInstanceStatistics' in changes && !changes['trainingInstanceStatistics'].isFirstChange()) {
            this.trainingInstanceStatistics.map((statistics) => this.originalPlayers.push(...statistics.participants));
            this.initializeParticipants();
            this.initializeScatterplotData(true);
        }

        if ('highlightedInstances' in changes) {
            if (this.highlightedInstances !== null) {
                if (this.highlightedInstances.length == 1) {
                    this.highlightDataForTraining(this.highlightedInstances[0]);
                }
            } else {
                this.undoHighlightData();
            }
        }

        if ('highlightedParticipants' in changes) {
            if (this.highlightedParticipants !== null && this.highlightedParticipants.length > 0) {
                this.highlightDataForFlag(this.highlightedParticipants);
            } else {
                this.undoHighlightData();
            }
        }
    }

    /**
     * Makes the visualization responsive to the actual screen size
     * If the window is resized, the sizes of the canvases are recalculated
     * and based on that the chart elements are redrawn
     */
    public onResize(): void {
        this.setComponentSize();
        this.createChart();
    }

    /**
     * Makes the visualization responsive to the actual screen size
     * If the window orientation is changed, the same actions are performed
     * than in case of screen size change
     */
    public onOrientationChange(): void {
        this.setComponentSize();
        this.createChart();
    }

    /**
     * If the user clicks a radio button, marks the attribute
     * that should be currently visualized by the color scheme
     * and redraws the scatterplot based on that
     * @param value - marks the currently selected attribute;
     *                the possible values are time, score or hint
     */
    public onRadioChange(value: string): void {
        this.zScaleValue = value;
        this.createChart();
    }

    /**
     * Filters the data - shared by all the diagrams - based on the current
     * settings of the filters and transforms them to the most suitable form
     * to create the scatterplot
     * Saves all the required values and then calls the method 'createChart'
     * @param init - true marks, that this method is called for the first time to
     *               initialize the chart -> in this case the second parameter is empty
     *               (all the trainings are visualized by default)
     * @param filters - if the first parameter is false, marks the trainings for which
     *                  data should be visualized
     */
    public initializeScatterplotData(init: boolean, filters?: IStatisticsFilter[]): void {
        this.players = this.originalPlayers;
        // Ranges for the attributes should be saved only during initialization
        // because the min and max values should be the same for all the possible
        // filter settings
        if (init) {
            this.minTime = this.getMinTime();
            this.maxTime = this.getMaxTime();
            this.maxScore = this.getMaxScore();
            this.maxHints = this.getMaxHints();
        }
        this.createChart();
    }

    /**
     * This method enables interaction between barchart, combined diagram and scatterplot
     * If the user hovers over some element of the other two graphs, all the elements of
     * this component belonging to the same training should be highlighted
     * @param instanceId - marks the id of the actually selected training instance
     */
    public highlightDataForTraining(instanceId: number): void {
        d3.select('#scatterplotPlaceholder').selectAll('circle').style('opacity', 0.1);
        d3.select('#scatterplotPlaceholder').selectAll(`.trainingClass_${instanceId}`).style('opacity', 1);
    }

    /**
     * This method enables interaction between bubble chart and scatterplot
     * If the user hovers over a bubble of bubble chart, all the elements of
     * this component - representing players who have submitted the given flag -
     * should be highlighted
     * @param playerIds - list of player ids who has submitted the given flag,
     *                    and whos circle should be highlighted
     */
    public highlightDataForFlag(playerIds: number[]): void {
        d3.select('#scatterplotPlaceholder').selectAll('circle').style('opacity', 0.1);
        playerIds.forEach((id: number) => {
            // Finds the index of the given player because the circles are
            // marked by this index
            const index: number = this.players.map((player) => player.userRefId).indexOf(id);
            d3.select('#scatterplotPlaceholder')
                .select('#player_' + index)
                .style('opacity', 1);
        });
    }

    /**
     * This method enables interaction between barchart, combined diagram and scatterplot
     * or between scatterplot and bubble chart
     * If no element is selected, resets the opacity of all the circles
     */
    public undoHighlightData(): void {
        d3.select('#scatterplotPlaceholder').selectAll('circle').style('opacity', 1);
    }

    private getMaxTime(): number {
        return Math.max(
            ...this.trainingInstanceStatistics
                .map((instance) =>
                    instance.participants.map((participant) => participant.levels.reduce((a, b) => a + b.duration, 0))
                )
                .reduce((a, b) => (Math.max(...a) > Math.max(...b) ? a : b))
        );
    }

    private getMinTime(): number {
        return Math.min(
            ...this.trainingInstanceStatistics
                .map((instance) =>
                    instance.participants.map((participant) => participant.levels.reduce((a, b) => a + b.duration, 0))
                )
                .reduce((a, b) => (Math.min(...a) < Math.min(...b) ? a : b))
        );
    }

    private getMaxScore(): number {
        return Math.max(
            ...this.trainingInstanceStatistics
                .map((instance) =>
                    instance.participants.map((participant) => participant.levels.reduce((a, b) => a + b.score, 0))
                )
                .reduce((a, b) => (Math.max(...a) > Math.max(...b) ? a : b))
        );
    }

    private getMaxHints(): number {
        return Math.max(
            ...this.trainingInstanceStatistics
                .map((instance) =>
                    instance.participants.map((participant) =>
                        participant.levels.reduce((a, b) => a + b.hintsTaken, 0)
                    )
                )
                .reduce((a, b) => (Math.max(...a) > Math.max(...b) ? a : b))
        );
    }

    private initializeParticipants(): void {
        this.originalPlayers.map((player) => {
            player.totalScore = player.levels.reduce((acc: number, curr: LevelStatistics) => acc + curr.score, 0);
            player.totalDuration = player.levels.reduce((acc: number, curr: LevelStatistics) => acc + curr.duration, 0);
            player.hintsTaken = player.levels.reduce((acc: number, curr: LevelStatistics) => acc + curr.hintsTaken, 0);
        });
    }

    /**
     * Sets the components size based on the current
     * configuration settings and screen size
     */
    private setComponentSize(): void {
        if (window.innerWidth >= 1024) {
            d3.select('#scatterplotPlaceholder')
                .style('width', this.componentWidth[0])
                .style('height', this.componentHeight[0]);
        } else {
            d3.select('#scatterplotPlaceholder')
                .style('width', this.componentWidth[1])
                .style('height', this.componentHeight[1]);
        }
    }

    /**
     * Tests the inputs that are representing the current configuration
     * If less values have been set than the required amount,
     * completes them with predefined values
     */
    private checkInputs(): void {
        switch (this.componentWidth.length) {
            case 0:
                this.componentWidth = ['100%', '100%'];
                break;
            case 1:
                this.componentWidth.push('100%');
                break;
        }
        switch (this.componentHeight.length) {
            case 0:
                this.componentHeight = ['25vw', '50vw'];
                break;
            case 1:
                this.componentHeight.push('50vw');
                break;
        }
        switch (this.circleColors.length) {
            case 0:
                this.circleColors = [
                    'rgba(0, 204, 0, 1)',
                    'rgba(0, 204, 0, 0.4)',
                    'rgba(255, 51, 51, 0.4)',
                    'rgba(255, 51, 51, 1)'
                ];
                break;
            case 1:
                this.circleColors = this.circleColors.concat([
                    'rgba(0, 204, 0, 0.4)',
                    'rgba(255, 51, 51, 0.4)',
                    'rgba(255, 51, 51, 1)'
                ]);
                break;
            case 2:
                this.circleColors = this.circleColors.concat(['rgba(255, 51, 51, 0.4)', 'rgba(255, 51, 51, 1)']);
                break;
            case 3:
                this.circleColors.push('rgba(255, 51, 51, 1)');
                break;
        }
        switch (this.tooltipColors.length) {
            case 0:
                this.tooltipColors = ['#000000', '#ffffff'];
                break;
            case 1:
                this.tooltipColors.push('#ffffff');
                break;
        }
    }

    /**
     * Tests the value of 'chartTitle' input and sets the
     * current title of the component
     * If nothing has been specified, uses a predefined text
     */
    private setTitle(): void {
        d3.select('#scatterplotPlaceholder').select('mat-card-title').text('Time-score-hints Relationship');
    }

    /**
     * Calls all the methods required to create the scatterplot
     * Scales, color scheme, axes and legend are created based on
     * the current settings of the radio button group ('zScaleValue')
     */
    private createChart(): void {
        this.svgConfigurationService.cleanSvgs('#scatterplotPlaceholder');
        this.svgConfigurationService.setMatContentHeight('#scatterplotPlaceholder');
        this.resizeScatterplotSvg();
        this.attachResetGroupSelectionFunctionToSvgs();
        switch (this.zScaleValue) {
            case 'score':
                this.getColorRanges(this.minScore, this.maxScore);
                this.setScales([this.minTime, this.maxTime], [this.minHints, this.maxHints]);
                this.createAxes('Time needed for game completing (hh:mm)', 'Number of hints taken');
                this.createLegend(['Achieved score'], this.transformHintOrScoreRanges().reverse());
                break;
            case 'time':
                this.getColorRanges(this.minTime, this.maxTime);
                this.setScales([this.minScore, this.maxScore], [this.minHints, this.maxHints]);
                this.createAxes('Achieved score', 'Number of hints taken');
                this.createLegend(['Time needed for', 'game completing', '(hh:mm)'], this.transformTimeRanges());
                break;
            case 'hint':
                this.getColorRanges(this.minHints, this.maxHints);
                this.setScales([this.minTime, this.maxTime], [this.minScore, this.maxScore]);
                this.createAxes('Time needed for game completing (hh:mm)', 'Achieved score');
                this.createLegend(['Number of hints', 'taken'], this.transformHintOrScoreRanges());
                break;
        }
        this.createPoints();
    }

    /**
     * If the user clicks some element of the scatterplot
     * (except the circles and the legend), group selection
     * should be reset -> circles of all colors should be shown
     */
    private attachResetGroupSelectionFunctionToSvgs(): void {
        d3.selectAll('svg').on('click', (event) => {
            const svgElements: string[] = ['scatterplotSvg', 'scatterplotLegendSvg'];
            // If the id of the clicked element is among 'svgElements' it means,
            // that some canvas has been selected (not a circle or the legend)
            // and circles of all colors/groups should be shown
            if (svgElements.includes(event.target.id)) {
                this.resetGroupSelection();
            }
        });
    }

    /**
     * Calls the service 'resizeSvg' to resize the individual svgs
     * of this component based on the current screen size
     * Saves the current sizes into the given variables
     */
    private resizeScatterplotSvg(): void {
        const size: { widths: number[]; height: number } = this.svgConfigurationService.resizeSvg([
            '#scatterplotChartPlaceholder',
            '#scatterplotLegendPlaceholder'
        ]);
        this.chartWidth = size.widths[0];
        this.legendWidth = size.widths[1];
        this.svgHeight = 0.92 * size.height;
    }

    /**
     * Sets the scales required to create the chart
     * As the user can choose from three different mappings of attributes,
     * the domains for the scales have to be explicitly defined
     * @param xDomain - specifies the domain of values that should be mapped
     *                  to 'xScale' (min and max of score, time or hints)
     * @param yDomain - specifies the domain of values that should be mapped
     *                  to 'yScale' (min and max of score, time or hints)
     */
    private setScales(xDomain: [number, number], yDomain: [number, number]): void {
        this.margin = Math.floor(0.1 * this.svgHeight);

        this.xScale = d3
            .scaleLinear()
            .domain(xDomain)
            .nice()
            .rangeRound([1.88 * this.margin, this.chartWidth - this.margin]);

        this.yScale = d3
            .scaleLinear()
            .domain(yDomain)
            .nice()
            .rangeRound([this.svgHeight - this.margin, this.margin]);

        // The top of the legend represents the weakest student's peformance
        // In case, the color scheme represents the number of hints or the game time
        // this value is the highest from the range
        // In case of scores, the weakest performance is represented by the lowest point
        // => the increasing order (from best to worst) of the ranges should be reversed
        const actualColors: string[] = JSON.parse(JSON.stringify(this.circleColors));
        if (this.zScaleValue === 'score') {
            actualColors.reverse();
        }
        this.zScale = d3.scaleQuantile<string>().range(actualColors).domain(this.colorRanges);
        // Students are classified into groups based on the color of their circles
        // 'zScalesToIndex' maps the students into these groups represented
        // the by indices 1, 2, 3, 4
        this.zScaleToIndex = d3.scaleQuantile<string>().range(['1', '2', '3', '4']).domain(this.colorRanges);
    }

    /**
     * Defines both of the axes, formats them on a proper way and
     * calls the service 'callAxes' to attach them to this component
     * Calls the services 'createXAxesTitle' and 'createYAxesTitle' to
     * attach title to the axes
     * @param xTitle - specifies the title of x axis as it depends on
     *                 the current settings of attribute mapping
     * @param yTitle - specifies the title of y axis as it depends on
     *                 the current settings of attribute mapping
     */
    private createAxes(xTitle: string, yTitle: string): void {
        let xAxis: d3.Axis<number | { valueOf(): number }>;
        // If x axis represents the game time, data (in timestamp format)
        // should be transformed into format hh:mm by calling 'transformTime'
        if (this.zScaleValue !== 'time') {
            xAxis = d3
                .axisBottom(this.xScale)
                .ticks(5)
                .tickFormat((d) => this.transformTime(Number(d)));
        } else {
            xAxis = d3.axisBottom(this.xScale).ticks(5).tickFormat(d3.format('.0f'));
        }
        const yAxis: d3.Axis<number | { valueOf(): number }> = d3
            .axisLeft(this.yScale)
            .ticks(5)
            .tickFormat(d3.format('.0f'));

        this.axesCreationService.callAxes(
            '#scatterplotSvg',
            '#scatterplotSvg',
            xAxis,
            yAxis,
            '0, ' + (this.svgHeight - this.margin),
            1.8 * this.margin + ', 0',
            this.axesCreationService.getAxisFontSize('#scatterplotPlaceholder')
        );
        this.axesCreationService.createXAxesTitle(
            '#scatterplotSvg',
            this.chartWidth - this.margin,
            this.svgHeight,
            xTitle,
            this.axesCreationService.getAxisTitleFontSize('#scatterplotPlaceholder')
        );
        this.axesCreationService.createYAxesTitle(
            '#scatterplotSvg',
            -this.margin,
            this.margin / 2,
            yTitle,
            this.axesCreationService.getAxisTitleFontSize('#scatterplotPlaceholder')
        );
    }

    /**
     * Divides the range represented by min and max values into
     * four parts (represented by four colors) -> the individual
     * parts do not need to have the same length, but the top of
     * the last range must be equal to parameter 'max'
     * @param min - specifies the lowest possible value
     * @param max - specifies the highest value that can be reached
     */
    private getColorRanges(min: number, max: number): void {
        const shift: number = Math.round((max - min) / 4);
        this.colorRanges = [min, min + shift, Math.round((max - min) / 2), max - shift, max];
    }

    /**
     * Based on the current attribute mapping (value of 'zScaleValue')
     * specifies the required parameters and calls the method 'addPoint'
     */
    private createPoints(): void {
        switch (this.zScaleValue) {
            case 'score':
                this.players.forEach((player: ParticipantStatistics, i: number) => {
                    this.addPoint(
                        player.totalDuration,
                        player.hintsTaken,
                        player.totalScore,
                        i,
                        player.instanceId,
                        player.userRefId
                    );
                });
                break;
            case 'time':
                this.players.forEach((player: ParticipantStatistics, i: number) =>
                    this.addPoint(
                        player.totalScore,
                        player.hintsTaken,
                        player.totalDuration,
                        i,
                        player.instanceId,
                        player.userRefId
                    )
                );
                break;
            case 'hint':
                this.players.forEach((player: ParticipantStatistics, i: number) =>
                    this.addPoint(
                        player.totalDuration,
                        player.totalScore,
                        player.hintsTaken,
                        i,
                        player.instanceId,
                        player.userRefId
                    )
                );
                break;
        }
    }

    /**
     * Adds a new point (representing a player) to scatterplot component
     * Each player is marked in three different ways:
     * * class 'legendGroup_' specifies the color group into which the player belongs
     * -> it is used in case a part of the legend is clicked (see 'handleLegendClick')
     * * class 'trainingClass_' marks the training on which the player participated
     * -> it is used for interaction between the components
     * * ID '"player_" + index' enables to specify the individual users -> required e.g.
     * in case of interaction with bubblechart (info about the flags the player submitted)
     * @param xValue - specifies the value that should be mapped to x axis
     * @param yValue - specifies the value that should be mapped to y axis
     * @param zValue - specifies the value that should be mapped to the color scheme
     * @param index - index of the user from range [0, players.length] used to
     *                specify the individual players
     * @param trainingClass - specifies the training on which the user participated
     * @param userRefId - specifies id of a user
     */
    private addPoint(
        xValue: number,
        yValue: number,
        zValue: number,
        index: number,
        trainingClass: number,
        userRefId: number
    ): void {
        d3.select('#scatterplotSvg')
            .append('circle')
            .attr('class', () => {
                return 'legendGroup_' + this.zScaleToIndex(zValue) + ' trainingClass_' + `${trainingClass}`;
            })
            .attr('id', () => 'player_' + index)
            .attr('userRefId', () => userRefId)
            .attr('cx', () => this.xScale(xValue))
            .attr('cy', () => this.yScale(yValue))
            .attr('r', '1%')
            .style('stroke', 'rgba(0, 0, 0, 0.4)')
            .style('stroke-width', 1)
            .style('fill', () => this.zScale(zValue))
            .style('cursor', 'pointer')
            .on('mouseover', () => this.handleMouseOver(<MouseEvent>event))
            .on('mouseout', () => this.handleMouseOut());
    }

    /**
     * Process mouseover event over a point
     * First, gets the ID, color group and training to which the circle belongs
     * Tests if any color group is selected -> if no, highlights the given
     * circle and attaches a tooltip; if yes, the circle should be
     * highlighted and the tooltip should be attached only in case
     * the point belogns to the selected group
     * Finally, calls the method 'highlightDataForTraining' of barchart and
     * combined chart to interact with them
     * @param event - mouseover event
     */
    private handleMouseOver(event: MouseEvent): void {
        const circleId: string = (<HTMLElement>event.target).id;
        const classes: string[] = (<any>(<HTMLElement>event.target).className).baseVal.split(' ').sort();
        const groupClass: string = classes[0].split('_').pop();
        const instanceId = Number(classes[1].split('_').pop());

        if (this.selectedGroup === null || this.selectedGroup === groupClass) {
            d3.select('#scatterplotSvg').selectAll('circle').style('opacity', 0.3);
            d3.select('#scatterplotSvg')
                .select('#' + circleId)
                .attr('r', '1.3%')
                .style('opacity', 1);
            this.createTooltip(
                Number(circleId.split('_')[1]),
                Number(
                    d3
                        .select('#scatterplotSvg')
                        .select('#' + circleId)
                        .attr('userRefId')
                )
            );
        }
        this.highlightInstance.emit([instanceId]);
    }

    /**
     * Processes the event when the user clicks a part of the legend
     * First, gets the ID of the part that has been clicked
     * If the same part was clicked again, than the actually selected
     * one, selection should be reset and all the points should be shown
     * Otherwise, the actually selected group should be highlighted
     * @param event - click event
     */
    private handleLegendClick(event: MouseEvent): void {
        const groupId: string = (<HTMLElement>event.target).id;
        if (this.selectedGroup === groupId) {
            this.resetGroupSelection();
        } else {
            this.selectedGroup = groupId;
            this.highlightGroupSelection(groupId);
        }
    }

    /**
     * Highlights the selected (color) group of points
     * by hiding all the points belonging to other groups
     * @param groupId - defines the currently selected group
     */
    private highlightGroupSelection(groupId: string): void {
        d3.select('#scatterplotSvg').selectAll('circle').style('display', 'none');

        d3.select('#scatterplotSvg')
            .selectAll('.legendGroup_' + groupId)
            .attr('r', '1%')
            .style('display', 'block');
    }

    /**
     * Resets the currently selected group of circles
     * Shows all the available circles
     */
    private resetGroupSelection(): void {
        this.selectedGroup = null;
        d3.select('#scatterplotSvg').selectAll('circle').style('display', 'block');
    }

    /**
     * Processes mouseout event
     * Resets the original style for all the circles (none of them
     * should be highlighted) and removes all the tooltips
     * Calls the funtions 'undoHighlightData' and 'undoHighlightDataForTraining'
     * of the components barchart and combined diagram to interact with them
     */
    private handleMouseOut(): void {
        d3.select('#scatterplotSvg').selectAll('circle').attr('r', '1%').style('opacity', 1);
        d3.select('#scatterplotSvg').selectAll('.tooltip').remove();

        this.highlightInstance.emit(null);
    }

    /**
     * Attaches a tooltip to the component
     * Gets/calculates all the parameters required to create a tooltip
     * (e.g. coordinates, width, height, text, font size...) based on
     * the actual settings of attribute mapping
     * Calls the appropriate services to attach the rectangle and the text
     * @param index - index of selected player
     * @param playerId - represents the ID of the currently selected player,
     *                   tooltip should provide information about him/her
     */
    private createTooltip(index: number, playerId: number): void {
        const player: ParticipantStatistics = this.players[index];
        const size: { width: number; height: number } = this.tooltipCreationService.getTooltipSize(this.chartWidth);
        let x: number;
        let y: number;
        switch (this.zScaleValue) {
            case 'score':
                x = this.xScale(this.players[index].totalDuration);
                y = this.yScale(this.players[index].hintsTaken);
                break;
            case 'time':
                x = this.xScale(this.players[index].totalScore);
                y = this.yScale(this.players[index].hintsTaken);
                break;
            case 'hint':
                x = this.xScale(this.players[index].totalDuration);
                y = this.yScale(this.players[index].totalScore);
                break;
        }
        if (x > this.chartWidth / 2) {
            x = x - size.width - 10;
        } else {
            x = x + 10;
        }
        if (y > this.svgHeight / 2) {
            y = y - size.height - 10;
        } else {
            y = y + 10;
        }

        this.tooltipCreationService.createTooltipRect(
            '#scatterplotSvg',
            'tooltip',
            x,
            y,
            size.width,
            size.height,
            this.tooltipColors[0]
        );
        this.tooltipCreationService.addTooltipText(
            '#scatterplotSvg',
            'tooltip',
            x + size.width / 2,
            y + 0.2 * size.height,
            this.tooltipCreationService.getTooltipFontSize('#scatterplotPlaceholder'),
            [
                `${playerId}`,
                'Total score: ' + player.totalScore,
                'Total time: ' + this.transformTime(player.totalDuration),
                'Hints taken: ' + player.hintsTaken
            ],
            [0, 0.3 * size.height, 0.2 * size.height, 0.2 * size.height],
            this.tooltipColors[1]
        );
    }

    /**
     * Calculates/gets all the parameters required to create the
     * text for the legend, than calls 'createLegendBars' to
     * attach the legend bars to the component, too
     * @param text - contains the title for the legend; each element
     *               of the array represent one row of it
     * @param ranges - contains the texts that represent the individual
     *                 levels of the color scale
     */
    private createLegend(text: string[], ranges: string[]): void {
        const fontSize: number = this.legendCreationService.getLegendFontSize('#scatterplotPlaceholder');
        const y = (1.5 * fontSize * (3 - text.length)) / 2;
        const xShift: number[] = [0];
        const yShift: number[] = [0];
        // Titles for different settings of attribute mapping contain
        // different number of rows. The number of elements of
        // 'xShift' and 'yShift' should be the same as the number of rows,
        // so it should be set individually for every settings
        text.forEach(() => {
            xShift.push(0);
            yShift.push(1.5 * fontSize);
        });
        // Attaches the title
        this.legendCreationService.addLegendText(
            '#scatterplotLegendSvg',
            'scatterplotLegendText',
            this.legendWidth / 2,
            this.margin + y,
            fontSize,
            '#000000',
            text,
            xShift,
            yShift
        );
        const shift: number = Math.round(0.3 * (this.svgHeight - 2 * this.margin - 6 * fontSize));
        // Attaches the text for individual scale levels
        this.legendCreationService.addLegendText(
            '#scatterplotLegendSvg',
            'scatterplotLegendText',
            0.55 * this.legendWidth,
            this.margin + 5.2 * fontSize,
            fontSize,
            '#000000',
            ranges,
            [0, 0, 0, 0, 0],
            [0, shift, shift, shift, shift],
            'start'
        );
        this.createLegendBars(this.margin + 5 * fontSize, shift);
    }

    /**
     * Attaches the bars to the legend
     * @param y - defines the y coordinate of the top of the legend
     * @param yShift - specifies the height of the bars / the shift
     *                 between their y coordinates
     */
    private createLegendBars(y: number, yShift: number): void {
        const actualRanges: number[] = JSON.parse(JSON.stringify(this.colorRanges));
        let indexShift = 0;
        // If 'score' should be actually represented by the color scheme, the order
        // of the ranges should be reversed (as the lowest value is displayed
        // at the top of the legend). The index of colors onto which the scale level
        // is mapped should be shifted by 1
        if (this.zScaleValue !== 'score') {
            actualRanges.reverse();
            indexShift = 1;
        }
        for (let i = 0; i < this.colorRanges.length - 1; i++) {
            d3.select('#scatterplotLegendSvg')
                .append('rect')
                .attr('id', this.zScaleToIndex(actualRanges[i + indexShift]))
                .attr('x', 0.45 * this.legendWidth)
                .attr('y', y + i * yShift)
                .attr('width', this.legendWidth / 10)
                .attr('height', yShift)
                .style('fill', this.zScale(actualRanges[i + indexShift]))
                .style('stroke', '#ffffff')
                .style('stroke-width', 2)
                .style('cursor', 'pointer')
                .on('click', () => this.handleLegendClick(<MouseEvent>event));
        }
    }

    /**
     * If the color scheme currently represents the scores
     * or the number of hints, transfroms the ranges
     * into the required format ('- value')
     */
    private transformHintOrScoreRanges(): string[] {
        const rangesInStringFormat: string[] = [];
        this.colorRanges.forEach((data: number) => {
            rangesInStringFormat.push('- ' + data);
        });
        return rangesInStringFormat.reverse();
    }

    /**
     * If the color scheme currently represents the game time,
     * transforms the ranges into the required format ('- hh:mm')
     */
    private transformTimeRanges(): string[] {
        const rangesInStringFormat: string[] = [];
        this.colorRanges.forEach((data: number) => {
            rangesInStringFormat.push('- ' + this.transformTime(data));
        });
        return rangesInStringFormat.reverse();
    }

    /**
     * Transforms game time into required format
     * Game time is represented using timestamps (in milliseconds),
     * but it should be displayed as string using the format hh:mm
     * @param timeInMs - defines the time in milliseconds which should be
     *                   transformed into string format
     */
    private transformTime(timeInMs: number): string {
        const timeInMin: number = timeInMs / 60000;
        let hours = String(Math.floor(timeInMin / 60.0));
        if (hours.length === 1) {
            hours = '0' + hours;
        }
        let minutes = String(Math.round(timeInMin % 60));
        if (minutes.length === 1) {
            minutes = '0' + minutes;
        }
        return hours + ':' + minutes;
    }
}
