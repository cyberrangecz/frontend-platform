import {Component, inject, Input, OnChanges, OnInit, Output} from '@angular/core';
import {Clusterables} from '@crczp/visualization-model';
import {D3, D3Service} from '../../../common/d3-service/d3-service';
import {VisualizationsDataService} from '../../services/visualizations-data.service';
import {ClusteringConfig, VIS_CONFIG} from '../../clustering-config';
import {MatCard, MatCardContent} from "@angular/material/card";
import {MatMiniFabButton} from "@angular/material/button";

@Component({
    selector: 'crczp-viz-clustering-scatter-plot',
    templateUrl: './scatter-plot.component.html',
    styleUrls: ['./scatter-plot.component.css'],
    imports: [
        MatCard,
        MatCardContent,
        MatMiniFabButton
    ]
})
export class ScatterPlotComponent implements OnChanges, OnInit {
    @Input() visualizationData: { clusterData: any[] };
    @Input() numOfClusters: number;
    @Input() isStandalone: boolean;
    @Input() selectedFeature: Clusterables = 0;
    @Output() info =
        'The chart shows a relation between two distinct groups ' +
        'of actions or behavior, helps to identify connections between them.';
    options: Map<number, boolean> = new Map();
    public chartClass: string;
    public showInfo: boolean;
    private visualizationDataService = inject(VisualizationsDataService);
    private config = inject(ClusteringConfig);
    private readonly d3: D3;
    private data: any[] = [];
    private gPlot: any;
    private margin = 60;
    private topMargin = 40;
    private width = 660;
    private height = 380;
    private svg: any;
    private x: d3.ScaleLinear<number, number>;
    private y: any;
    private xRef: any;
    private yRef: any;
    private xAxis: any;
    private yAxis: any;
    private dataPoints: any;
    private tooltip: any;

    constructor() {
        const d3Service = inject(D3Service);

        this.d3 = d3Service.getD3();
    }

    ngOnInit(): void {
        this.chartClass = 'scatter-' + this.selectedFeature;
    }

    ngOnChanges(): void {
        if (this.visualizationData != undefined) {
            this.createScatter();
        }
    }

    /**
     * A (hopefully) temporal function to **really** show normalized data (in interval <0,1>)
     */
    normalizeData() {
        let minX = Number.MAX_VALUE,
            minY = Number.MAX_VALUE;
        let maxX = Number.MIN_VALUE,
            maxY = Number.MIN_VALUE;

        let xValue: string, yValue: string;

        // find which features will be managed
        switch (this.selectedFeature) {
            case 0:
                xValue = 'wrongFlagsSubmitted';
                yValue = 'timePlayed';
                break;
            case 1:
                xValue = 'timeSpentAfterHint';
                yValue = 'wrongFlagsAfterHint';
                break;
            default:
                break;
        }

        this.visualizationData.clusterData[0].forEach(function (d) {
            const xArray = d.points.map((d) => d[xValue]);
            const yArray = d.points.map((d) => d[yValue]);

            minX = Math.min(Math.min(...xArray), minX);
            maxX = Math.max(Math.max(...xArray), maxX);
            minY = Math.min(Math.min(...yArray), minY);
            maxY = Math.max(Math.max(...yArray), maxY);
        });

        this.visualizationData.clusterData[0].forEach(function (d) {
            d.points.forEach(function (point) {
                point[xValue + 'Normalized'] = (point[xValue] - minX) / (maxX - minX);
                point[yValue + 'Normalized'] = (point[yValue] - minY) / (maxY - minY);
            });
        });
    }

    createScatter(): void {
        this.createTooltip();
        this.data = [];

        this.visualizationData.clusterData[0].forEach((cluster, index) => {
            cluster.points.forEach((point) => {
                point.clusterId = index;
                this.data.push(point);
                this.options.set(this.visualizationDataService.getOption(point, this.selectedFeature), true);
            });
        });
        this.options = new Map();
        if (this.options.size == 1) {
            this.options.clear();
        }
        if (this.gPlot != undefined) {
            this.clear();
        }

        this.normalizeData();
        this.prepareSvg();
        this.drawPlot();
    }

    createTooltip() {
        if (typeof this.tooltip !== 'undefined') this.tooltip.remove();

        this.tooltip = this.d3
            .select('.' + this.chartClass)
            .append('div')
            .attr('class', 'clustering-scatter-tooltip')
            .style('opacity', '0')
            .style('display', 'inline-block')
            .style('position', 'absolute')
            .style('padding', '5px 10px')
            .style('font-size', '10px')
            .style('opacity', '0')
            .style('background', '#5b5c5e')
            .style('color', '#fff')
            .style('border-radius', '2px')
            .style('pointer-events', 'none')
            .style('font-family', 'Roboto, sans-serif');
    }

    toggleInfo() {
        this.showInfo = !this.showInfo;
    }

    clear() {
        this.svg.remove();
    }

    private prepareSvg(): void {
        this.svg = this.d3
            .select('.' + this.chartClass)
            .append('svg')
            .attr('viewBox', '0 -20 750 500')
            .attr('preserveAspectRatio', 'xMidYMid meet');
        this.svg
            .append('rect')
            .attr('width', this.width - this.margin)
            .attr('height', this.height)
            .attr('fill', 'rgba(255,255,255,0.2)')
            .attr('x', this.margin)
            .attr('y', 0);
        this.svg
            .append('defs')
            .append('SVG:clipPath')
            .attr('id', 'clip')
            .append('SVG:rect')
            .attr('width', this.width - this.margin)
            .attr('height', this.height)
            .attr('x', this.margin)
            .attr('y', 0);
        this.gPlot = this.svg.append('g').attr('clip-path', 'url(#clip)');
    }

    private drawPlot(): void {
        const d3: D3 = this.d3;
        // Add X axis
        this.x = d3
            .scaleLinear()
            /*.domain(d3.extent(this.data.map(value =>
                  this.visualizationDataService.getX(value))) as [number, number])*/
            .domain([-0.02, 1.02])
            .range([0, this.width - this.margin]);

        this.xRef = this.x.copy();
        this.xAxis = this.svg
            .append('g')
            .attr('transform', 'translate(' + this.margin + ',' + this.height + ')')
            .call(d3.axisBottom(this.x));
        this.svg
            .append('text')
            .attr('transform', 'translate(' + this.width / 2 + ',' + (this.height + this.topMargin) + ')')
            .text(this.visualizationDataService.getXLabel(this.selectedFeature));

        // Add Y axis
        this.y = d3
            .scaleLinear()
            /*.domain(d3.extent(this.data.map(value =>
                  this.visualizationDataService.getY(value))) as [number, number])*/
            .domain([-0.03, 1.03])
            .range([this.height, 0]);

        this.yRef = this.y.copy();
        this.yAxis = this.svg
            .append('g')
            .attr('transform', 'translate(' + this.margin + ',0)')
            .call(d3.axisLeft(this.y));
        this.svg
            .append('text')
            .attr('transform', 'rotate(-90)')
            .attr('y', this.margin / 2 - 10)
            .attr('x', 0 - this.height / 2 + 10)
            .attr('text-anchor', 'middle')
            .text(this.visualizationDataService.getYLabel(this.selectedFeature));

        // Set the zoom and Pan features: how much you can zoom, on which part, and what to do when there is a zoom
        const zoom = d3
            .zoom()
            .scaleExtent([1, 30]) // This control how much you can unzoom (x0.5) and zoom (x20)
            .extent([
                [0, 0],
                [this.width, this.height],
            ])
            .translateExtent([
                [0, 0],
                [this.width, this.height],
            ])
            .on('zoom', (event) => this.updateChart(event))
            .filter((event) => event.type === 'mousedown' || (!event.button && event.ctrlKey));

        this.svg.call(zoom).on('wheel', (event) => {
            if (event.ctrlKey) {
                event.preventDefault();
            }
        });

        const tooltip = this.tooltip;

        // Add scatter
        this.dataPoints = this.gPlot
            .selectAll('dot')
            .data(this.data)
            .enter()
            .append('circle')
            .attr('cx', (d: any) => {
                const x = this.x(this.visualizationDataService.getX(d, this.selectedFeature));
                return Number.isNaN(x) ? this.margin : x + this.margin;
            })
            .attr('cy', (d: any) => this.y(this.visualizationDataService.getY(d, this.selectedFeature)))
            .attr('r', 7)
            .style('opacity', 0.5)
            .style('fill', (d: any) => this.config.colors[d.clusterId] || VIS_CONFIG.colors[d.clusterId])
            .on('mouseover', function (event, d) {
                const vizBox = document
                    .querySelector('#scatterClustersSvgPlaceholder crczp-clustering-visualization')
                    .getBoundingClientRect();

                tooltip.transition().ease(d3.easeLinear, 2).duration(300).delay(10).style('opacity', 0.9);
                tooltip
                    .html('The trainee ID: ' + d.userRefId)
                    .style('left', event.clientX - vizBox.x + 'px')
                    .style('top', event.clientY - vizBox.y - 10 + 'px');
            })
            .on('mousemove', function (event: any) {
                const vizBox = document
                    .querySelector('#scatterClustersSvgPlaceholder crczp-clustering-visualization')
                    .getBoundingClientRect();

                return tooltip
                    .style('left', event.clientX - vizBox.x + 'px')
                    .style('top', event.clientY - vizBox.y - 10 + 'px');
            })
            .on('mouseout', function () {
                tooltip.transition().duration(0).style('opacity', 0);
            });
    }

    // A function that updates the chart when the user zoom and thus new boundaries are available
    private updateChart(event: any) {
        //event.preventDefault();
        const d3: D3 = this.d3;
        // recover the new scale
        const newX = event.transform.rescaleX(this.xRef);
        const newY = event.transform.rescaleY(this.yRef);

        // update axes with these new boundaries
        this.xAxis.attr('transform', 'translate(' + this.margin + ',' + this.height + ')').call(d3.axisBottom(newX));
        this.yAxis.call(d3.axisLeft(newY));

        // update circle position
        this.gPlot
            .selectAll('circle')
            .attr('cx', (d: any) => newX(this.visualizationDataService.getX(d, this.selectedFeature)) + this.margin)
            .attr('cy', (d: any) => newY(this.visualizationDataService.getY(d, this.selectedFeature)));

        // update text position
        this.gPlot
            .selectAll('text')
            .attr('x', (d: any) => newX(this.visualizationDataService.getX(d, this.selectedFeature)))
            .attr('y', (d: any) => newY(this.visualizationDataService.getY(d, this.selectedFeature)));
    }
}
