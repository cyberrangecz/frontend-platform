import { ChangeDetectionStrategy, Component, EventEmitter, HostListener, Input, OnChanges, OnInit, Output, SimpleChanges, inject } from '@angular/core';
import * as d3 from 'd3';
import {ParticipantStatistics, TrainingInstanceStatistics} from '@crczp/visualization-model';
import {AxesCreationService} from '../service/axes-creation-service';
import {SvgConfigurationService} from '../service/svg-configuration-service';
import {LegendCreationService} from '../service/legend-creation-service';
import {TooltipCreationService} from '../service/tooltip-creation-service';
import {MatCardModule} from '@angular/material/card';
import {MatGridListModule} from '@angular/material/grid-list';
import {MatDividerModule} from '@angular/material/divider';

@Component({
    selector: 'crczp-combined-diagram',
    templateUrl: './combined-diagram.component.html',
    styleUrls: ['./combined-diagram.component.css'],
    imports: [
        MatCardModule,
        MatGridListModule,
        MatDividerModule
    ],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class CombinedDiagramComponent implements OnInit, OnChanges {
    private axesCreationService = inject(AxesCreationService);
    private svgConfigurationService = inject(SvgConfigurationService);
    private legendCreationService = inject(LegendCreationService);
    private tooltipCreationService = inject(TooltipCreationService);

    @Input() trainingInstanceStatistics: TrainingInstanceStatistics[] = [];
    @Input() highlightedInstances: number[];
    @Output() highlightInstance: EventEmitter<number[]> = new EventEmitter();
    private componentWidth: string[] = ['100%', '100%'];
    private componentHeight: string[] = ['28vw', '50vw'];
    private colors: string[] = ['#d9d9d9', '#595959', '#46d246'];
    private tooltipColors: string[] = ['#000000', '#ffffff'];
    // Marks the sizes of the svgs
    private svgHeight: number;
    private leftAxisSvgWidth: number;
    private chartSvgWidth: number;
    private rightAxisSvgWidth: number;
    private legendSvgWidth: number;
    private margin: number;
    // which has not been filtered by trainings instances, yet
    private originalPlayers: ParticipantStatistics[];
    // the most suitable form for visualization
    private totalNumerOfParticipants = 0;
    // Represents the data got from the Filter component,
    private maxScore = 0;
    // Contains data after filtration, transformed to
    // Marks the scales required for the creation of the chart
    private xScale: d3.ScaleBand<string>;
    private leftYScale: d3.ScaleLinear<number, number>;
    private rightYScale: d3.ScaleLinear<number, number>;

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
        if ('trainingInstanceStatistics' in changes && !changes['trainingInstanceStatistics'].isFirstChange()) {
            this.createChart();
            this.initializeCombinedDiagramData([]);
        }

        if ('highlightedInstances' in changes) {
            if (this.highlightedInstances !== null) {
                if (this.highlightedInstances.length == 1) {
                    this.highlightDataForTraining(this.highlightedInstances[0]);
                }
            } else {
                this.undoHighlightDataForTraining();
            }
        }
    }

    /**
     * If the component has already been loaded, creates the chart
     * (Before that moment, the data that should be visualized
     * are not available)
     */
    // lib ngAfterViewInit(): void {
    //   this.createChart();
    // }

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
     * This method is called by the Filter component to pass
     * the data - after its transformation - to combined chart
     * Saves the original data and calls 'initializeCombinedDiagramData'
     * to initialize and create this diagram
     * @param players - original data about players, which is shared by
     *                  all the components
     */
    /**
     * Filters the data - shared by all the diagrams - based on the current
     * settings of the filters and transforms them to the most suitable form
     * to create the combined diagram
     * Saves all the required values and then calls the method 'createChart'
     */
    public initializeCombinedDiagramData(players: ParticipantStatistics[]): void {
        this.originalPlayers = players;
        this.totalNumerOfParticipants = this.trainingInstanceStatistics
            .map((instance) => instance.participants.length)
            .reduce((a, b) => a + b);
        this.maxScore = Math.max(
            ...this.trainingInstanceStatistics
                .map((instance) =>
                    instance.participants.map((participant) => participant.levels.reduce((a, b) => a + b.score, 0))
                )
                .reduce((a, b) => (Math.max(...a) > Math.max(...b) ? a : b))
        );
        this.roundRanges();
        this.createChart();
    }

    /**
     * This method enables interaction between barchart, combined diagram and scatterplot
     * If the user hovers over some element of the other two graphs, all the elements of
     * this component belonging to the same training should be highlighted
     * @param selectedTrainingId - marks the id of the actually selected training instance
     */
    public highlightDataForTraining(selectedTrainingId: number): void {
        let index = 0;
        // Finds the index of the selected training in 'trainingStatistics'
        while (this.trainingInstanceStatistics[index].instanceId !== selectedTrainingId) {
            index++;
        }
        // Hides the other trainings
        d3.select('#combinedDiagramChartSvg')
            .selectAll('rect')
            .filter(function () {
                return !d3.select(this).classed('combinedDiagramTooltip');
            })
            .style('opacity', 0.2);
        // Highlights the seleted one
        d3.select('#combinedDiagramChartSvg')
            .select('#participants_' + index)
            .style('opacity', 1);
    }

    /**
     * This method enables interaction between barchart, combined diagram and scatterplot
     * If no element is selected, resets the opacity of all the rectangles
     */
    public undoHighlightDataForTraining(): void {
        d3.select('#combinedDiagramChartSvg').selectAll('rect').style('opacity', 1);
    }

    /**
     * Sets the components size based on the current
     * configuration settings and screen size
     */
    private setComponentSize(): void {
        if (window.innerWidth >= 1024) {
            d3.select('#combinedDiagramPlaceholder')
                .style('width', this.componentWidth[0])
                .style('height', this.componentHeight[0]);
        } else {
            d3.select('#combinedDiagramPlaceholder')
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
        switch (this.colors.length) {
            case 0:
                this.colors = ['#b3b3b3', '#404040', '#003d99'];
                break;
            case 1:
                this.colors.push('#404040');
                this.colors.push('#003d99');
                break;
            case 2:
                this.colors.push('#003d99');
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
        d3.select('#combinedDiagramPlaceholder').select('mat-card-title').text('Training Instance Results');
    }

    /**
     * Synchronizes the ticks of the left and right y axes
     * (the ticks should be placed on the same height for both axes)
     */
    private roundRanges(): void {
        // Both axes should contain 'ticks' ticks, which should be placed on
        // the same heights -> the maximum value represented on both
        // axes should be divisible by 'ticks'
        const ticks = 5;
        const leftRoundingConstant: number = ticks - (this.totalNumerOfParticipants % ticks);
        const rightRoundingConstant: number = ticks - (this.maxScore % ticks);

        this.totalNumerOfParticipants = this.totalNumerOfParticipants + leftRoundingConstant;
        this.maxScore = this.maxScore + rightRoundingConstant;
    }

    /**
     * Calls all the methods required to create the combined chart
     */
    private createChart(): void {
        this.svgConfigurationService.cleanSvgs('#combinedDiagramPlaceholder');
        this.svgConfigurationService.setMatContentHeight('#combinedDiagramPlaceholder');
        this.resizeSvgs();
        this.setScales();
        this.createBars();
        this.createAverageCircles();
        this.createMedianCircles();
        this.createAxes();
        this.createLegend();
    }

    /**
     * Calls the service 'resizeSvg' to resize the individual svgs
     * of this component based on the current screen size
     * Saves the current sizes into the given variables
     */
    private resizeSvgs(): void {
        const size: { widths: number[]; height: number } = this.svgConfigurationService.resizeSvg([
            '#leftAxisPlaceholder',
            '#combinedDiagramChartPlaceholder',
            '#rightAxisPlaceholder',
            '#combinedDiagramLegendPlaceholder'
        ]);
        this.leftAxisSvgWidth = size.widths[0];
        this.chartSvgWidth = size.widths[1];
        this.rightAxisSvgWidth = size.widths[2];
        this.legendSvgWidth = size.widths[3];
        this.svgHeight = 0.95 * size.height;
    }

    /**
     * Sets the scales required to create the chart
     * The left y axis represents the number of participants,
     * while the right y axis the number of gained scores
     * The x axis (scale) represents the training instances ->
     * if the bandwidth of the bars would be too thin (too many bars should
     * be represented), resizes the component to the full width of the screen
     */
    private setScales(): void {
        this.margin = Math.floor(0.1 * this.svgHeight);

        this.xScale = d3
            .scaleBand()
            .domain(this.trainingInstanceStatistics.map((d) => String(d.instanceId)))
            .range([0, this.chartSvgWidth])
            .padding(0.3);

        // If the bandwidth of the bars would be too thin, calculates the
        // actual width-height ratio of the component, and based on it
        // resizes the component to full screen width
        if (this.xScale.bandwidth() > 0 && this.xScale.bandwidth() < 30) {
            const actualWidth: number =
                this.leftAxisSvgWidth + this.chartSvgWidth + this.rightAxisSvgWidth + this.legendSvgWidth;
            const ratio: number = this.svgHeight / actualWidth;
            d3.select('#combinedDiagramPlaceholder')
                .style('width', '100vw')
                .style('height', 100 * ratio + 'vw');
            this.createChart();
        }

        this.leftYScale = d3
            .scaleLinear()
            .domain([0, this.totalNumerOfParticipants])
            .nice()
            .rangeRound([this.svgHeight - this.margin, this.margin]);

        this.rightYScale = d3
            .scaleLinear()
            .domain([0, this.maxScore])
            .nice()
            .rangeRound([this.svgHeight - this.margin, this.margin]);
    }

    /**
     * Defines all the three axes, formats them on a proper way and
     * calls the service 'callAxes' to attach them to this component
     * Calls the services 'createXAxesTitle' and 'createYAxesTitle' to
     * attach title to the axes
     */
    private createAxes(): void {
        const xAxes: d3.Axis<string> = d3.axisBottom(
            d3
                .scaleBand()
                .domain(this.trainingInstanceStatistics.map((instance) => `Training ${instance.instanceId}`))
                .range([0, this.chartSvgWidth])
                .padding(0.4)
        );
        const leftYAxes: d3.Axis<number | { valueOf(): number }> = d3
            .axisLeft(this.leftYScale)
            .tickValues(this.getTickValues(this.totalNumerOfParticipants))
            .tickFormat(d3.format('.0f'));
        const rightYAxes: d3.Axis<
            | number
            | {
            valueOf(): number;
        }
        > = d3.axisRight(this.rightYScale).tickValues(this.getTickValues(this.maxScore)).tickFormat(d3.format('.0f'));

        // todo: causing NaN possibly because of the scales
        this.axesCreationService.callAxes(
            '#combinedDiagramChartSvg',
            '#leftAxisSvg',
            xAxes,
            leftYAxes,
            `0, ${this.svgHeight - this.margin}`,
            `${0.98 * this.leftAxisSvgWidth}, 0`,
            this.axesCreationService.getAxisFontSize('#combinedDiagramPlaceholder'),
            '#rightAxisSvg',
            rightYAxes
        );

        this.axesCreationService.createXAxesTitle(
            '#combinedDiagramChartSvg',
            this.chartSvgWidth / 2,
            this.svgHeight,
            'Training events',
            this.axesCreationService.getAxisTitleFontSize('#combinedDiagramPlaceholder'),
            'middle'
        );
        this.axesCreationService.createYAxesTitle(
            '#leftAxisSvg',
            -this.margin,
            this.margin / 2,
            'Number of participants',
            this.axesCreationService.getAxisTitleFontSize('#combinedDiagramPlaceholder')
        );
        this.axesCreationService.createYAxesTitle(
            '#rightAxisSvg',
            -this.margin,
            this.rightAxisSvgWidth,
            'Gained score',
            this.axesCreationService.getAxisTitleFontSize('#combinedDiagramPlaceholder')
        );
    }

    /**
     * Helps to synchronize the values of the left and right y axes
     * Specifies the tick values that should be visualized on the axis
     * (The automatic determination of the tick values cannot ensure
     * that the selected values would be placed on the same height)
     * @param maxValue - specifies the top of the range from which the
     *                   tick values should be selected (min = 0)
     */
    private getTickValues(maxValue: number): number[] {
        const ticks = 5;
        const shift: number = Math.round(maxValue / ticks);
        return [0, shift, 2 * shift, 3 * shift, 4 * shift, 5 * shift];
    }

    /**
     * Creates the bars, which are representing the number of participants
     * on the individual training instances based on 'trainingStatistics' data
     * Adds ID '"participants_" + i' to each bar, that enables to get the appropriate
     * training instance in case a bar is selected
     * Attaches functions 'handleMouseOver' and 'handleMouseOut'
     */
    private createBars(): void {
        d3.select('#combinedDiagramChartSvg')
            .selectAll('rect')
            .data(this.trainingInstanceStatistics)
            .enter()
            .append('rect')
            .attr('class', 'bars')
            .attr('id', (d: TrainingInstanceStatistics, i: number) => 'participants_' + i)
            .attr('x', (d: TrainingInstanceStatistics) => this.xScale(String(d.instanceId)))
            .attr('y', (d: TrainingInstanceStatistics) =>
                Number.isNaN(this.leftYScale(d.participants.length)) ? 0 : this.leftYScale(d.participants.length)
            )
            .attr('height', (d: TrainingInstanceStatistics) => {
                const leftYScaleValue = Number.isNaN(this.leftYScale(d.participants.length))
                    ? 0
                    : this.leftYScale(0) - this.leftYScale(d.participants.length);
                return leftYScaleValue;
            })
            .attr('width', this.xScale.bandwidth())
            .attr('fill', this.colors[0])
            .attr('pointer-events', 'all')
            .style('cursor', 'pointer')
            .on('mouseover', () => this.handleMouseOver(<MouseEvent>event))
            .on('mouseout', () => this.handleMouseOut());
    }

    /**
     * First, calls 'attachLineChart' to create the line chart
     * representing the average values (it has to be in the background)
     * Then adds the circles that are marking the average scores for the
     * individual trainings (they are classed as 'averageCircle')
     * Adds ID '"average_" + i' to each circle, that enables to get the appropriate
     * training instance in case the user hovers over it
     * Finally, tests if more than 1 circle has been drawn - if yes, circles should
     * not be visible (only the line); otherwise it should be visible as for one
     * point no line can be drawn
     */
    private createAverageCircles(): void {
        this.attachLineChart('average', this.colors[1]);

        d3.select('#combinedDiagramChartSvg')
            .selectAll('.averageCircle')
            .data(this.trainingInstanceStatistics)
            .enter()
            .append('circle')
            .attr('class', 'averageCircle')
            .attr('id', (d: TrainingInstanceStatistics, i: number) => 'average_' + i)
            .attr(
                'cx',
                (d: TrainingInstanceStatistics) => this.xScale(String(d.instanceId)) + this.xScale.bandwidth() / 2
            )
            .attr('cy', (d: TrainingInstanceStatistics) =>
                Number.isNaN(this.rightYScale(d.averageScore)) ? 0 : this.rightYScale(d.averageScore)
            )
            .attr('r', '1%')
            .attr('fill', this.colors[1])
            .attr('stroke', this.colors[1])
            .attr('stroke-width', 0)
            .style('cursor', 'pointer')
            .on('mouseover', () => this.handleMouseOver(<MouseEvent>event))
            .on('mouseout', () => this.handleMouseOut());

        if (this.trainingInstanceStatistics.length > 1) {
            d3.selectAll('.averageCircle').style('opacity', 0);
        } else {
            d3.selectAll('.averageCircle').style('opacity', 1);
        }
    }

    /**
     * Creates the points representing the median scores gained on the trainings
     * Works on a similar way as the function  'createAverageCircles', only the
     * parameters of the circles are different (coordinate, color...)
     * All the circles are classed as 'medianCircle' and ID '"median_" + i' is used
     */
    private createMedianCircles(): void {
        this.attachLineChart('median', this.colors[2]);

        d3.select('#combinedDiagramChartSvg')
            .selectAll('.medianCircle')
            .data(this.trainingInstanceStatistics)
            .enter()
            .append('circle')
            .attr('class', 'medianCircle')
            .attr('id', (d: TrainingInstanceStatistics, i: number) => 'median_' + i)
            .attr(
                'cx',
                (d: TrainingInstanceStatistics) => this.xScale(String(d.instanceId)) + this.xScale.bandwidth() / 2
            )
            .attr('cy', (d: TrainingInstanceStatistics) =>
                Number.isNaN(this.rightYScale(d.medianScore)) ? 0 : this.rightYScale(d.medianScore)
            )
            .attr('r', '1%')
            .attr('fill', this.colors[2])
            .attr('stroke', this.colors[2])
            .attr('stroke-width', 0)
            .style('opacity', 0)
            .style('cursor', 'pointer')
            .on('mouseover', () => this.handleMouseOver(<MouseEvent>event))
            .on('mouseout', () => this.handleMouseOut());

        if (this.trainingInstanceStatistics.length > 1) {
            d3.selectAll('.medianCircle').style('opacity', 0);
        } else {
            d3.selectAll('.medianCircle').style('opacity', 1);
        }
    }

    /**
     * Creates the line chart which is representing either the average
     * or the median of gained scores
     * @param type - marks the current data type: 'average' or 'median'
     * @param color - represents the color of the line
     */
    private attachLineChart(type: string, color: string): void {
        const xScale: d3.ScaleBand<string> = this.xScale;
        const yScale: d3.ScaleLinear<number, number> = this.rightYScale;
        const line: d3.Line<any> = d3
            .line<any>()
            .x((d: any) => xScale(String(d.instanceId)) + xScale.bandwidth() / 2)
            .y((d: any) => {
                const y = type === 'average' ? yScale(d.averageScore) : yScale(d.medianScore);
                return Number.isNaN(y) ? 0 : y;
            });

        d3.select('#combinedDiagramChartSvg')
            .append('path')
            .attr('class', 'line')
            .attr('d', line(this.trainingInstanceStatistics))
            .attr('stroke', color)
            .attr('stroke-width', 2)
            .attr('fill', 'none')
            .attr('pointer-events', 'none');
    }

    /**
     * Handles mouseover events
     * Adds a tooltip representing the corresponding information
     * If the currently selected element is a circle, sets its opacity to 1
     * Gets the ID of the selected element, that indicates the training
     * instance to which the data belongs to
     * Calls 'highlightDataForTraining' method of barchart and scatterplot
     * to interact with these components
     * @param event - mouseover event
     */
    private handleMouseOver(event: MouseEvent): void {
        const id: string = (<HTMLElement>event.target).id;
        d3.select('#' + id).style('opacity', 1);
        this.addTooltip(id, event.clientX, event.clientY);

        const index: string = id.split('_').pop();

        this.highlightInstance.emit([this.trainingInstanceStatistics[index].instanceId]);
    }

    /**
     * Attaches a tooltip to the component
     * Gets/calculates all the parameters required to create a tooltip
     * (e.g. coordinates, width, height, text, font size...)
     * Calls the appropriate services to attach the rectangle and the text
     * @param id - id of the training instance for which data should be shown
     * @param mouseX - current x coordinate of the mouse
     * @param mouseY - current y coordinate of the mouse
     */
    private addTooltip(id: string, mouseX: number, mouseY: number): void {
        const text: string[] = this.getTooltipText(id);
        const fontSize: number = this.tooltipCreationService.getTooltipFontSize('#combinedDiagramPlaceholder');
        // Width of the tooltip depends on the longest row
        // of the text that has to be visualized
        const width: number = 0.5 * fontSize * Math.max(...text.map((word) => word.length));
        const height: number = text.length * 1.5 * fontSize;
        // Transforms the window coordinates into svg canvas coordinates
        const coordinates: {
            x: number;
            y: number;
        } = this.svgConfigurationService.convertScreenCoordToSvgCoord('combinedDiagramChartSvg', mouseX, mouseY);
        // Forms the coordinates, so that the whole tooltip fits to the canvas
        const x = coordinates.x > this.chartSvgWidth / 2 ? coordinates.x - width - 10 : coordinates.x + 10;
        const y = coordinates.y > this.svgHeight / 2 ? coordinates.y - height - 10 : coordinates.y + 10;
        const yShift: number = height / (text.length + 1);

        this.tooltipCreationService.createTooltipRect(
            '#combinedDiagramChartSvg',
            'combinedDiagramTooltip',
            x,
            y,
            width,
            height,
            this.tooltipColors[0]
        );
        this.tooltipCreationService.addTooltipText(
            '#combinedDiagramChartSvg',
            'combinedDiagramTooltip',
            x + width / 2,
            y + yShift,
            this.tooltipCreationService.getTooltipFontSize('#combinedDiagramPlaceholder'),
            text,
            [0, 1.5 * yShift, yShift],
            this.tooltipColors[1]
        );
    }

    /**
     * Gets all the required information to create the text for the tooltip
     * Based on the elements ID determins the ID of the selected training instances,
     * and the type of data (median, average, participants) that should be visualized
     * Gets the statistics about the training and complies the text to required format
     * @param id - ID of the selected element
     */
    private getTooltipText(id: string): string[] {
        const index: string = id.split('_').pop();
        const dataType: string = id.split('_')[0];
        const trainingData: TrainingInstanceStatistics = this.trainingInstanceStatistics[index];

        const tooltipText: string[] = ['Training ' + trainingData.instanceId + '\xa0\xa0\xa0' + trainingData.date];
        if (dataType === 'participants') {
            tooltipText.push('number of');
            tooltipText.push('participants: ' + trainingData.participants.length);
        } else {
            if (trainingData.averageScore === trainingData.medianScore) {
                tooltipText.push('average & median score: ');
                tooltipText.push(trainingData.averageScore + ' points');
            } else {
                if (id.split('_')[0] === 'average') {
                    tooltipText.push('average score: ');
                    tooltipText.push(trainingData.averageScore + ' points');
                } else {
                    tooltipText.push('median score: ');
                    tooltipText.push(trainingData.medianScore + ' points');
                }
            }
        }
        return tooltipText;
    }

    /**
     * Handles mouseout events
     * Resets the default setting of the component and hides the tooltip
     * Calls method 'undoHighlightData' of barchart and scatterplot
     * components to reset them, too
     */
    private handleMouseOut(): void {
        // If more then one training is visualized, only the line chart should be
        // shown, circles should be hidden
        if (this.trainingInstanceStatistics.length > 1) {
            d3.select('#combinedDiagramPlaceholder').selectAll('circle').style('opacity', 0);
        }
        d3.select('#combinedDiagramPlaceholder').selectAll('.combinedDiagramTooltip').remove();

        this.highlightInstance.emit(null);
    }

    /**
     * Calls the appropriate service to attach legend texts
     * Then calls 'createLegendRect' methods to create
     * the corresponding rectangles
     */
    private createLegend(): void {
        const fontSize: number = this.legendCreationService.getLegendFontSize('#combinedDiagramPlaceholder');
        this.legendCreationService.addLegendText(
            '#combinedDiagramLegendSvg',
            'legend',
            0.2 * this.legendSvgWidth,
            0.1 * this.svgHeight + fontSize,
            fontSize,
            '#000000',
            ['Number of participants', 'Average gained score', 'Median of gained score'],
            [0, 0, 0],
            [0, 2.5 * fontSize, 2.5 * fontSize],
            'left'
        );
        // Creates a marker for the bars (it is represented by a square)
        this.legendCreationService.createLegendRect(
            '#combinedDiagramLegendSvg',
            'legend',
            [this.colors[0]],
            0.07 * this.legendSvgWidth,
            [0.1 * this.svgHeight],
            0.08 * this.legendSvgWidth,
            0.08 * this.legendSvgWidth,
            [1]
        );
        // Creates markers for the lines (they are represented
        // by flatter rectangles than the bars)
        this.legendCreationService.createLegendRect(
            '#combinedDiagramLegendSvg',
            'legend',
            [this.colors[1], this.colors[2]],
            0.07 * this.legendSvgWidth,
            [0.12 * this.svgHeight + 2.5 * fontSize, 0.12 * this.svgHeight + 5 * fontSize],
            0.08 * this.legendSvgWidth,
            0.01 * this.legendSvgWidth,
            [1, 1]
        );
    }
}
