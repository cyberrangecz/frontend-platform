import { Component, EventEmitter, Input, OnChanges, OnInit, Output } from '@angular/core';
import { v4 as uuid } from 'uuid';
import { D3, D3Service } from '../../../common/d3-service/d3-service';
import { ClusteringConfig, VIS_CONFIG } from '../../clustering-config';

@Component({
    selector: 'crczp-viz-clustering-line-chart',
    templateUrl: './line-chart.component.html',
    styleUrls: ['./line-chart.component.css'],
})
export class LineChartComponent implements OnChanges, OnInit {
    @Input() visualizationData: number[] = [];
    @Input() elbowNumClusters: number;
    @Input() includeInButtonToggle = false;

    @Output() viewOpen: EventEmitter<boolean> = new EventEmitter();
    @Output() insufficientData: EventEmitter<boolean> = new EventEmitter();

    public showChart = true;
    public buttonKeyword = 'Hide';
    public id: string = 'line-' + uuid();

    private readonly d3: D3;
    private gChart: any;
    private svg: any;
    private height = 450;
    private width = 910;
    private margin = 25;
    private x: any;
    private y: any;
    private xAxis: any;
    private yAxis: any;

    constructor(
        d3Service: D3Service,
        private config: ClusteringConfig,
    ) {
        this.d3 = d3Service.getD3();
    }

    ngOnInit(): void {
        // if we want to show the visualization as a supporting component, it only displays on demand
        if (this.includeInButtonToggle) {
            this.showChart = false;
            this.buttonKeyword = 'Show';
        }
    }

    ngOnChanges(): void {
        if (this.visualizationData != undefined) {
            this.createChart();
        }
    }

    createChart(): void {
        if (this.gChart != undefined) {
            this.clear();
        }
        if (this.checkData()) {
            this.createSvg();
            this.drawPlot();
        }
    }

    checkData() {
        const isAllNothing = this.visualizationData.every(
            (value) => value === 0 || Number.isNaN(value) || value === null,
        );
        this.insufficientData.emit(isAllNothing);
        return !isAllNothing;
    }

    private createSvg(): void {
        this.svg = this.d3
            .select('.' + this.id + ' #chartDiv')
            .append('svg')
            .attr('viewBox', '-50 0 1000 550')
            .attr('preserveAspectRatio', 'xMidYMid meet');
        this.gChart = this.svg.append('g').attr('transform', 'translate(' + this.margin + ',' + this.margin + ')');
    }

    private drawPlot(): void {
        const d3: D3 = this.d3,
            // slicing data to make sure we have a line with specified number of clusters
            data = this.visualizationData.slice(0, this.elbowNumClusters);

        // Add X axis
        this.x = d3.scaleLinear().domain([1, this.elbowNumClusters]).rangeRound([0, this.width]);
        this.xAxis = this.gChart
            .append('g')
            .attr('transform', 'translate(0,' + this.height + ')')
            .style('font-size', '15px')
            .call(d3.axisBottom(this.x).ticks(this.elbowNumClusters));
        this.gChart
            .append('text')
            .attr('transform', 'translate(' + this.width / 2 + ',' + (this.height + 2 * this.margin) + ')')
            .attr('text-anchor', 'middle')
            .text('Number of clusters');

        // Add Y axis
        this.y = d3
            .scaleLinear()
            .domain(d3.extent(data) as [number, number])
            .range([this.height, 0])
            .nice();

        this.yAxis = this.gChart.append('g').style('font-size', '15px').call(d3.axisLeft(this.y));
        this.gChart
            .append('text')
            .attr('transform', 'rotate(-90)')
            .attr('y', 0 - this.margin * 2)
            .attr('x', 0 - this.height / 2)
            .attr('text-anchor', 'middle')
            .text('Sum of squared errors');

        // add the line connecting all data points
        this.svg
            .append('path')
            .datum(data)
            .attr('fill', 'none')
            .attr('stroke', this.config.lineChartColor || VIS_CONFIG.lineChartColor)
            .attr('stroke-width', 4)
            .attr('stroke-linejoin', 'round')
            .attr('stroke-linecap', 'round')
            .attr('transform', 'translate(' + this.margin + ',' + this.margin + ')')
            .attr(
                'd',
                d3
                    .line()
                    .x((d, index) => this.x(index + 1))
                    .y((d) => this.y(d)),
            );

        // Add the dots
        this.gChart
            .selectAll('dot')
            .data(data)
            .enter()
            .append('circle')
            .attr('cx', (d: number, index: number) => this.x(index + 1))
            .attr('cy', (d: number) => this.y(d))
            .attr('r', 7)
            .style('opacity', 0.7)
            .attr('fill', this.config.lineChartColor || VIS_CONFIG.lineChartColor);
    }

    public toggleChartVisibility() {
        this.showChart = !this.showChart;
        this.buttonKeyword = this.showChart ? 'Hide' : 'Show';
        this.viewOpen.emit(this.showChart);
    }

    private clear() {
        this.svg.remove();
    }
}
