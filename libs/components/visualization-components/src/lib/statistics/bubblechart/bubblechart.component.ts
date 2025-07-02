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
import * as levenshtein from 'fast-levenshtein';
import {LevelAnswersStatistics, ParticipantStatistics, TrainingInstanceStatistics} from '@crczp/visualization-model';
import {AxesCreationService} from '../service/axes-creation-service';
import {TooltipCreationService} from '../service/tooltip-creation-service';
import {SvgConfigurationService} from '../service/svg-configuration-service';
import {LegendCreationService} from '../service/legend-creation-service';
import {MatCardModule} from '@angular/material/card';
import {MatGridListModule} from '@angular/material/grid-list';
import {MatDividerModule} from '@angular/material/divider';
import {CommonModule} from '@angular/common';

@Component({
    selector: 'crczp-bubblechart',
    templateUrl: './bubblechart.component.html',
    styleUrls: ['./bubblechart.component.css'],
    imports: [
        CommonModule,
        MatCardModule,
        MatGridListModule,
        MatDividerModule
    ],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class BubblechartComponent implements OnInit, OnChanges {
    @Input() selectedLevel: number;
    @Input() trainingInstanceStatistics: TrainingInstanceStatistics[];

    @Output() highlightInstances: EventEmitter<number[]> = new EventEmitter();
    @Output() highlightParticipants: EventEmitter<number[]> = new EventEmitter();
    public chartTitle = '';
    private selectedLevelAnswer: LevelAnswersStatistics;
    // Marks the sizes of the svgs
    private correctFlagSvgWidth: number;
    private wrongFlagsSvgWidth: number;
    private legendSvgWidth: number;
    private xAxisSvgWidth: number;
    private xAxisSvgHeight: number;
    private svgHeight: number;
    // the most suitable form for visualization
    private correctAnswer: string;
    // Contains data after filtration, transformed to
    private numberOfCorrectAnswer: number;
    private correctFlagSubmittedBy: string[];
    private wrongFlags: any = [];
    private totalAmountOfSubmittedFlags: number;
    // Marks the scale required for the creation of the chart
    private rScale: d3.ScaleLinear<number, number>;
    private componentWidth: string[] = ['100%', '100%'];
    private componentHeight: string[] = ['28vw', '50vw'];
    private circleColors: string[] = ['#46d246', '#999999', '#00000'];
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
     * Bubblechart is not displayed by default, it is made visible
     * by the barchart in case a level has been selected
     */
    public ngOnInit(): void {
        this.checkInputs();
        this.setComponentSize();
    }

    public ngOnChanges(changes: SimpleChanges): void {
        if ('selectedLevel' in changes) {
            if (this.selectedLevel) {
                d3.select('#bubblechartPlaceholder').style('display', 'flex');
                this.chartTitle =
                    this.selectedLevel !== null ? '(for <i>level ' + this.selectedLevel + '</i> only)' : '';
                this.displayComponents('inline');
                this.initializeBubblechart();
            } else {
                this.displayComponents('none');
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
     * Unlike the other charts, bubblechart is initialized by the barchart,
     * when a level is selected -> this level is passed as an input parameter
     * Sets the title of the chart and marks level for which the bubblechart
     * visualizes the list of submitted flags.
     * Filters the data - shared by all the diagrams - based on the current
     * settings of the filters and transforms them to the most suitable form
     * to create the bubblechart
     * Saves all the required values and then calls the method 'createChart'
     */
    public initializeBubblechart(): void {
        const levelIndex: number =
            this.trainingInstanceStatistics.map((statistics) =>
                statistics.levelsAnswers.findIndex((levelAnswer) => levelAnswer.id == this.selectedLevel)
            )[0] + 1;

        const selectedLevelAnswers: LevelAnswersStatistics[] = this.trainingInstanceStatistics.map((statistics) =>
            statistics.levelsAnswers.find((levelAnswer) => levelAnswer.id == this.selectedLevel)
        );
        this.selectedLevelAnswer = new LevelAnswersStatistics();
        this.selectedLevelAnswer.wrongAnswers = [];
        this.selectedLevelAnswer.correctAnswerSubmitted = 0;
        selectedLevelAnswers.forEach((answer) => {
            this.selectedLevelAnswer.id = answer.id;
            this.selectedLevelAnswer.correctAnswer = answer.correctAnswer;
            this.selectedLevelAnswer.correctAnswerSubmitted += answer.correctAnswerSubmitted;
            this.selectedLevelAnswer.wrongAnswers.push(...answer.wrongAnswers);
        });

        let wrongAnswerSubmittedBy: number;
        this.trainingInstanceStatistics
            .map((statistics) => statistics.participants)
            .map((participants) =>
                participants
                    .map((participant) => participant.levels.find((level) => level.id == this.selectedLevel))
                    .map((level) =>
                        level.wrongAnswerSubmitted.length > 0 ? wrongAnswerSubmittedBy++ : wrongAnswerSubmittedBy
                    )
            );
        // .reduce((acc, levels) => acc + (levels.wrongAnswerSubmitted ? 1 : 0), 0);

        this.correctAnswer = this.selectedLevelAnswer.correctAnswer;
        this.numberOfCorrectAnswer = this.selectedLevelAnswer.correctAnswerSubmitted;
        this.correctFlagSubmittedBy = Array.from(
            { length: this.selectedLevelAnswer.correctAnswerSubmitted },
            () => this.correctAnswer
        );
        this.wrongFlags = this.createWrongFlagObject();
        this.totalAmountOfSubmittedFlags = selectedLevelAnswers.reduce(
            (acc, answer) => acc + answer.correctAnswerSubmitted + answer.wrongAnswers.length,
            0
        );

        this.createChart();
        // If the title contains the currently selected level's ID, resets the variable
        // containing the title of the chart -> the predefined title contains the ID of
        // the currently selected level, and without reset, this title
        // would be the same for all the levels (the ID would not change)
    }

    /**
     * This method enables interaction between barchart and bubblechart
     * If the user hovers over a rectangle of the barchart, all the elements of
     * this component - representing flags that have been submitted on to the same
     * training - should be highlighted
     * @param trainingId - marks the id of the actually selected training instance
     * @param anyCorrectFlagSubmitted - marks if any user has submitted a correct answer
     *                                  on the given training; defines whether the bubble
     *                                  of correct flags should be highlighted
     */
    public highlightFlagsForTraining(trainingId: string, anyCorrectFlagSubmitted: boolean): void {
        // Blurs all the bubbles representing wrong flags
        d3.select('#bubblechartPlaceholder').select('#wrongFlagsSvg').selectAll('circle').style('opacity', 0.1);
        d3.select('#bubblechartPlaceholder').select('#wrongFlagsSvg').selectAll('text').style('opacity', 0.1);

        // If nobody submitted the correct answer, hides the
        // bubble which represents the correct flag
        if (!anyCorrectFlagSubmitted) {
            d3.select('#bubblechartPlaceholder')
                .select('#correctFlagSvg')
                .select(`[id='circle_${this.correctAnswer}']`)
                .style('opacity', 0.1);
            d3.select('#bubblechartPlaceholder')
                .select('#correctFlagSvg')
                .selectAll(`[id='text_${this.correctAnswer}']`)
                .style('opacity', 0.1);
        }

        // Tests each wrong flag, whether it has been submitted on the
        // selected training or not -> 'wrongFlags.trainingIds[i]' contains
        // the list of training instances on which the wrong flag with
        // index 'i' has been submitted
        const indecesToHighlight: number[] = [];
        for (let i = 0; i < this.wrongFlags.trainingIds.length; i++) {
            if (this.wrongFlags.trainingIds[i].includes(trainingId)) {
                indecesToHighlight.push(i);
            }
        }
        // Highlights the selected bubbles and their text
        indecesToHighlight.forEach((index: number) => {
            d3.select(`[id='circle_${this.wrongFlags.flags[index]}']`).style('opacity', 1);
            d3.select(`[id='text_${this.wrongFlags.flags[index]}']`).style('opacity', 1);
        });
    }

    /**
     * This method enables interaction between barchart and bubblechart
     * If no element is selected, resets the opacity of all the bubbles
     */
    public undoHighlightFlagsForTraining(): void {
        d3.select('#bubblechartPlaceholder').selectAll('circle').style('opacity', 1);
        d3.select('#bubblechartPlaceholder').selectAll('text').style('opacity', 1);
    }

    private createWrongFlagObject() {
        const wrongFlags = {
            flags: [],
            numberOfSubmissions: [],
            submittedBy: [],
            editDistances: [],
            trainingIds: [],
            playerIds: []
        };

        const correctAnswer = this.trainingInstanceStatistics[0].levelsAnswers.find(
            (level) => level.id === this.selectedLevel
        ).correctAnswer;

        const wrongAnswersForLevel = [];
        this.trainingInstanceStatistics.map((statistics) =>
            statistics.levelsAnswers
                .filter((level) => level.id === this.selectedLevel)
                .forEach((level) => wrongAnswersForLevel.push(...level.wrongAnswers))
        );

        const flagsSet = new Set(wrongAnswersForLevel);
        // FLAGS
        wrongFlags.flags = Array.from(flagsSet.values());

        flagsSet.forEach((flag: string) => {
            // SUBMITTED BY - number of trainees that submitted the flag
            let submittedBy = 0;
            this.trainingInstanceStatistics.map((statistic) =>
                statistic.participants.map((participant) =>
                    participant.levels
                        .filter((level) => level.id === this.selectedLevel)
                        .map((level) =>
                            level.wrongAnswerSubmitted.find((answer) => answer === flag) ? submittedBy++ : submittedBy
                        )
                )
            );
            wrongFlags.submittedBy.push(submittedBy);

            // EDIT DISTANCE - levenshtein distance
            wrongFlags.editDistances.push(levenshtein.get(correctAnswer, flag));

            // NUMBER OF SUBMISSIONS - total number of times the flag was submitted
            wrongFlags.numberOfSubmissions.push(wrongAnswersForLevel.filter((answer) => answer === flag).length);

            // PARTICIPANTS' ID - IDs of participants that submitted the flag
            const participants: ParticipantStatistics[] = [];
            this.trainingInstanceStatistics.map((statistic) =>
                participants.push(
                    ...statistic.participants.filter(
                        (participant) =>
                            participant.levels.filter(
                                (level) =>
                                    level.id === this.selectedLevel &&
                                    level.wrongAnswerSubmitted.find((answer) => answer === flag)
                            ).length > 0
                    )
                )
            );
            wrongFlags.playerIds.push(participants);

            // INSTANCE IDs - instance id in which the flag was submitted
            const instances: number[] = this.trainingInstanceStatistics
                .filter((statistic) =>
                    statistic.participants.filter((participant) =>
                        participant.levels.filter(
                            (level) =>
                                level.id === this.selectedLevel &&
                                level.wrongAnswerSubmitted.find((answer) => answer === flag)
                        )
                    )
                )
                .map((statistics) => statistics.instanceId);
            wrongFlags.trainingIds.push(instances);
        });

        return wrongFlags;
    }

    /**
     * Sets components display style based on the @value
     * @param value display style
     */
    private displayComponents(value: string): void {
        d3.select('#bubblechartSvgPlaceholder').style('display', value);
        d3.select('#bubblechartLegendPlaceholder').style('display', value);
        d3.select('#xAxisSvg').style('display', value);
    }

    /**
     * Sets the components size based on the current
     * configuration settings and screen size
     */
    private setComponentSize(): void {
        if (window.innerWidth >= 1024) {
            d3.select('#bubblechartPlaceholder')
                .style('width', this.componentWidth[0])
                .style('height', this.componentHeight[0]);
        } else {
            d3.select('#bubblechartPlaceholder')
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
                this.circleColors = ['#00cc00', '#ff3333', '#000000'];
                break;
            case 1:
                this.circleColors = this.circleColors.concat(['#ff3333', '#000000']);
                break;
            case 2:
                this.circleColors.push('#000000');
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
     * Calls all the methods required to create the bubblechart
     */
    private createChart(): void {
        this.svgConfigurationService.cleanSvgs('#bubblechartPlaceholder');
        this.svgConfigurationService.setMatContentHeight('#bubblechartPlaceholder');
        // Hides the horizontal scrollbar by default
        this.hideScrollbar();
        this.resizeLegendSvg();
        this.setScale();
        this.testScale();
        this.resizeBubblechartSvgs();
        this.createAxes();
        this.createBubbles();
        this.createLegend();
    }

    /**
     * Calls the service 'resizeSvg' to resize the legend's svg
     * based on the current screen size and saves its sizes
     * The other svgs are resized using another funtion as
     * their size is based on the number of bubbles
     */
    private resizeLegendSvg(): void {
        const size: { widths: number[]; height: number } = this.svgConfigurationService.resizeSvg([
            '#bubblechartLegendPlaceholder'
        ]);
        this.legendSvgWidth = size.widths[0];
        this.svgHeight = 0.875 * size.height;
    }

    /**
     * Sets the scale which represents the circles' radius
     * It is set on a way, so the circles are stretched across
     * the entire width of the canvas by default
     * Later, the function 'testScale' tests whether this setting
     * of the rScale is the most appropriate one, or it has to be
     * adjusted
     */
    private setScale(): void {
        this.rScale = d3
            .scaleLinear()
            .domain([0, this.totalAmountOfSubmittedFlags * 2])
            .range([
                0,
                0.75 *
                parseInt(
                    (
                        d3.select('#bubblechartPlaceholder').select('mat-grid-list').select('div').node() as any
                    ).getBoundingClientRect().width
                )
            ]);
    }

    /**
     * Tests whether the preset scale is appropriate for the given situation
     * If the biggest circle does not fit to the height of the canvas,
     * the scale should be set again -> it is required to stretch the circles
     * across the height of the canvas, instead of its width
     * If the circles are too small, it indicates that the width of the canvas
     * should be enlarged and the scale should be reset based on the new width
     */
    private testScale(): void {
        // Gets the flag with the highest number of submissions ->
        // it will be represented by the biggest circle
        const maxNumberOfSubmissions: number = Math.max(
            this.numberOfCorrectAnswer,
            Math.max(...this.wrongFlags.numberOfSubmissions)
        );
        // Gets the flag with the lowest number of submissions ->
        // it will be represented by the smallest circle
        const minNumberOfSubmissions: number = Math.min(
            this.numberOfCorrectAnswer,
            Math.min(...this.wrongFlags.numberOfSubmissions)
        );
        const minCircleR = 10;
        // If the biggest circle does not fit
        // the height of the canvas, reset the scale
        if (2 * this.rScale(maxNumberOfSubmissions) > this.svgHeight) {
            this.processRescaleByHeight(maxNumberOfSubmissions);
        }
        // If the littlest circle is smaller than the predefined value,
        // the width of the canvas should be enlarged
        if (
            2 * this.rScale(maxNumberOfSubmissions) < this.svgHeight &&
            2 * this.rScale(minNumberOfSubmissions) < minCircleR
        ) {
            this.processRescaleByWidth(maxNumberOfSubmissions);
        }
    }

    /**
     * Resets the scale so that the biggest circle fits the height of the canvas
     * @param domain - marks the maximum number of submission for a single flag
     */
    private processRescaleByHeight(domain: number): void {
        this.rScale = d3
            .scaleLinear()
            .domain([0, domain])
            .range([0, this.svgHeight / 2]);
    }

    /**
     * Resets the scale so that even the radius of the smallest
     * circle would be bigger than a predefined value
     * Enlarges the circle on a way, so that the biggest circle
     * would perfectly fit the height of the canvas -> it causes
     * the other circles to enlarge, too
     */
    private processRescaleByWidth(maxNumberOfSubmissions: number): void {
        const enlargeRate: number = this.svgHeight / (2 * this.rScale(maxNumberOfSubmissions));
        this.rScale = d3
            .scaleLinear()
            .domain([0, this.totalAmountOfSubmittedFlags * 2])
            .range([
                0,
                enlargeRate *
                0.75 *
                parseInt(d3.select('#bubblechartPlaceholder').select('mat-grid-list').select('div').style('width'))
            ]);
        // Communicates to the other functions that a scrollbar should be attached
        d3.select('#bubblechartPlaceholder').select('#scrollableDiv').classed('horizontallyScrollable', true);
    }

    /**
     * Resizes the canvases based on the actual radius of the circles
     * The width of 'correctFlagSvg' is determined by the diameter of the
     * bubble representing the correct flags and by the width of y axis
     * The width of 'wrongFlagsSvg' is calculated as the sum of diameters
     * of circles representing the wrong flags (a scrollbar is added, if required)
     * The width of 'xAxisSvg' is specified as the sum of widths of the previous ones
     */
    private resizeBubblechartSvgs(): void {
        // Gets the height of the x axis, which equals to the width of y axis
        this.xAxisSvgHeight =
            0.125 *
            parseInt(d3.select('#bubblechartPlaceholder').select('mat-card-content').style('height').slice(0, -2));

        // Sets the sizes of the canvas which contains the circle that represents the correct flags
        // 'correctFlagSvg' contains the y axis, too, for which the width is defined by 'xAxisHeight'
        this.correctFlagSvgWidth = 2 * this.rScale(this.numberOfCorrectAnswer);
        d3.select('#correctFlagSvg')
            .attr('width', this.correctFlagSvgWidth + this.xAxisSvgHeight)
            .attr('height', this.svgHeight)
            .attr('viewbox', '0 0 ' + this.correctFlagSvgWidth + this.xAxisSvgHeight + ' ' + this.svgHeight);

        // Sets the sizes for the canvas which contains the circles that represent the wrong flags
        this.wrongFlagsSvgWidth = 2 * this.rScale(this.totalAmountOfSubmittedFlags - this.numberOfCorrectAnswer);
        d3.select('#wrongFlagsSvg')
            .attr('width', this.wrongFlagsSvgWidth)
            .attr('height', this.svgHeight)
            .attr('viewbox', '0 0 ' + this.wrongFlagsSvgWidth + ' ' + this.svgHeight);

        // Sets width and height for the canvas which contains the x axis
        // Tests whether the width of the card component or the sum of the
        // widths of the canvases ('correctFlagSvg' and 'wrongFlagsSvg') is
        // smaller -> the minimum of them defines the width of 'xAxiSvg'
        const gridWidth: number =
            0.82 *
            parseInt(
                (
                    d3.select('#bubblechartPlaceholder').select('mat-grid-list').select('div').node() as any
                ).getBoundingClientRect().width
            );
        const sumOfWidths: number = this.xAxisSvgHeight + this.correctFlagSvgWidth + this.wrongFlagsSvgWidth;
        this.xAxisSvgWidth = gridWidth > sumOfWidths ? sumOfWidths : gridWidth;
        d3.select('#xAxisSvg')
            .attr('width', this.xAxisSvgWidth)
            .attr('height', this.xAxisSvgHeight)
            .attr('viewbox', '0 0 ' + this.xAxisSvgWidth + ' ' + this.xAxisSvgHeight);

        // In case a scrollbar should be added, calls the function 'resizeScrollbarDiv'
        if (d3.select('#bubblechartPlaceholder').select('#scrollableDiv').attr('class') === 'horizontallyScrollable') {
            this.resizeScrollbarDiv();
        }
    }

    /**
     * In case the canvas for wrong flags is enlarged, its wrapper
     * should be resized to fit the component and a scrollbar should
     * be added to enable to study the whole canvas
     * The width of the wrapper is calculated as the difference between
     * the width of the whole component and the width of the canvas
     * which represents the correct flags
     */
    private resizeScrollbarDiv(): void {
        // Gets the width of the component
        const chartContainerWidth: number =
            0.82 * parseInt(d3.select('#bubblechartPlaceholder').select('mat-grid-list').select('div').style('width'));
        // Gets the width of the 'correctFlagSvg'
        const correctFlagContainerWidth: number = 2 * this.rScale(this.numberOfCorrectAnswer) + this.xAxisSvgHeight;
        // Calculates the width of the wrapper element
        const scrollbarDivWidth: number = chartContainerWidth - correctFlagContainerWidth;

        d3.select('#bubblechartPlaceholder')
            .select('#scrollableDiv')
            .style('width', scrollbarDivWidth + 'px');
        d3.select('#bubblechartPlaceholder')
            .select('.horizontallyScrollable')
            .style('width', scrollbarDivWidth + 'px');
    }

    /**
     * Hides the horizontal scrollbar by default
     */
    private hideScrollbar(): void {
        d3.select('#bubblechartPlaceholder').select('#scrollableDiv').classed('horizontallyScrollable', false);
    }

    /**
     * Calls the service 'createAxesWithArrow' to attach the axes to this component
     * Calls the services 'createXAxesTitle' and 'createYAxesTitle' to
     * attach title to the axes
     */
    private createAxes(): void {
        // Creates x axis
        this.axesCreationService.createAxesWithArrow(
            '#xAxisSvg',
            this.xAxisSvgHeight - 4,
            this.xAxisSvgWidth - 4,
            4,
            4
        );
        // Creates y axis
        this.axesCreationService.createAxesWithArrow(
            '#correctFlagSvg',
            this.xAxisSvgHeight - 4,
            this.xAxisSvgHeight - 4,
            1.05 * this.svgHeight + 4,
            4
        );

        const fontSize: number = this.axesCreationService.getAxisTitleFontSize('#bubblechartPlaceholder');
        // The title for x axis is visible only in case the component's width
        // is at least 370px, because otherwise it would not fit the component
        if (this.xAxisSvgWidth >= 370 + this.xAxisSvgHeight) {
            this.axesCreationService.createXAxesTitle(
                '#xAxisSvg',
                this.xAxisSvgWidth - 4,
                fontSize,
                'Difference between the correct and wrong answers',
                fontSize
            );
        }
        this.axesCreationService.createYAxesTitle(
            '#correctFlagSvg',
            -fontSize,
            this.xAxisSvgHeight - fontSize,
            'Answers count',
            fontSize
        );
    }

    /**
     * Calls a function to sort the submitted flags by their edit distance from
     * the correct one, then calls the appropriate functions to create the bubbles
     */
    private createBubbles(): void {
        const sortedDistances: number[] = this.sortFlagsByDistance();
        this.createBubblesForWrongFlags(sortedDistances);
        this.createBubbleForCorrectFlag();
    }

    /**
     * Sorts the edit distances of submitted wrong flags in ascending order
     */
    private sortFlagsByDistance(): number[] {
        // Prevents deep copy of the edit distances
        const sortedDistances: number[] = JSON.parse(JSON.stringify(this.wrongFlags.editDistances));
        sortedDistances.sort(function(a: number, b: number): number {
            return a - b;
        });

        return sortedDistances;
    }

    /**
     * Loops over the array of sorted edit distances, finds the wrong flag with the
     * next edit distance, gets all the parameters required to create the corresponding
     * bubble and calls 'addBubble' to attach the new bubble to the chart
     * @param sortedDistances - marks the array of sorted edit distances in ascending order
     */
    private createBubblesForWrongFlags(sortedDistances: number[]): void {
        // Prevents deep copy
        const helperForWrongFlags = JSON.parse(JSON.stringify(this.wrongFlags));
        // Marks the x coordinate of the next circle's center
        // It is always shifted by the current circle's diameter
        let x = 0;
        sortedDistances.forEach((distance: number) => {
            // Finds the flag with the next edit distance
            const actualIndex: number = helperForWrongFlags.editDistances.indexOf(distance);
            const numberOfSubmissions: number = helperForWrongFlags.numberOfSubmissions[actualIndex];
            // Shifts the actual x coordinate by the radius of the
            // bubble to get the center of the circle
            x = x + this.rScale(numberOfSubmissions);
            // Creates the circle and append the text
            this.addBubble(
                'wrongFlagsSvg',
                helperForWrongFlags.flags[actualIndex],
                x,
                numberOfSubmissions,
                this.circleColors[1]
            );
            this.addVisiblePartOfTextToBubble(
                'wrongFlagsSvg',
                helperForWrongFlags.flags[actualIndex],
                x,
                2 * this.rScale(numberOfSubmissions)
            );
            // Sets the actual element's edit distance to -1, which enables
            // to find those records which have the same edit distance as the
            // actual one -> indexOf() finds only the first element
            helperForWrongFlags.editDistances[actualIndex] = -1;
            // Shifts the actual x coordinate by the radius of the bubble -
            // shifts to the left border of the next circle
            x = x + this.rScale(numberOfSubmissions);
        });
    }

    /**
     * Calls the appropriate functions to create the bubble
     * which represents the correct flags and appends the
     * visible part of the text to it
     */
    private createBubbleForCorrectFlag(): void {
        this.addBubble(
            'correctFlagSvg',
            this.correctAnswer,
            this.correctFlagSvgWidth / 2 + this.xAxisSvgHeight,
            this.numberOfCorrectAnswer,
            this.circleColors[0]
        );

        this.addVisiblePartOfTextToBubble(
            'correctFlagSvg',
            this.correctAnswer,
            this.rScale(this.numberOfCorrectAnswer) + this.xAxisSvgHeight,
            2 * this.rScale(this.numberOfCorrectAnswer)
        );
    }

    /**
     * Creates and attaches a new bubble to the chart by using the input parameters
     * Each circle is marked by an ID, which contains the index of the flag to which
     * the given bubble belongs
     * @param canvasId - marks the canvas to which the bubble should be attached
     * @param id - defines the index of the flag (it will be part of the circle's ID)
     * @param x - specifies the x coordinate of the circle center
     * @param r - marks the radius of the circle
     * @param color - specifies the color of the bubble
     */
    private addBubble(canvasId: string, id: string, x: number, r: number, color: string): void {
        d3.select('#' + canvasId)
            .append('circle')
            .attr('id', 'circle_' + id)
            .attr('cx', x)
            .attr('cy', this.svgHeight / 2)
            .attr('r', Math.floor(this.rScale(r)))
            .style('stroke', 'rgba(0, 0, 0, 0.5)')
            .style('stroke-width', 1)
            .style('fill', color)
            .style('cursor', 'pointer')
            .on('mouseover', () => this.handleMouseOver(<MouseEvent>event))
            .on('mouseout', () => this.handleMouseOut());
    }

    /**
     * Neither the minimum size of the bubbles, nor the maximum length of the text is
     * predefined -> cannot ensure that the text always fits to the corresponding circle
     * Tests the maximum number of characters which fit to the current circle size
     * Attaches only that part of the text to the bubble, which fits the size (followed by '..')
     * @param placeholder - marks the ID of the bubble to which the text is appended
     * @param text - contains the corresponding flag
     * @param x - defines the x coordinate of the corresponding circle's center
     * @param d - specifies the diameter of the corresponding circle
     */
    private addVisiblePartOfTextToBubble(placeholder: string, text: string, x: number, d: number): void {
        const fontSize: number = this.legendCreationService.getLegendFontSize('#bubblechartPlaceholder');
        const maxAmountOfCharacters: number = Math.floor(1.5 * (d / fontSize));
        const id: string = 'text_' + text;
        // If the text is longer than the maximum acceptable, than hides the end of the text
        if (text.length > maxAmountOfCharacters) {
            text = text.substring(0, maxAmountOfCharacters - 2) + '..';
        }

        d3.select('#' + placeholder)
            .append('text')
            .attr('id', id)
            .attr('x', x)
            .attr('y', this.svgHeight / 2)
            .text(text)
            .style('font-size', fontSize)
            .style('fill', this.circleColors[2])
            .style('text-anchor', 'middle')
            .style('dominant-baseline', 'middle')
            .style('cursor', 'pointer')
            .on('mouseover', () => this.handleMouseOver(<MouseEvent>event))
            .on('mouseout', () => this.handleMouseOut());
    }

    /**
     * Processes mouseover event over a bubble
     * Gets the ID of the selected element, which also marks
     * the index of the corresponding flag
     * Based on the type of the currently selected bubble calls the function
     * 'createTooltipForCorrectFlag' or 'createTooltipForWrongFlag' to create a tooltip
     * Calls the appropriate functions to interact with the barchart and scatterplot
     * @param event - marks the mouseover event
     */
    private handleMouseOver(event: MouseEvent): void {
        // Gets the ID of the circle, which indicates index of the corresponding flag
        const splitPoint: number = (<HTMLElement>event.srcElement).id.indexOf('_');
        const actualId: string = (<HTMLElement>event.srcElement).id.slice(
            splitPoint + 1,
            (<HTMLElement>event.srcElement).id.length
        );

        if (actualId === this.correctAnswer) {
            // Gets the actual mouse position, which marks
            // the place, where the tooltip should be drawn
            const correctSvg: {
                x: number;
                y: number;
            } = this.svgConfigurationService.convertScreenCoordToSvgCoord(
                'correctFlagSvg',
                event.clientX,
                event.clientY
            );
            this.createTooltipForCorrectFlag(correctSvg.x);
            // Interacts with the other components
            const participants: ParticipantStatistics[] = [];
            this.trainingInstanceStatistics.map((statistic) =>
                participants.push(
                    ...statistic.participants.filter(
                        (participant) =>
                            participant.levels.filter((level) => level.id === this.selectedLevel).length > 0
                    )
                )
            );

            this.highlightInstances.emit(this.trainingInstanceStatistics.map((statistics) => statistics.instanceId));
            this.highlightParticipants.emit(participants.map((participant) => participant.userRefId));
        } else {
            // Gets the actual mouse position, which marks
            // the place, where the tooltip should be drawn
            const wrongSvg: {
                x: number;
                y: number;
            } = this.svgConfigurationService.convertScreenCoordToSvgCoord(
                'wrongFlagsSvg',
                event.clientX,
                event.clientY
            );
            this.createTooltipForWrongFlag(this.wrongFlags.flags.indexOf(actualId), wrongSvg.x);
            // Interacts with the other components
            const index: number = this.wrongFlags.flags.indexOf(actualId);
            this.highlightInstances.emit(this.wrongFlags.trainingIds[index]);
            this.highlightParticipants.emit(
                this.wrongFlags.playerIds[index].map((participant) => participant.userRefId)
            );
        }
        this.makeFlagTextItalic();
    }

    /**
     * Handles mouseout events
     * Hides the tooltips of the component
     * Calls method 'undoHighlightData' of barchart and scatterplot
     * components to reset them, too
     */
    private handleMouseOut(): void {
        d3.select('#bubblechartSvgPlaceholder').selectAll('.bubblechartTooltip').remove();
        this.highlightInstances.emit(null);
        this.highlightParticipants.emit(null);
    }

    /**
     * Attaches a tooltip to the element that is representing the correct flags
     * Gets/calculates all the parameters required to create a tooltip
     * (e.g. coordinates, width, height, text, font size...)
     * Calls the appropriate services to attach the rectangle and the text
     * @param x - marks the x coordinate of the current mouse position
     */
    private createTooltipForCorrectFlag(x: number): void {
        const fontSize: number = this.tooltipCreationService.getTooltipFontSize('#bubblechartPlaceholder');
        // The longest row of the text determines the tooltip's width
        const maxTextLength: number = Math.max(
            this.correctAnswer.length + 6,
            this.numberOfCorrectAnswer.toString().length + 11
        );
        const width: number = 0.6 * Math.ceil(maxTextLength * fontSize);
        const height: number = Math.round(3.5 * fontSize);
        const y: number = 0.1 * this.svgHeight;
        x = x - width / 2;
        if (x < 0) {
            x = 0;
        }
        if (x > this.correctFlagSvgWidth - width) {
            x = this.correctFlagSvgWidth - width;
        }

        this.tooltipCreationService.createTooltipRect(
            '#correctFlagSvg',
            'bubblechartTooltip',
            x,
            y,
            width,
            height,
            this.tooltipColors[0]
        );
        this.tooltipCreationService.addTooltipText(
            '#correctFlagSvg',
            'bubblechartTooltip',
            x + width / 2,
            y + 1.3 * fontSize,
            fontSize,
            [this.correctAnswer, 'submitted ' + this.numberOfCorrectAnswer + 'x'],
            [0, 1.5 * fontSize],
            this.tooltipColors[1]
        );
    }

    /**
     * Attaches a tooltip to the element that is representing the wrong flags
     * Gets/calculates all the parameters required to create a tooltip
     * (e.g. coordinates, width, height, text, font size...)
     * Calls the appropriate services to attach the rectangle and the text
     * This method differs from 'createTooltipForCorrectFlag' in the way
     * the individual parameters of the tooltip are calculated
     * @param index - defines the index of the selected wrong flag
     * @param x - marks the x coordinate of the current mouse position
     */
    private createTooltipForWrongFlag(index: number, x: number): void {
        const fontSize: number = this.tooltipCreationService.getTooltipFontSize('#bubblechartPlaceholder');
        // The longest row of the text determines the tooltip's width
        const maxTextLength: number = Math.max(
            this.wrongFlags.flags[index].length + 6,
            this.wrongFlags.numberOfSubmissions[index].toString().length + 11,
            this.wrongFlags.submittedBy[index].toString().length + 14
        );
        const width: number = 0.6 * Math.ceil(maxTextLength * fontSize);
        const height: number = 4.5 * fontSize;
        const y: number = 0.1 * this.svgHeight;
        x = x - width / 2;
        if (x < 0) {
            x = 0;
        }
        if (x > this.wrongFlagsSvgWidth - width) {
            x = this.wrongFlagsSvgWidth - width;
        }

        this.tooltipCreationService.createTooltipRect(
            '#wrongFlagsSvg',
            'bubblechartTooltip',
            x,
            y,
            width,
            height,
            this.tooltipColors[0]
        );
        this.tooltipCreationService.addTooltipText(
            '#wrongFlagsSvg',
            'bubblechartTooltip',
            x + width / 2,
            y + 1.2 * fontSize,
            fontSize,
            [
                this.wrongFlags.flags[index],
                'submitted ' + this.wrongFlags.numberOfSubmissions[index] + 'x',
                '(by ' + this.wrongFlags.submittedBy[index] + ' participants)'
            ],
            [0, 1.5 * fontSize, 1.2 * fontSize],
            this.tooltipColors[1]
        );
    }

    /**
     * Makes the text of the flag italic, which helps to distinguish
     * the flag from the other parts of the tooltip's text
     */
    private makeFlagTextItalic(): void {
        d3.select('#bubblechartPlaceholder')
            .selectAll('.bubblechartTooltip')
            .select('tspan')
            .style('font-style', 'italic');
    }

    /**
     * Calls the appropriate service to attach legend texts
     * Then calls 'createLegendRect' method to create
     * the corresponding rectangles
     */
    private createLegend(): void {
        const fontSize = this.legendCreationService.getLegendFontSize('#bubblechartPlaceholder');
        this.legendCreationService.addLegendText(
            '#bubblechartLegendSvg',
            'bubblechartLegendText',
            this.legendSvgWidth - 6 * fontSize,
            this.svgHeight / 2 - 0.1 * this.legendSvgWidth + fontSize,
            fontSize,
            '#000000',
            ['correct answer', 'wrong answer'],
            [0, 0],
            [0, 0.2 * this.legendSvgWidth],
            'start'
        );
        this.legendCreationService.createLegendRect(
            '#bubblechartLegendSvg',
            'bubblechartLegend',
            [this.circleColors[0], this.circleColors[1]],
            this.legendSvgWidth - 7.5 * fontSize,
            [this.svgHeight / 2 - 0.1 * this.legendSvgWidth, this.svgHeight / 2 + 0.1 * this.legendSvgWidth],
            fontSize,
            fontSize,
            [1, 1]
        );
    }
}
