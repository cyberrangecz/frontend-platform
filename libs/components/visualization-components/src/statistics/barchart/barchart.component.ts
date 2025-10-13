import {
    ChangeDetectionStrategy,
    Component,
    EventEmitter,
    HostListener,
    inject,
    Input,
    OnChanges,
    OnInit,
    Output,
    SimpleChanges,
} from '@angular/core';
import * as d3 from 'd3';
import {
    IStatisticsFilter,
    LevelAnswersStatistics,
    LevelStatistics,
    ParticipantStatistics,
    TrainingInstanceStatistics,
} from '@crczp/visualization-model';
import { AxesCreationService } from '../service/axes-creation-service';
import { TooltipCreationService } from '../service/tooltip-creation-service';
import { SvgConfigurationService } from '../service/svg-configuration-service';
import { LegendCreationService } from '../service/legend-creation-service';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { MatGridListModule } from '@angular/material/grid-list';
import { MatRadioModule } from '@angular/material/radio';
import { MatCheckboxModule } from '@angular/material/checkbox';

@Component({
    selector: 'crczp-barchart',
    templateUrl: './barchart.component.html',
    styleUrls: ['./barchart.component.css'],
    imports: [
        MatCardModule,
        MatDividerModule,
        MatGridListModule,
        MatRadioModule,
        MatCheckboxModule,
    ],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BarchartComponent implements OnInit, OnChanges {
    @Input() trainingInstanceStatistics: TrainingInstanceStatistics[];
    @Input() highlightedInstances: number[];
    @Output() highlightInstance: EventEmitter<number[]> = new EventEmitter();
    @Output() selectedLevelId: EventEmitter<number> = new EventEmitter();
    // Both types of flags are shown using a stacked chart by default
    public onlyWrongFlags = false;
    public chartType = 'stacked';
    private axesCreationService = inject(AxesCreationService);
    private tooltipCreationService = inject(TooltipCreationService);
    private svgConfigurationService = inject(SvgConfigurationService);
    private legendCreationService = inject(LegendCreationService);

    // Marks the actual types for the barchart
    // Marks the sizes of the svgs
    private yAxisSvgWidth: number;
    private chartSvgWidth: number;
    private legendSvgWidth: number;
    private svgHeight: number;
    private margin: number;
    // which has not been filtered by trainings instances, yet
    private originalLevels: LevelStatistics[];
    private originalPlayers: ParticipantStatistics[];
    // Represents the data got from the Filter component,
    // the most suitable form for visualization
    private levels: LevelStatistics[];
    private players: ParticipantStatistics[];
    // Contains data after filtration, transformed to
    // Contains data about levels in format required by 'd3.stack()'
    private stackedData: any;
    // Contains two keys (for correct and wrong flags) for each training instance
    private keys: any;
    // Marks the scales required for the creation of the chart
    private xScale: d3.ScaleBand<string>;
    // The bars are stacked based on predefined keys
    private yScale: d3.ScaleLinear<number, number>;
    private zScale: d3.ScaleOrdinal<number, string>;
    // Defines the level clicked by the user (or null)
    private selectedLevel: number = null;
    private selectedInstanceId: number = null;
    // It is used to pass the current filter types to the bubblechart
    private filters: IStatisticsFilter[];
    private componentWidth: string[] = ['100%', '100%'];
    // Contains the actual types of the filters
    private componentHeight: string[] = ['28vw', '50vw'];
    private barColors: string[] = [
        '#47ACB1',
        '#87B6A1',
        '#F9AA7B',
        '#676766',
        '#FFE8AF',
    ];
    private barTextColor = '#00000';
    private participantsLineColor = '#595959';
    private tooltipColors: string[] = ['#000000', '#ffffff'];

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

    public ngOnChanges(changes: SimpleChanges): void {
        if (
            'trainingInstanceStatistics' in changes &&
            !changes['trainingInstanceStatistics'].isFirstChange()
        ) {
            this.setOriginalData();
            this.createChart();
        }

        if ('highlightedInstances' in changes) {
            if (this.highlightedInstances !== null) {
                if (this.highlightedInstances.length > 1) {
                    this.highlightDataForFlag(this.highlightedInstances);
                } else {
                    this.highlightDataForTraining(this.highlightedInstances[0]);
                }
            } else {
                this.undoHighlightData();
            }
        }
    }

    /**
     * Makes the visualization responsive to the actual screen size
     * If the window is resized, the sizes of the canvases are recalculated
     * and based on that the chart elements are redrawn
     * Resets the scrollbars which should not be visible by default
     */
    public onResize(): void {
        this.setComponentSize();
        this.createChart();
        d3.select('#barchartPlaceholder')
            .select('#legendPlaceholder')
            .classed('verticallyScrollable', false);
    }

    /**
     * Makes the visualization responsive to the actual screen size
     * If the window orientation is changed, the same actions are performed
     * than in case of screen size change
     */
    public onOrientationChange(): void {
        this.setComponentSize();
        this.createChart();
        d3.select('#barchartPlaceholder')
            .select('#legendPlaceholder')
            .classed('verticallyScrollable', false);
    }

    /**
     * Processes the situation when the user has clicked a radio button,
     * which defines switching between stacked and grouped barchart modes
     * Saves the current type and recreates the chart
     * @param newType - marks the new barchart mode (stacked/grouped)
     */
    public onRadioChange(newType: string): void {
        this.chartType = newType;
        this.createChart();
    }

    /**
     * Processes the situation when the user has clicked the checkbox,
     * which indicates toggling between showing all the flags and
     * displaying only the wrong ones
     * Inverts the value of 'onlyWrongFlags' and recreates the chart
     * based on the current types
     */
    public onCheckboxChange(): void {
        this.onlyWrongFlags = !this.onlyWrongFlags;
        this.createChart();
    }

    /**
     * This method is called by the Filter component to pass
     * the data - after its transformation - to barchart
     * Saves the original data and calls 'initializeBarchartData'
     * to initialize and create this diagram
     */
    public setOriginalData(): void {
        this.originalPlayers = [];
        this.originalLevels = [];
        this.levels = [];
        this.trainingInstanceStatistics.map((statistics) =>
            this.originalPlayers.push(...statistics.participants),
        );
        this.trainingInstanceStatistics.map((statistics) =>
            statistics.participants.map((participant) =>
                this.levels.push(...participant.levels),
            ),
        );
        this.originalLevels.filter(
            (level, index, self) =>
                index === self.findIndex((t) => t.id === level.id),
        );
        this.initializeBarchartData(true);
    }

    /**
     * Filters the data - shared by all the diagrams - based on the current
     * types of the filters and transforms them to the most suitable form
     * to create this component
     * Saves the information about the current types of filters, which is
     * later passed to bubblechart component
     * Saves all the required values and then calls the method 'createChart'
     * @param init - true marks, that this method is called for the first time to
     *               initialize the chart -> in that case the second parameter is empty
     *               (all the trainings are visualized by default)
     * @param filters - if the first parameter is false, marks the trainings for which
     *                  data should be visualized
     */
    public initializeBarchartData(
        init: boolean,
        filters?: IStatisticsFilter[],
    ): void {
        this.players = [];
        this.keys = [];
        this.filters = filters;
        this.trainingInstanceStatistics.map((statistics) =>
            this.players.push(...statistics.participants),
        );
        this.trainingInstanceStatistics.forEach((statistics) =>
            statistics.participants.forEach((participant) =>
                this.levels.concat(participant.levels),
            ),
        );
        this.levels = this.levels.filter(
            (level, index, self) =>
                index === self.findIndex((t) => t.id === level.id),
        );
        this.stackedData = this.createStackedObject();
        // Gets the key attributes from 'stackedData' which are required to create the
        // stacked bars and sorts them -> keys represent the individual layers of the bars
        this.trainingInstanceStatistics.forEach((statistics) =>
            this.keys.push(`number_of_wrong_flags_${statistics.instanceId}`),
        );
        this.trainingInstanceStatistics.forEach((statistics) =>
            this.keys.push(`number_of_correct_flags_${statistics.instanceId}`),
        );
        this.keys = this.keys.sort();
        this.createChart();
    }

    /**
     * This method enables interaction between barchart, combined diagram and scatterplot
     * If the user hovers over some element of the other two graphs, all the elements of
     * this component belonging to the same training should be highlighted
     * @param selectedTrainingId - marks the id of the actually selected training instance
     */
    public highlightDataForTraining(selectedTrainingId: number): void {
        // Blurs the elements that belong to other trainings
        d3.select('#barchartPlaceholder')
            .select('#chartSvg')
            .selectAll('rect')
            .style('opacity', 0.1);
        // Resets the style of tooltips as they also consist of rectangles
        d3.selectAll('.barchartTooltip').style('opacity', 0.8);
        d3.selectAll('text').style('opacity', 1);
        // Calls the appropriate method to highlight the elements (the two
        // different chart types have different structures, so
        // the required elements should be selected different ways)
        if (this.chartType === 'stacked') {
            this.highlightDataForStackedChart(selectedTrainingId, 'rect');
        } else {
            this.highlightDataForGroupedChart('g', selectedTrainingId);
        }
    }

    /**
     * This method enables interaction between bubblechart, scatterplot and barchart
     * If the user hovers over a bubble of bubble chart, all the elements of
     * this component - representing trainings on which the given flag has been
     * submitted - should be highlighted
     * @param trainingInstanceIds - if the selected bubble represents a wrong flag, contains
     *                       the IDs all the trainings on which the flag has been
     *                       submitted; otherwise it is undefined
     */
    public highlightDataForFlag(trainingInstanceIds?: number[]): void {
        // Blurs the elements that belong to other trainings
        d3.select('#barchartPlaceholder')
            .select('#chartSvg')
            .selectAll('rect')
            .style('opacity', 0.1);
        // Resets the style of tooltips as they also consist of rectangles
        d3.selectAll('.barchartTooltip').style('opacity', 0.8);
        d3.selectAll('text').style('opacity', 1);
        // While the variables representing wrong flags contain information
        // about the trainings on which they were submitted, no information
        // exists for correct flags -> it is required to test all the trainings,
        // whether any correct flag has been submitted -> if yes, add its ID to
        // the variable 'trainingIds' and it should be later highlighted
        if (trainingInstanceIds === undefined) {
            trainingInstanceIds = this.trainingInstanceStatistics
                .filter(
                    (statistics) =>
                        statistics.levelsAnswers.filter(
                            (levelAnswer) =>
                                levelAnswer.correctAnswerSubmitted > 0,
                        ).length > 0,
                )
                .map((statistics) => statistics.instanceId);
        }
        // Calls the appropriate method to highlight the elements (the two
        // different chart types have different structures, so
        // the required elements should be selected different ways)
        trainingInstanceIds.forEach((id: number) => {
            if (this.chartType === 'stacked') {
                this.highlightDataForStackedChart(
                    id,
                    `[id='${this.selectedLevel}']`,
                );
            } else {
                this.highlightDataForGroupedChart(
                    `[id='${this.selectedLevel}']`,
                    id,
                );
            }
        });
    }

    /**
     * This method enables interaction between all the diagrams
     * If no element is selected, resets the opacity of all the rectangles
     */
    public undoHighlightData(): void {
        d3.select('#barchartPlaceholder')
            .select('#chartSvg')
            .selectAll('rect')
            .style('opacity', 1);
        d3.select('#barchartPlaceholder')
            .selectAll('.wrong')
            .style('opacity', 0.4);
    }

    /**
     * Highlights the selected data of stacked barchart
     * @param id - defines the training instance for which data
     *             should be highlighted
     * @param rectSelector - defines which rectangles/levels should be highlighted
     *                       (all of them - in case of highlightDataForTraining;
     *                       just for one level - in case of highlightDataForFlag)
     */
    private highlightDataForStackedChart(
        id: number,
        rectSelector: string,
    ): void {
        d3.selectAll(`.number_of_correct_flags_${id}`)
            .selectAll(rectSelector)
            .style('opacity', 1);
        d3.selectAll(`.number_of_wrong_flags_${id}`)
            .selectAll(rectSelector)
            .style('opacity', 1);
    }

    /**
     * Highlights the selected data of grouped barchart
     * @param groupSelector - marks the group/level that should be highlighted
     *                        (all of them - in case of highlightDataForTraining;
     *                        just for one level - in case of highlightDataForFlag)
     * @param id - defines the training instance for which data should be highlighted
     */
    private highlightDataForGroupedChart(
        groupSelector: string,
        id: number,
    ): void {
        d3.selectAll(groupSelector)
            .selectAll(`.number_of_correct_flags_${id}`)
            .style('opacity', 1);
        d3.selectAll(groupSelector)
            .selectAll(`.number_of_wrong_flags_${id}`)
            .style('opacity', 0.4);
    }

    /**
     * Sets the components size based on the current
     * configuration types and screen size
     */
    private setComponentSize(): void {
        if (window.innerWidth >= 1024) {
            d3.select('#barchartPlaceholder')
                .style('width', this.componentWidth[0])
                .style('height', this.componentHeight[0]);
        } else {
            d3.select('#barchartPlaceholder')
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
                this.componentWidth = ['50%', '100%'];
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

        if (this.barTextColor === undefined) {
            this.barTextColor = '#000000';
        }
        if (this.participantsLineColor === undefined) {
            this.participantsLineColor = '#ff3333';
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
        d3.select('#barchartPlaceholder')
            .select('mat-card-title')
            .text('Wrong Answers Overview');
    }

    /**
     * Calls all the methods required to create the barchart
     */
    private createChart(): void {
        this.svgConfigurationService.cleanSvgs('#barchartPlaceholder');
        this.svgConfigurationService.setMatContentHeight(
            '#barchartPlaceholder',
        );
        this.resizeBarchartSvg();
        // Attaches a function to all the svg canvases that hides
        // 'detailed info', if the user clicks outside the bars
        this.attachHideDetailedInfoFunctionToSvgs();
        // Generates random colors for the bars, if the amount
        // of colors defined by the user is not enough
        this.createRandomColors(this.keys.length / 2 - this.barColors.length);
        this.setScales();
        this.createAxes();
        this.createLegend();
        // Creates the chart based on the currently set diagram type
        if (this.chartType === 'stacked') {
            this.createStackedBars();
            this.visualizeNumberOfParticipantsForStackedChart();
        } else {
            this.createGroupedBars();
        }
        // Tests whether a level has been selected previously
        // If yes, shows detailed info for it and creates the
        // corresponding bubblechart
        if (this.selectedLevel !== null) {
            this.showDetailedInfo(this.selectedLevel);
            this.createBubblechart(this.selectedLevel);
        }
    }

    /**
     * Calls the service 'resizeSvg' to resize the individual svgs
     * of this component based on the current screen size
     * Saves the current sizes into the given variables
     */
    private resizeBarchartSvg(): void {
        const size: { widths: number[]; height: number } =
            this.svgConfigurationService.resizeSvg([
                '#yAxisPlaceholder',
                '#chartPlaceholder',
                '#legendPlaceholder',
            ]);
        this.yAxisSvgWidth = size.widths[0];
        this.chartSvgWidth = size.widths[1];
        this.legendSvgWidth = size.widths[2];
        this.svgHeight = size.height;
    }

    /**
     * Hides the detailed information about the selected level
     * if the user clicks somewhere outside the bars
     */
    private attachHideDetailedInfoFunctionToSvgs(): void {
        d3.select('#barchartPlaceholder')
            .selectAll('svg')
            .on('click', (event) => {
                const svgElements = ['yAxisSvg', 'chartSvg', 'legendSvg'];
                // If the id of the clicked element is among 'svgElements' it means,
                // that some canvas has been selected (not a bar),
                // so 'detailed info' should be hidden
                if (svgElements.includes(event.target.id)) {
                    this.selectedLevel = null;
                    this.createBubblechart(this.selectedLevel);
                    d3.select('#chartSvg')
                        .selectAll('.detailedInfoElement')
                        .remove();
                }
            });
    }

    /**
     * Sets the scales required to create the chart
     * X scale represents the individual levels of the trainings
     * Y scale defines the height of the bars
     * Z scale defines the color of individual layers - the same color is used
     * to visualize the number of correct and wrong flags for the given training
     * instance only their opacity is different
     * If the chart contains so many bars that their width would be too small
     * than a scrollbar is attached to the canvas
     */
    private setScales(): void {
        this.margin = Math.floor(0.1 * this.svgHeight);
        // Sets different x and y scales for the stacked and grouped barchart
        if (this.chartType === 'stacked') {
            this.xScale = d3
                .scaleBand()
                .domain(
                    this.trainingInstanceStatistics[0].levelsAnswers.map(
                        (d: LevelAnswersStatistics) => `${d.id}`,
                    ),
                )
                .range([0, this.chartSvgWidth])
                .padding(0.3);
            // Since the layers are on the top of each other, the maximum for the domain is
            // defined as the maximum of sums of all the flags submitted at the given levels
            this.yScale = d3
                .scaleLinear()
                .domain([
                    0,
                    Math.max(
                        ...this.trainingInstanceStatistics[0].levelsAnswers.map(
                            (level) => this.maxNumberOfFlagsForLevel(level.id),
                        ),
                    ),
                ])
                .nice()
                .rangeRound([this.svgHeight - this.margin, this.margin]);
        } else {
            this.xScale = d3
                .scaleBand()
                .domain(
                    this.trainingInstanceStatistics[0].levelsAnswers.map(
                        (d: LevelAnswersStatistics) => `${d.id}`,
                    ),
                )
                .rangeRound([0, this.chartSvgWidth])
                .paddingInner(0.1);
            // Since the layers are next to each other, the maximum of the domain
            // is defined by the maximum number of flags submitted during a level
            this.yScale = d3
                .scaleLinear()
                .domain([
                    0,
                    Math.max(
                        ...this.trainingInstanceStatistics.map((statistics) =>
                            this.maxNumberOfFlagsForSingleLevel(
                                statistics.levelsAnswers,
                            ),
                        ),
                    ),
                ])
                .nice()
                .rangeRound([this.svgHeight - this.margin, this.margin]);
        }
        this.zScale = d3
            .scaleOrdinal<number, string>()
            .range(this.barColors)
            .domain([0, this.keys.length / 2]);

        // If the width of the bars is smaller than a predefined value than the width of the canvas is
        // enlarged, a scrollbar is added and the bar width is recalculated based on the new canvas width
        if (this.xScale.bandwidth() < 50) {
            this.chartSvgWidth =
                this.trainingInstanceStatistics[0].levelsAnswers.length * 80;
            d3.select('#chartSvg')
                .attr('width', this.chartSvgWidth)
                .attr(
                    'viewbox',
                    '0 0 ' + this.chartSvgWidth + ' ' + this.svgHeight,
                );
            if (this.chartType === 'stacked') {
                this.xScale = d3
                    .scaleBand()
                    .domain(
                        this.trainingInstanceStatistics[0].levelsAnswers.map(
                            (d: LevelAnswersStatistics) => `${d.id}`,
                        ),
                    )
                    .range([0, this.chartSvgWidth])
                    .padding(0.3);
            } else {
                this.xScale = d3
                    .scaleBand()
                    .domain(
                        this.trainingInstanceStatistics[0].levelsAnswers.map(
                            (d: LevelAnswersStatistics) => `${d.id}`,
                        ),
                    )
                    .rangeRound([0, this.chartSvgWidth])
                    .paddingInner(0.1);
            }
        }
    }

    private maxNumberOfFlagsForSingleLevel(
        level: LevelAnswersStatistics[],
    ): number {
        let flagsMax = -1;
        level.forEach(
            (level) =>
                (flagsMax = Math.max(
                    flagsMax,
                    level.correctAnswerSubmitted,
                    level.wrongAnswers.length,
                )),
        );
        return flagsMax;
    }

    /**
     * Generates random colors to represent the layers of the bars,
     * in case the user has not specified enough of them, and saves
     * them to the variable 'barColors'
     * @param numberOfColors - defines the number of colors, that
     *                         should be generated
     */
    private createRandomColors(numberOfColors: number): void {
        for (let i = 0; i < numberOfColors; i++) {
            const r: number = Math.floor(Math.random() * Math.floor(255));
            const g: number = Math.floor(Math.random() * Math.floor(255));
            const b: number = Math.floor(Math.random() * Math.floor(255));
            this.barColors.push('rgb(' + r + ',' + g + ',' + b + ')');
        }
    }

    /**
     * Defines both axes, formats them on a proper way and calls
     * the service 'callAxes' to attach them to this component
     * Calls the service 'createYAxesTitle' to attach title to the axis
     * Attaches a mouseover event to x axis to show the title of levels
     */
    private createAxes(): void {
        let xAxes: d3.Axis<string>;
        let yAxes: d3.Axis<
            | number
            | {
                  valueOf(): number;
              }
        >;
        if (this.chartType === 'stacked') {
            xAxes = d3.axisBottom(
                d3
                    .scaleBand()
                    .domain(
                        this.trainingInstanceStatistics[0].levelsAnswers.map(
                            (d: LevelAnswersStatistics, i: number) =>
                                `Level ${i + 1}`,
                        ),
                    )
                    .range([0, this.chartSvgWidth])
                    .padding(0.3),
            );
            yAxes = d3.axisLeft(this.yScale).ticks(5);
        } else {
            xAxes = d3.axisBottom(
                d3
                    .scaleBand()
                    .domain(
                        this.trainingInstanceStatistics[0].levelsAnswers.map(
                            (d: LevelAnswersStatistics, i: number) =>
                                `Level ${i + 1}`,
                        ),
                    )
                    .rangeRound([0, this.chartSvgWidth])
                    .paddingInner(0.1),
            );
            yAxes = d3.axisLeft(this.yScale).ticks(5);
        }

        this.axesCreationService.callAxes(
            '#chartSvg',
            '#yAxisSvg',
            xAxes,
            yAxes,
            '0, ' + (this.svgHeight - this.margin),
            0.98 * this.yAxisSvgWidth + ', 0',
            this.axesCreationService.getAxisFontSize('#barchartPlaceholder'),
        );

        this.axesCreationService.createYAxesTitle(
            '#yAxisSvg',
            -this.margin,
            this.margin / 2,
            'Number of submitted answers',
            this.axesCreationService.getAxisTitleFontSize(
                '#barchartPlaceholder',
            ),
        );

        // Attaches a mousover and mouseout event
        // to the elements of x axis
        d3.select('#barchartPlaceholder')
            .select('#xAxis')
            .selectAll('.tick')
            .attr('pointer-event', 'all')
            .style('cursor', 'pointer')
            .on('mouseover', (d: any, i: string) => {
                const index = Number(i.match(/\d+/)[0]) - 1; // - 1 because levels are counted from 0
                this.appendTootlipToXAxis(this.levels[index]);
            })
            .on('mouseout', () => this.handleMouseOut());
    }

    /**
     * Appends tooltips to the ticks of x axis, which enables to show
     * the title of the individual levels of the training
     * Sets the required parameters and calls 'createTooltip'
     * @param level - defines the level to which the tooltip should be added
     */
    private appendTootlipToXAxis(level: LevelStatistics): void {
        const fontSize: number = this.tooltipCreationService.getTooltipFontSize(
            '#barchartPlaceholder',
        );
        const width: number = Math.round(
            0.6 * Math.max(level.title.length, 12) * fontSize,
        );
        const height: number = Math.round(3 * fontSize);
        let x: number = this.xScale(String(level.id));
        x = x > this.chartSvgWidth / 2 ? x - width - 10 : x + 10;
        const y: number = this.svgHeight - 2 * height;
        this.createTooltip(
            x,
            y,
            width,
            height,
            y + fontSize,
            ['Level title: ', level.title],
            [0, 1.5 * fontSize],
        );
    }

    /**
     * Creates the stacked bars based on preprocessed data 'stackedData'
     * Each group/layer of the bars is marked by two different classes:
     * 'correct'/'wrong' defines the type of flags, which is required to
     * specify the opacity of the rectangles;
     * The other class marks the key to which the given layer belongs;
     * it is required e.g. to specify the trainings ID to which the data belongs
     * Each rectangle - which represents the number of flags submitted on a given
     * level during a specific training - is marked by an ID containing the levels ID
     * -> g element specifies the training, while rect marks the level
     */
    private createStackedBars(): void {
        // Defines the currently used keys based on the actual
        // types of checkbox -> marks whether both types of
        // flags should be shown, or only the wrong ones
        let actualKeys: string[];
        if (this.onlyWrongFlags) {
            actualKeys = this.keys.filter(function (key) {
                return key.includes('wrong');
            });
        } else {
            actualKeys = this.keys;
        }
        actualKeys.sort();
        d3.select('#chartSvg')
            .append('g')
            .selectAll('g')
            .data(d3.stack().keys(actualKeys)(this.stackedData))
            .enter()
            .append('g')
            .attr('class', (d: any) => {
                if (d.key.split('_').includes('correct')) {
                    return 'correct ' + d.key;
                } else {
                    return 'wrong ' + d.key;
                }
            })
            // The same color is used to define the correct and wrong flags of
            // the same training, only their opacity differs
            .attr('fill', (d: any) =>
                this.zScale(this.keys.indexOf(d.key) % (this.keys.length / 2)),
            )
            .selectAll('rect')
            .data((d: any) => d)
            .enter()
            .append('rect')
            .attr('id', (d: any) => d.data.level_id)
            .attr('class', 'barchartRect')
            .attr('x', (d: any) => this.xScale(String(d.data.level_id)))
            .attr('y', (d: any) => this.yScale(d[1]))
            .attr('height', (d: any) => this.yScale(d[0]) - this.yScale(d[1]))
            .attr('width', this.xScale.bandwidth())
            .style('cursor', 'pointer')
            .on('mouseover', () => this.handleMouseOver(<MouseEvent>event))
            .on('mouseout', () => this.handleMouseOut())
            .on('click', (d, events) => {
                this.selectedInstanceId = (events as any).data.instanceId;
                return this.handleClick(<MouseEvent>event); //Number(events.key.split('_').pop())
            });
        // The opacity of rectangles representing the wrong flags is set to a smaller value
        d3.selectAll('.wrong').style('opacity', 0.4);
    }

    private createStackedObject() {
        const filteredStackedData: any = [];
        this.levels.forEach((level: LevelStatistics) => {
            const stackedObject = { level_id: level.id };
            this.trainingInstanceStatistics.forEach(
                (trainingInstanceStatistic: TrainingInstanceStatistics) => {
                    stackedObject[
                        'number_of_correct_flags_' +
                            trainingInstanceStatistic.instanceId
                    ] = trainingInstanceStatistic.levelsAnswers
                        .filter((answer) => answer.id == level.id)
                        .reduce(
                            (
                                sum: number,
                                levelAnswer: LevelAnswersStatistics,
                            ) => sum + levelAnswer.correctAnswerSubmitted,
                            0,
                        );
                    stackedObject[
                        'number_of_wrong_flags_' +
                            trainingInstanceStatistic.instanceId
                    ] = trainingInstanceStatistic.levelsAnswers
                        .filter((answer) => answer.id == level.id)
                        .reduce(
                            (
                                sum: number,
                                levelAnswer: LevelAnswersStatistics,
                            ) => sum + levelAnswer.wrongAnswers.length,
                            0,
                        );
                    stackedObject['instanceId'] =
                        trainingInstanceStatistic.instanceId;
                },
            );
            filteredStackedData.push(stackedObject);
        });
        return filteredStackedData;
    }

    /**
     * Creates the grouped bars based on preprocessed data 'stackedData'
     * Each group of the bars is marked by an ID representing a specific level
     * Each rectangle is marked by two different classes:
     * 'correct'/'wrong' defines the type of flags, which is required to
     * specify the opacity of the rectangles;
     * The other class marks the key to which the given rectangle belongs
     * -> g element specifies the level, while rect marks the training
     */
    private createGroupedBars(): void {
        // Defines the currently used keys based on the actual
        // types of checkbox -> marks whether both types of
        // flags should be shown, or only the wrong ones
        let actualKeys: string[];
        if (this.onlyWrongFlags) {
            actualKeys = this.keys.filter(function (key) {
                return key.includes('wrong');
            });
        } else {
            actualKeys = this.keys;
        }
        actualKeys.sort();

        // Marks the position/coordinate of the individual bar
        // inside a specific group of bars
        const x1 = d3
            .scaleBand()
            .domain(actualKeys)
            .rangeRound([0, this.xScale.bandwidth()]);

        d3.select('#chartSvg')
            .append('g')
            .selectAll('g')
            .data(this.levels)
            .enter()
            .append('g')
            .attr('id', (d: LevelStatistics) => `${d.id}`)
            .attr(
                'transform',
                (d: LevelStatistics) =>
                    `translate(${this.xScale(`${d.id}`)},0)`,
            )
            .selectAll('rect')
            .data((d: LevelStatistics) => {
                const data = this.stackedData.find(
                    (stackedData) => stackedData.level_id == d.id,
                );
                return actualKeys.map((key: string) => ({
                    key,
                    value: data[key],
                }));
            })
            .enter()
            .append('rect')
            .attr('class', (d: any) => {
                if (d.key.split('_').includes('correct')) {
                    return 'correct ' + d.key;
                } else {
                    return 'wrong ' + d.key;
                }
            })
            .attr('x', (d: any) => x1(d.key))
            .attr('y', (d: any) => this.yScale(d.value))
            .attr('width', x1.bandwidth())
            .attr('height', (d: any) => this.yScale(0) - this.yScale(d.value))
            .attr('fill', (d: any) =>
                this.zScale(this.keys.indexOf(d.key) % (this.keys.length / 2)),
            )
            .style('cursor', 'pointer')
            .on('mouseover', (d: any, events) => {
                this.visualizeNumberOfParticipantsForGroupedChart(
                    Number(events.key.split('_').pop()),
                    <MouseEvent>event,
                );
                this.handleMouseOver(<MouseEvent>event);
            })
            .on('mouseout', () => this.handleMouseOut())
            .on('click', (d, events) => {
                this.selectedInstanceId = Number(events.key.split('_').pop());
                return this.handleClick(<MouseEvent>event);
            });
        d3.selectAll('.wrong').style('opacity', 0.4);
    }

    /**
     * Creates a horizontal line which represents the number of participants
     * In case of a stacked chart it is a static element
     * Attaches mouseover event to it, which shows a tooltip
     */
    private visualizeNumberOfParticipantsForStackedChart(): void {
        // Calculates sum of the number of players who
        // have participated on the individual training instances

        // let numberOfParticipants = this.originalPlayers.length
        // this.players.forEach(
        //   (participant: Participant[]) =>
        //     (numberOfParticipants = numberOfParticipants + element.length)
        // );
        this.createLineForNumberOfParticipants(
            'stackedChartLine',
            this.originalPlayers.length,
        );
        d3.select('.stackedChartLine')
            .on('mouseover', () =>
                this.createTooltipForNumberOfParticipants(
                    <MouseEvent>event,
                    this.originalPlayers.length,
                ),
            )
            .on('mouseout', () => this.handleMouseOut());
    }

    /**
     * Creates a horizontal line which represents the number of participants
     * In case of a grouped chart it is a dynamic element, which is created
     * when the user hovers over a bar
     * Represents the number of participants for the selected training
     * The tooltip with the exact number is shown all the time
     * @param trainingId - marks the selected training
     * @param event - marks the mouseover event
     */
    private visualizeNumberOfParticipantsForGroupedChart(
        trainingId: number,
        event: MouseEvent,
    ): void {
        // let index = 0;
        // while (this.players[index].instanceId !== trainingId) {
        //   index++;
        // }
        const participants: number = this.players.length;
        this.createLineForNumberOfParticipants(
            'groupedChartLine',
            participants,
        );
        this.createTooltipForNumberOfParticipants(event, participants);
    }

    /**
     * Attaches the horizontal line, which represents
     * the number of participants, to the component
     * @param className - marks the chart type (stacked/grouped)
     * @param numberOfParticipants - indicates the number of players
     */
    private createLineForNumberOfParticipants(
        className: string,
        numberOfParticipants: number,
    ): void {
        d3.select('#chartSvg')
            .append('line')
            .attr('class', className)
            .attr('id', 'participantLine_' + numberOfParticipants)
            .attr('x1', 0)
            .attr('x2', this.chartSvgWidth)
            .attr('y1', this.yScale(numberOfParticipants))
            .attr('y2', this.yScale(numberOfParticipants))
            .style('stroke', this.participantsLineColor)
            .style('stroke-width', 2)
            .style('cursor', 'pointer');
    }

    /**
     * Calculates/gets all the paramteres required to create the
     * tooltip and calls the corresponding services
     * (This tooltip differs from the ones attached to the rectangles
     * in the way the parameters are calculated)
     * @param event - marks the mouseover event required to
     *                get the current position of the mouse
     * @param participants - defines the number of players
     */
    private createTooltipForNumberOfParticipants(
        event: MouseEvent,
        participants: number,
    ): void {
        const fontSize: number = this.tooltipCreationService.getTooltipFontSize(
            '#barchartPlaceholder',
        );
        const width: number = Math.round(14 * fontSize);
        const height: number = Math.round(1.5 * fontSize);
        const coordinates: {
            x: number;
            y: number;
        } = this.svgConfigurationService.convertScreenCoordToSvgCoord(
            'chartSvg',
            event.clientX,
            event.clientY,
        );
        let x: number;
        let y: number;
        if (this.chartType === 'stacked') {
            x =
                coordinates.x > this.chartSvgWidth / 2
                    ? coordinates.x - width - 10
                    : coordinates.x + 10;
            y =
                coordinates.y > this.svgHeight / 2
                    ? coordinates.y - height - 10
                    : coordinates.y + 10;
        } else {
            x =
                coordinates.x > this.chartSvgWidth / 2
                    ? 10
                    : this.chartSvgWidth - width - 10;
            y = this.yScale(participants) - height - 10;
        }

        this.createTooltip(
            x,
            y,
            width,
            height,
            y + fontSize,
            ['number of participants: ' + participants],
            [0],
        );
    }

    /**
     * Handles the events when the user clicks some of the bars
     * If the bar is clicked for the first time, it shows detailed information
     * about the number of correct/wrong flags
     * If the bar is clicked for the second time, detailed information is hidden
     * @param event - defines the corresponding click event
     */
    private handleClick(event: MouseEvent): void {
        // If a bar is selected, function of highlighting correct/wrong flags for the given training
        // instance is disabled -> if something has been already highlighted, removes this effect
        this.handleMouseOut();
        // Marks, which level has been highlighted
        const selectedLevel: number =
            this.chartType === 'stacked'
                ? Number((<HTMLElement>event.srcElement).id)
                : Number((<HTMLElement>event.srcElement).parentElement.id);
        switch (this.selectedLevel) {
            // If no level has been selected, marks the clicked level as selected and shows detailed info
            case null:
                this.selectedLevel = selectedLevel;
                this.showDetailedInfo(selectedLevel);
                break;
            // If the already selected level has been clicked again,
            // hides detailed info and marks that no level is actually selected
            case selectedLevel:
                this.selectedLevel = null;
                d3.select('#chartSvg')
                    .selectAll('.detailedInfoElement')
                    .remove();
                break;
            // If an other level has been clicked, marks it as selected,
            // hides detailed info about the previously selected level and
            // shows detailed info about the actually selected level
            default:
                this.selectedLevel = selectedLevel;
                d3.select('#chartSvg')
                    .selectAll('.detailedInfoElement')
                    .remove();
                this.showDetailedInfo(selectedLevel);
                break;
        }
        // Creates a bubblechart for the selected level
        this.createBubblechart(this.selectedLevel);
    }

    /**
     * Shows the number of correct and wrong flag submitted on the selected level
     * and the number of wrong flags submitted on the other levels in %
     * First, gets the number of flags submitted on the selected level, than compares
     * the number of wrong flags with the other levels
     * @param selectedLevel - marks the ID of the selected level
     */
    private showDetailedInfo(selectedLevel: number): void {
        let numberOfWrongAnswersAtSelectedLevel = 0;
        const statisticsAtOtherLevels: {
            id: number;
            wrongAnswers: number;
            correctAnswerSubmitted: number;
            maxNumberOfFlags: number;
        }[] = [];

        const levelAnswers: {
            id: number;
            wrongAnswers: number;
            correctAnswerSubmitted: number;
        }[] = [];
        const levelAnswer: LevelAnswersStatistics =
            this.trainingInstanceStatistics[0].levelsAnswers[0];
        levelAnswers.push({
            id: levelAnswer.id,
            wrongAnswers: 0,
            correctAnswerSubmitted: 0,
        });

        this.trainingInstanceStatistics
            .map((statistics) => statistics.levelsAnswers)
            .forEach((answers) => {
                answers.forEach((answer) => {
                    const level = levelAnswers.find(
                        (levelAnswer) => levelAnswer.id === answer.id,
                    );
                    if (level !== undefined) {
                        level.wrongAnswers += answer.wrongAnswers.length;
                        level.correctAnswerSubmitted +=
                            answer.correctAnswerSubmitted;
                    } else {
                        levelAnswers.push({
                            id: answer.id,
                            wrongAnswers: answer.wrongAnswers.length,
                            correctAnswerSubmitted:
                                answer.correctAnswerSubmitted,
                        });
                    }
                });
            });
        levelAnswers.forEach((level) => {
            // If the actually processed level is the selected one, adds text elements to the given bar
            // about the exact number of correct/wrong flags and attaches a dashed line
            // Calls the proper functions based on the actual types of the barchart
            if (level.id == selectedLevel) {
                numberOfWrongAnswersAtSelectedLevel =
                    this.trainingInstanceStatistics
                        .map((statistics) =>
                            statistics.levelsAnswers
                                .filter(
                                    (levelAnswer) =>
                                        levelAnswer.id === selectedLevel,
                                )
                                .reduce(
                                    (acc, cur) => acc + cur.wrongAnswers.length,
                                    0,
                                ),
                        )
                        .reduce((acc, cur) => acc + cur, 0);
                const wrongAnswerSubmittedBy: number =
                    this.trainingInstanceStatistics
                        .find(
                            (statistics) =>
                                statistics.instanceId ==
                                this.selectedInstanceId,
                        )
                        .participants.map((participant) =>
                            participant.levels
                                .map((level) => level)
                                .find(
                                    (level) =>
                                        level.id == Number(selectedLevel),
                                ),
                        )
                        .reduce(
                            (acc, levels) =>
                                acc +
                                (levels.wrongAnswerSubmitted.length > 0
                                    ? 1
                                    : 0),
                            0,
                        );
                if (this.chartType === 'stacked') {
                    this.createTextForSelectedLevel(
                        selectedLevel,
                        level.correctAnswerSubmitted,
                        level.wrongAnswers,
                    );
                    if (this.onlyWrongFlags) {
                        this.attachDashedLine(wrongAnswerSubmittedBy);
                    } else {
                        this.attachDashedLine(
                            wrongAnswerSubmittedBy +
                                level.correctAnswerSubmitted,
                        );
                    }
                } else {
                    const maxNumberOfFlags: number =
                        this.maxNumberOfFlagsForLevel(level.id);
                    this.createTextForSelectedLevel(
                        selectedLevel,
                        level.correctAnswerSubmitted,
                        numberOfWrongAnswersAtSelectedLevel,
                        maxNumberOfFlags,
                    );
                    this.attachDashedLine(
                        Math.max(
                            level.correctAnswerSubmitted,
                            wrongAnswerSubmittedBy,
                        ),
                    );
                }
            } else {
                // If the actually processed level is not the selected one, saves it to the variable
                // 'flagsAtOtherLevels'; it will be processed later by the function 'createTextForOtherLevels'
                statisticsAtOtherLevels.push({
                    id: level.id,
                    wrongAnswers: level.wrongAnswers,
                    correctAnswerSubmitted: level.correctAnswerSubmitted,
                    maxNumberOfFlags: this.maxNumberOfFlagsForLevel(level.id),
                });
            }
        });
        // Since the text for the other levels contains a comparison to the selected one,
        // these levels can be processed only after all the levels have been checked -> to
        // ensure data about the selected level is already available
        this.createTextForOtherLevels(
            statisticsAtOtherLevels,
            numberOfWrongAnswersAtSelectedLevel,
        );
        // Disables pointer events for these texts
        d3.selectAll('.detailedInfoElement')
            .style('cursor', 'pointer')
            .attr('pointer-events', 'none');
    }

    /**
     * Calculates the sum of correct/wrong flags submitted for the selected level
     * during all the tracked training instances and the number of participants
     * who have submitted any wrong flag, too
     * @param level - specifies the level for which the number of flags is calculated
     */
    // private calculateNumberOfCorrectAndWrongFlagsForLevel(
    //   level:
    // ): ILevelStatistics {
    //   let correctFlags = 0;
    //   let wrongFlags = 0;
    //   let submittedBy = 0;
    //   level.trainings.forEach((training: ITraining) => {
    //     correctFlags = correctFlags + training.numberOfCorrectFlags;
    //     wrongFlags = wrongFlags + training.numberOfWrongFlags;
    //     submittedBy = submittedBy + training.wrongFlagSubmittedBy;
    //   });
    //   return {
    //     numberOfCorrectFlags: correctFlags,
    //     numberOfWrongFlags: wrongFlags,
    //     submittedBy: submittedBy,
    //   };
    // }

    /**
     * Gets the maximum amount of flags which have been submitted
     * on a single training for the selected level
     * It is required to create the dashed horizontal line
     * for the grouped chart
     * @param levelId - marks the selected level
     */
    private maxNumberOfFlagsForLevel(levelId: number): number {
        let maxNumberOfFlags = -1;
        const levelAnswers: LevelAnswersStatistics[] =
            this.trainingInstanceStatistics.map((statistics) =>
                statistics.levelsAnswers.find(
                    (levelAnswer) => levelAnswer.id === levelId,
                ),
            );
        levelAnswers.forEach((levelAnswer: LevelAnswersStatistics) => {
            if (this.onlyWrongFlags) {
                maxNumberOfFlags = Math.max(
                    maxNumberOfFlags,
                    levelAnswer.wrongAnswers.length,
                );
            } else {
                maxNumberOfFlags = Math.max(
                    maxNumberOfFlags,
                    levelAnswer.correctAnswerSubmitted +
                        levelAnswer.wrongAnswers.length,
                );
            }
        });
        return maxNumberOfFlags;
    }

    /**
     * Attaches a dashed line which marks the sum of flags submitted
     * on the selected level (for stacked bar chart) or the maximum
     * number of submitted flags (for group bar chart) on the given level
     * @param numberOfFlags - specifies the number of flags which should
     *                        be represented by the dashed line
     */
    private attachDashedLine(numberOfFlags: number): void {
        const y: number = this.yScale(numberOfFlags);
        d3.select('#chartSvg')
            .append('line')
            .attr('class', 'detailedInfoElement')
            .attr('x1', 0)
            .attr('x2', this.chartSvgWidth)
            .attr('y1', y)
            .attr('y2', y)
            .style('stroke', 'black')
            .style('stroke-width', 1)
            .style('stroke-dasharray', '10, 10');
    }

    /**
     * Creates the text that should be attached to the selected
     * level based on the actual barchart types
     * Calls the proper functions to attach the upper and lower text
     * to the bar
     * @param selectedLevel - marks the id of the selected level
     * @param numberOfFlags - defines the number of correct and wrong
     *                        flag submitted on the given level
     * @param maxNumberOfFlags - in case of the grouped bar chart specifies
     *                           the maximum amount of flags submitted on the
     *                           given level (represented by the highest bar)
     */
    private createTextForSelectedLevel(
        selectedLevel: number,
        numberOfCorrectFlags,
        numberOfWrongFlags,
        maxNumberOfFlags?: number,
    ): void {
        // Lower text represent the correct flags
        // In case only the wrong flags should be
        // shown, this text is not attached
        if (!this.onlyWrongFlags) {
            this.appendLowerTextToBar(selectedLevel, numberOfCorrectFlags);
        }
        // Marks the number of flags visualized by
        // the highest bar of the selected level
        // It indicates the height of the highest bar
        // and the y coordinate of the upper text
        let numberOfFlagsToVis: number;
        if (this.chartType === 'grouped') {
            numberOfFlagsToVis = maxNumberOfFlags;
        } else {
            if (this.onlyWrongFlags) {
                numberOfFlagsToVis = numberOfWrongFlags;
            } else {
                numberOfFlagsToVis = numberOfCorrectFlags + numberOfWrongFlags;
            }
        }
        this.appendUpperTextToBar(selectedLevel, numberOfFlagsToVis, [
            numberOfWrongFlags + ' wrong',
            ' answers',
        ]);
    }

    /**
     * Compares the number of wrong flags submitted at the selected level to the
     * number of wrong flags at other levels - it is represented in percentage
     * Creates the 'detailed info' text for other levels and attaches it to the bars
     * @param otherLevels - array containing the number of correct/wrong flags and
     *                      the number of submission for the other levels
     * @param numberOfWrongFlagsAtSelectedLevel - number of wrong flags for the selected level
     */
    private createTextForOtherLevels(
        otherLevels: any,
        numberOfWrongFlagsAtSelectedLevel: number,
    ): void {
        otherLevels.forEach((level) => {
            // Compares each level to the selected one
            let percentage = 0;
            if (numberOfWrongFlagsAtSelectedLevel > 0) {
                percentage =
                    100 -
                    Math.round(
                        (level.wrongAnswers /
                            numberOfWrongFlagsAtSelectedLevel) *
                            100,
                    );
            }
            // Creates the text that should be attached to the bar
            let text;
            if (
                level.wrongAnswers / numberOfWrongFlagsAtSelectedLevel ===
                    Number.POSITIVE_INFINITY ||
                level.wrongAnswers / numberOfWrongFlagsAtSelectedLevel ===
                    Number.NEGATIVE_INFINITY
            ) {
                text = `Increase from Zero by ${level.wrongAnswers}`;
            } else if (percentage < 0) {
                text = Math.abs(percentage) + '% more';
            } else {
                text = percentage + '% less';
            }
            // Marks the number of flags visualized by
            // the highest bar of the given level
            // It indicates the height of the highest bar
            // and the y coordinate of the upper text
            let numberOfFlags: number;
            if (this.chartType === 'grouped') {
                numberOfFlags = level.maxNumberOfFlags;
            } else {
                if (this.onlyWrongFlags) {
                    numberOfFlags = level.correctAnswerSubmitted;
                } else {
                    numberOfFlags =
                        level.correctAnswerSubmitted + level.wrongAnswers;
                }
            }
            this.appendUpperTextToBar(level.id, numberOfFlags, [
                text,
                'wrong answers',
            ]);
        });
    }

    /**
     * Calls the appropriate service to attach lower text to the bar
     * which represents the exact number of correct flags submitted
     * at the selected level
     * @param levelId - marks the ID of the given level, which also
     *                  represents the x coordinate of the bar
     * @param numberOfCorrectFlags - defines the amount of correct flags,
     *                               this number should be shown for the bar
     */
    private appendLowerTextToBar(
        levelId: number,
        numberOfCorrectFlags: number,
    ): void {
        const fontSize: number = this.legendCreationService.getLegendFontSize(
            '#barchartPlaceholder',
        );
        this.legendCreationService.addLegendText(
            '#chartSvg',
            'detailedInfoElement',
            this.xScale(`${levelId}`) + this.xScale.bandwidth() / 2,
            this.svgHeight - this.margin - 1.5 * fontSize,
            fontSize,
            this.barTextColor,
            [numberOfCorrectFlags + ' correct', ' answers'],
            [0, 0],
            [0, 1.2 * fontSize],
        );
    }

    /**
     * Tests if the bar is high enough, so that the text fits properly
     * Then attaches the upper text containing the exact number of wrong
     * flags or the comparison to the selected level in percentage
     * @param levelId - marks the ID of the given level, which also
     *                  represents the x coordinate of the bar
     * @param numberOfFlags - marks the max number of flags represented
     *                        by one bar, it also defines the
     *                        y coordinate of the text
     * @param text - defines the text, that should be attached to the bar
     */
    private appendUpperTextToBar(
        levelId: number,
        numberOfFlags: number,
        text: string[],
    ): void {
        const fontSize: number = this.legendCreationService.getLegendFontSize(
            '#barchartPlaceholder',
        );
        let y: number;
        let xShift: number[];
        let yShift: number[];
        // If the bar is not high enough, the text will be shown above it
        if (this.yScale(0) - this.yScale(numberOfFlags) < 4.5 * fontSize) {
            y = this.yScale(numberOfFlags) - 3.5 * fontSize;
            xShift = [0, 0, 0];
            yShift = [0, fontSize, 1.2 * fontSize];
            text.push('|');
        } else {
            y = this.yScale(numberOfFlags) + fontSize;
            xShift = [0, 0];
            yShift = [0, fontSize];
        }

        this.legendCreationService.addLegendText(
            '#chartSvg',
            'detailedInfoElement',
            this.xScale(`${levelId}`) + this.xScale.bandwidth() / 2,
            y,
            fontSize,
            this.barTextColor,
            text,
            xShift,
            yShift,
        );
    }

    /**
     * Processes mouse over event over the bars or the legends
     * Interacts with the other diagrams
     * Shows a tooltip that contains more information about the given level
     * (this funtion is enabled even if some bar is selected)
     * If no level is actually selected, highlights the correct/wrong flags
     * for the selected training instance (selected by mousing over its
     * legend element or some of its bar layers)
     * @param event - specifies the mouseover event
     */
    private handleMouseOver(event: MouseEvent): void {
        // Blocks participant line for mouseover event
        d3.select('.stackedChartLine').attr('pointer-events', 'none');
        // Finds the actually selected training based on the class attribute
        const selectedTrainingId: number =
            this.getTrainingToBeHighlighted(event);

        // Highlights the corresponding data in combined chart and scatterplot
        this.highlightInstance.emit([selectedTrainingId]);

        // Gets/calculates all the parameters required to create the tooltip (e.g. text,
        // coordinates, width, height...) and calls the proper function to create it
        const infoToBeVisualized: {
            showCorrectFlags: boolean;
            trainingId: string;
            numberOfFlags: {
                numberOfCorrectFlags: number;
                numberOfWrongFlags: number;
                submittedBy: number;
            };
        } = this.getInformationVisualizedByTooltip(event);
        const tooltipText: string[] = this.getTooltipText(
            infoToBeVisualized.showCorrectFlags,
            Number(infoToBeVisualized.trainingId),
            infoToBeVisualized.numberOfFlags,
        );
        const size: { width: number; height: number } =
            this.tooltipCreationService.getTooltipSize(this.chartSvgWidth);
        const coordinates: {
            x: number;
            y: number;
        } = this.svgConfigurationService.convertScreenCoordToSvgCoord(
            'chartSvg',
            event.clientX,
            event.clientY,
        );
        const x =
            coordinates.x > this.chartSvgWidth / 2
                ? coordinates.x - size.width - 10
                : coordinates.x + 10;
        const y =
            coordinates.y > this.svgHeight / 2
                ? coordinates.y - size.height - 10
                : coordinates.y + 10;
        this.createTooltip(
            x,
            y,
            size.width,
            size.height,
            y + 0.2 * size.height,
            tooltipText,
            [0, 0.3 * size.height, 0.2 * size.height, 0.2 * size.height],
        );

        // Higlights correct and wrong flags for the given training instance (only if no level is selected)
        if (this.selectedLevel === null) {
            this.highlightDataForTraining(selectedTrainingId);
        } else {
        }
    }

    /**
     * Gets all the required information about the selected element -
     * the level and training to which it belongs
     * Then based on this information find the number of correct and
     * wrong flags for the given training-level pair
     * @param event - marks the mouseover event
     */
    private getInformationVisualizedByTooltip(event: MouseEvent): {
        showCorrectFlags: boolean;
        trainingId: string;
        numberOfFlags: {
            numberOfCorrectFlags: number;
            numberOfWrongFlags: number;
            submittedBy: number;
        };
    } {
        let selectedLevel: string;
        let classNameKeyWords: string[];
        let selectedTraining: string;
        let showCorrectFlags: boolean;
        // Gets the level and training to which the selected rectangles belongs
        // Specifies whether the rectangle represents correct flags or not
        if (this.chartType === 'stacked') {
            selectedLevel = (<HTMLElement>event.srcElement).id;
            classNameKeyWords = (<any>(
                (<HTMLElement>event.srcElement).parentElement.className
            )).baseVal.split('_');
            selectedTraining = classNameKeyWords.sort()[0];
            showCorrectFlags = classNameKeyWords.includes('correct');
        } else {
            selectedLevel = (<HTMLElement>event.srcElement).parentElement.id;
            classNameKeyWords = (<any>(
                (<HTMLElement>event.srcElement).className
            )).baseVal.split('_');
            selectedTraining = classNameKeyWords.sort()[0];
            showCorrectFlags = classNameKeyWords.includes('correct');
        }

        const selectedTrainingStatistics: TrainingInstanceStatistics =
            this.trainingInstanceStatistics.find(
                (statistics) =>
                    statistics.instanceId === Number(selectedTraining),
            );
        const selectedTrainingLevelStatistics: LevelAnswersStatistics =
            selectedTrainingStatistics.levelsAnswers.find(
                (level) => level.id === Number(selectedLevel),
            );
        const wrongAnswerSubmittedBy: number =
            selectedTrainingStatistics.participants
                .map((participant) =>
                    participant.levels
                        .map((level) => level)
                        .find((level) => level.id == Number(selectedLevel)),
                )
                .reduce(
                    (acc, levels) =>
                        acc + (levels.wrongAnswerSubmitted.length > 0 ? 1 : 0),
                    0,
                );

        return {
            showCorrectFlags: showCorrectFlags,
            trainingId: selectedTraining,
            numberOfFlags: {
                numberOfCorrectFlags:
                    selectedTrainingLevelStatistics.correctAnswerSubmitted,
                numberOfWrongFlags:
                    selectedTrainingLevelStatistics.wrongAnswers.length,
                submittedBy: wrongAnswerSubmittedBy,
            },
        };
    }

    /**
     * Creates a tooltip text that represents the information
     * got from the input parameters
     * @param showCorrectFlags - specifies whether the text contains info
     *                           about the correct flags, or the wrong ones
     * @param trainingId - marks the selected trainings ID
     * @param numberOfFlags - defines the number of correct and wrong flags
     *                        for the selected training-level pair
     */
    private getTooltipText(
        showCorrectFlags: boolean,
        trainingId: number,
        numberOfFlags: {
            numberOfCorrectFlags: number;
            numberOfWrongFlags: number;
            submittedBy: number;
        },
    ): string[] {
        if (showCorrectFlags) {
            return [
                `Training ${trainingId}:`,
                numberOfFlags.numberOfCorrectFlags + ' participants',
                'submitted',
                'the correct answer',
            ];
        }
        return [
            `Training ${trainingId}:`,
            numberOfFlags.numberOfWrongFlags + ' wrong answers',
            'submitted by',
            numberOfFlags.submittedBy + ' participants',
        ];
    }

    /**
     * Calls the appropriate services to create
     * the tooltip based on the input parameters
     * @param x - marks the x coordinate of the tooltip rectangle
     * @param y - marks the y coordinate of the tooltip rectangle
     * @param width - marks the width of the tooltip rectangle
     * @param height - marks the height of the tooltip rectangle
     * @param textY - marks the y coordinate of the text
     * @param text - contains the text that should be visualized
     * @param yShift - defines the shift between the y coordinates
     *                 of the text lines
     */
    private createTooltip(
        x: number,
        y: number,
        width: number,
        height: number,
        textY: number,
        text: string[],
        yShift: number[],
    ): void {
        this.tooltipCreationService.createTooltipRect(
            '#chartSvg',
            'barchartTooltip',
            x,
            y,
            width,
            height,
            this.tooltipColors[0],
        );
        this.tooltipCreationService.addTooltipText(
            '#chartSvg',
            'barchartTooltip',
            x + width / 2,
            textY,
            this.tooltipCreationService.getTooltipFontSize(
                '#barchartPlaceholder',
            ),
            text,
            yShift,
            this.tooltipColors[1],
        );
    }

    /**
     * Finds the ID of the training instance which has been
     * selected by mouseing over a bar or the legend
     * @param event - marks the mouseover event
     */
    private getTrainingToBeHighlighted(event: MouseEvent): number {
        // The 'event' contains different attributes in case of a bar and a legend,
        // so the class attribute of the element can be found in different ways
        let layersClass: string[];
        if (
            (<any>(<HTMLElement>event.target).className).baseVal ===
            'barchartRect'
        ) {
            layersClass = (<any>(
                (<HTMLElement>event.target).parentElement.className
            )).baseVal.split('_');
        } else {
            layersClass = (<any>(
                (<HTMLElement>event.target).className
            )).baseVal.split('_');
        }
        return Number(layersClass.pop());
    }

    /**
     * Processes mouse out event
     * If the mouse is not over any bar or legend,
     * no rectangles are highlighted and the tooltips are hidden
     * Calls the method 'undoHighlight...' of the components
     * combined diagram, bubblechart and scatterplot to interact with them
     */
    private handleMouseOut(): void {
        d3.select('.stackedChartLine').attr('pointer-events', 'all');
        d3.select('#barchartPlaceholder')
            .selectAll('.barchartTooltip')
            .remove();
        d3.select('#chartSvg').selectAll('.groupedChartLine').remove();

        this.undoHighlightData();
        this.highlightInstance.emit(null);
    }

    /**
     * Creates the legend for the barchart component
     * Gets the list of training instances and for each of them
     * creates a 'g' element -> mouseing over it enables to highlight
     * the elements belonging to the correspondig training instance
     * Calls the appropriate services to attach the legend text and
     * rectangles to the group element
     */
    private createLegend(): void {
        // Gets the list of training instances
        const trainingIds: number[] = this.trainingInstanceStatistics.map(
            (statistics) => statistics.instanceId,
        );
        trainingIds.sort();
        // Calculates the minimum height of canvas required to make the whole legend visible
        this.adjustLegendSvgSize(trainingIds.length);
        this.svgConfigurationService.cleanSvgs('#legendSvg');
        // For each training instance creates the legend elements
        for (let i = 0; i < trainingIds.length; i++) {
            const lineShift: number = 0.03 * this.svgHeight;
            const marginAndTrainingShift: number =
                this.margin + i * 0.22 * this.svgHeight;
            // Each training instance is represented by a group element, which contains the
            // rectangles and texts belonging to the legend
            // A mouseover event is attached to this 'g' element that enables to highlight
            // the elements of the barchart belonging to the selected training instance
            d3.select('#legendSvg')
                .append('g')
                .attr('class', 'legendForTraining_' + trainingIds[i])
                .style('pointer-events', 'bounding-box')
                .style('cursor', 'pointer')
                .on('mouseover', () => {
                    if (this.selectedLevel === null) {
                        const selectedTrainingId: number =
                            this.getTrainingToBeHighlighted(<MouseEvent>event);
                        this.highlightDataForTraining(selectedTrainingId);
                    }
                    if (this.chartType === 'grouped') {
                        this.visualizeNumberOfParticipantsForGroupedChart(
                            trainingIds[i],
                            <MouseEvent>event,
                        );
                    }
                })
                .on('mouseout', () => this.handleMouseOut());

            // Calls the appropriate services to attach
            // the text and the rectangles to the legend
            this.legendCreationService.addLegendText(
                '.legendForTraining_' + trainingIds[i],
                'legendText',
                0,
                marginAndTrainingShift,
                this.legendCreationService.getLegendFontSize(
                    '#barchartPlaceholder',
                ),
                '#000000',
                [
                    'Training ' + trainingIds[i],
                    'correct answers',
                    'wrong answers',
                ],
                [
                    0.1 * this.legendSvgWidth,
                    0.25 * this.legendSvgWidth,
                    0.25 * this.legendSvgWidth,
                ],
                [0, 2 * lineShift, 2 * lineShift],
                'left',
            );
            this.legendCreationService.createLegendRect(
                '.legendForTraining_' + trainingIds[i],
                'legendRect',
                [this.zScale(i), this.zScale(i)],
                0.1 * this.legendSvgWidth,
                [
                    marginAndTrainingShift + lineShift,
                    marginAndTrainingShift + 3 * lineShift,
                ],
                0.03 * this.svgHeight,
                0.03 * this.svgHeight,
                [1, 0.4],
            );

            // Disables the pointer events for the text and the rectangles (that
            // are in the foreground) -> which enables the group elements to react
            // to the events ('g' is in the background)
            d3.selectAll('.legendText').style('pointer-events', 'none');
            d3.selectAll('.legendRect').style('pointer-events', 'none');
        }
    }

    /**
     * Makes the legendSvg responsive
     * Calculates the minimum height of the canvas required
     * to visualize all the legend elements
     * If the canvas is not high enough, enlarges it and attaches
     * a scrollbar to make the canvas scrollable
     * @param numberOfTrainings - marks the number of training instances (which
     *                            indicates the required height of the canvas)
     */
    private adjustLegendSvgSize(numberOfTrainings: number): void {
        const requiredHeightOfLegendPlaceholder: number =
            this.margin +
            0.22 * numberOfTrainings * this.svgHeight +
            0.12 * this.svgHeight;
        // If the height of the canvas is too small, enlarges it
        if (requiredHeightOfLegendPlaceholder > this.svgHeight) {
            d3.select('#legendSvg')
                .attr('height', requiredHeightOfLegendPlaceholder)
                .attr(
                    'viewbox',
                    '0 0 ' +
                        this.legendSvgWidth +
                        ' ' +
                        requiredHeightOfLegendPlaceholder,
                );
            d3.select('#legendPlaceholder').classed(
                'verticallyScrollable',
                true,
            );
        }
    }

    /**
     * If a bar is clicked creates/hides the corresponding bubblechart
     * If no level is selected, hides the bubblechart
     * If a level has been selected calls 'initializeBubblechart' to
     * create the corresponding bubblechart -> bubblechart gets the
     * infomation required for initializtion of the component from
     * the barchart (not from the Filter component as the other charts)
     * @param selectedLevel - marks the currently selected level for
     *                        which the bubblechart should be created
     */
    private createBubblechart(selectedLevel: number): void {
        if (selectedLevel == null) {
            this.selectedLevelId.emit(null);
        } else {
            d3.select('crczp-bubblechart').style('display', 'inline');
            this.selectedLevelId.emit(this.selectedLevel);
        }
    }
}
