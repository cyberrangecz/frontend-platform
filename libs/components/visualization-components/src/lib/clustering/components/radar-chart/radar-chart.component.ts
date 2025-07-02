import { Component, Input, OnChanges, OnInit, ViewEncapsulation, inject } from '@angular/core';
import {D3, D3Service} from '../../../common/d3-service/d3-service';
import {ClusteringConfig, VIS_CONFIG} from '../../clustering-config';
import {ClusteringVisualizationData, EuclideanDoublePoint} from '@crczp/visualization-model';
import {ClusteringRenderBaseConfig} from '../../clustering-render-base-config';

@Component({
    selector: 'crczp-viz-clustering-radar-chart',
    templateUrl: './radar-chart.component.html',
    styleUrls: ['./radar-chart.component.css'],
    encapsulation: ViewEncapsulation.None
})
export class RadarChartComponent implements OnChanges, OnInit {
    private config = inject(ClusteringConfig);

    @Input() visualizationData: ClusteringVisualizationData;
    @Input() isStandalone: boolean;
    @Input() numOfClusters: number;
    public info: string;
    public errorMessage: string = null;
    public showInfo: boolean;
    public numberOfParticipants: number;
    private readonly d3: D3;
    private radialScale;
    private smallScale;
    private chartArea;
    private features: string[];
    private featureTooltips: string[];
    private svg: any;
    private smallSvgs: any[] = [];
    private gPlot: any;
    private wrapperWidth: number;
    private wrapperHeight: number;
    private width = 450;
    private height = 400;
    private tooltip: any;
    private globalMin: number = Number.MAX_VALUE;

    constructor() {
        const d3Service = inject(D3Service);
        const config = this.config;

        this.d3 = d3Service.getD3();
        this.radialScale = this.d3.scaleLinear()
            .domain(config.radialScaleDomain || VIS_CONFIG.radialScaleDomain)
            .range(config.radialScaleRange || VIS_CONFIG.radialScaleRange);
        this.smallScale = this.d3.scaleLinear()
            .domain(config.radialScaleDomain || VIS_CONFIG.radialScaleDomain)
            .range([0, 62]);
        this.features = this.config.features || VIS_CONFIG.features;
        this.featureTooltips = this.config.featureTooltips || VIS_CONFIG.featureTooltips;
        this.drawChartBase({
            element: 'main-radar',
            padding: {
                top: 10,
                bottom: 40
            }
        });
    }

    ngOnInit(): void {
        if (this.visualizationData != undefined) this.setBounds();
        this.info =
            'The chart displays overview of trainee groups and their playing behavior. ' +
            'In the small radar charts, >n< denotes the number of trainees whose playing styles' +
            ' were similar. In this testing GUI, you can choose desired datasets with the input fields below.';
    }

    ngOnChanges(): void {
        if (this.visualizationData != undefined) {
            this.numberOfParticipants = this.getNumParticipants();
            this.normalizeData(); //does not scale the chart too well..
            this.drawChart();
        }
    }

    getNumParticipants(): number {
        return this.visualizationData.radarData.reduce((acc, cluster) => acc + cluster.points.length, 0);
    }

    setBounds() {
        if (this.visualizationData == undefined) return;
        let min = Number.MAX_VALUE;
        let max = Number.MIN_VALUE;
        const radarData = this.visualizationData.radarData;

        radarData.forEach(function(d) {
            min = Math.min(Math.min(...d.center), min);
            max = Math.max(Math.max(...d.center), max);
        });

        /*this.radialScale = this.d3.scaleLinear()
            .domain([min, max])
            .range(this.appConfig.radialScaleRange);

        this.smallScale = this.d3.scaleLinear()
            .domain([min, max])
            .range([0, 62]);*/
    }

    // normalize to fit the chart
    normalizeData() {
        let min = Number.MAX_VALUE;
        let max = Number.MIN_VALUE;
        const radarData = this.visualizationData.radarData;

        radarData.forEach(function(d) {
            min = Math.min(Math.min(...d.center), min);
            max = Math.max(Math.max(...d.center), max);
        });

        radarData.forEach((d, i) => {
            d.center.forEach((p, j) => {
                this.visualizationData.radarData[i].center[j] = ((p - min) / (max - min)) * 5 - 1;
            });
        });
    }

    drawChart(): void {
        this.clearSelection('#radar-chart');
        this.clearSelection('#small-radar-charts');
        this.createTooltip();
        this.createChart();
        this.createSmallCharts();
    }

    createSmallCharts(data: EuclideanDoublePoint[] = this.visualizationData.radarData) {
        const radialScaleSmall = this.smallScale;

        data.forEach((cluster, i) => {
            const smallChartsSvg = this.d3
                .select('#small-radar-charts')
                .append('svg')
                .attr('viewBox', '090 60 200 200')
                .attr('width', 240)
                .attr('height', 200)
                .attr('preserveAspectRatio', 'xMidYMid meet');
            this.smallSvgs.push(smallChartsSvg);

            /* const clip = smallChartsSvg
              .append('defs')
              .append('SVG:clipPath')
              .attr('id', 'clip')
              .append('SVG:rect')
              .attr('width', 200)
              .attr('height', 200)
              .attr('x', 0)
              .attr('y', 0);*/

            const smallChartsClipPath = smallChartsSvg.append('g').attr('clip-path', 'url(#clip)');

            smallChartsClipPath
                .append('text')
                .text('Cluster with ' + cluster.points.length + ' trainees')
                .attr('x', 110)
                .attr('y', 80)
                .style('font-weight', '500');
            //let ticks = [-0.7, 0, 0.7, 1.4, 2.1, 2.8, 3.5, 4.2];
            const ticks = [-0.4, 0.4, 1.2, 2, 2.8, 3.6, 4.4];
            ticks.forEach((t) =>
                smallChartsClipPath
                    .append('circle')
                    .attr('cx', 190)
                    .attr('cy', 190)
                    .attr('fill', 'none')
                    .attr('stroke-width', '1.2')
                    .attr('stroke', 'lightGray')
                    .attr('r', radialScaleSmall(t))
            );

            for (let i = 0; i < this.features.length; i++) {
                const ft_name = this.features[i];
                const angle = Math.PI / 2 + (2 * Math.PI * i) / this.features.length;
                const line_coordinate = this.angleToCoordinate(angle, 4.5, radialScaleSmall);
                const label_coordinate = this.angleToCoordinate(angle, 4.2, radialScaleSmall);

                //draw axis line
                smallChartsClipPath
                    .append('line')
                    .attr('x1', 190)
                    .attr('y1', 190)
                    .attr('x2', line_coordinate.x)
                    .attr('y2', line_coordinate.y)
                    .attr('stroke-width', '0.8')
                    .attr('stroke', 'gray');

                //draw axis label
                smallChartsClipPath
                    .append('text')
                    .attr('x', label_coordinate.x)
                    .attr('y', label_coordinate.y)
                    .attr('text-anchor', 'middle')
                    .style('font-size', '14')
                    .text(ft_name);
            }

            const line = this.d3
                .line<{ x: number; y: number }>()
                .x((d) => d.x)
                .y((d) => d.y);

            const d = cluster;
            const color = this.config.colors[i] || VIS_CONFIG.colors[i];
            const coordinates = this.getPathCoordinates(d.center, radialScaleSmall);

            //draw the path element
            smallChartsClipPath
                .append('path')
                .datum(coordinates)
                .attr('d', line)
                .attr('stroke-width', 1)
                .attr('stroke', color)
                .attr('fill', color)
                .attr('stroke-opacity', 1)
                .attr('fill-opacity', 0.5);
        });
    }

    createChart(data: EuclideanDoublePoint[] = this.visualizationData.radarData) {
        const d3: D3 = this.d3,
            radarOpacity: number = this.config.radarClusterOpacity || VIS_CONFIG.radarClusterOpacity;

        this.svg = d3
            .select('#radar-chart')
            .append('svg')
            .attr('width', this.width)
            .attr('height', this.height)
            .attr('viewBox', this.width / 6 + ' ' + this.height / 6 + ' ' + this.width / 1.8 + ' ' + this.height / 1.8)
            .attr('preserveAspectRatio', 'xMidYMid meet');

        /* const clip = this.svg
          .append('defs')
          .append('SVG:clipPath')
          .attr('id', 'clip')
          .append('SVG:rect')
          .attr('width', this.width)
          .attr('height', this.height)
          .attr('x', 0)
          .attr('y', 0); */

        this.gPlot = this.svg
            .append('g')
            .attr('width', this.width)
            .attr('height', this.height)
            .attr('x', 0)
            .attr('y', 0);

        this.gPlot
            .append('text')
            .text('Dataset with ' + this.numberOfParticipants + ' trainees in total')
            .attr('x', 120)
            .attr('y', 80)
            .style('font-weight', '500')
            .style('font-size', '10px');

        // radar circles
        //let ticks = [-1, -0.5, 0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4];
        const ticks = [-0.7, 0, 0.7, 1.4, 2.1, 2.8, 3.5, 4.2];
        ticks.forEach((t) =>
            this.gPlot
                .append('circle')
                .attr('cx', 190)
                .attr('cy', 190)
                .attr('fill', 'none')
                .attr('stroke', '#919191')
                .attr('stroke-width', '0.5')
                .attr('r', this.radialScale(t))
        );

        const tooltip = this.tooltip;

        for (let i = 0; i < this.features.length; i++) {
            const ft_name = this.features[i];
            const ft_tooltip = this.featureTooltips[i];
            const angle = Math.PI / 2 + (2 * Math.PI * i) / this.features.length;
            const line_coordinate = this.angleToCoordinate(angle, 4.5, this.radialScale);
            const label_coordinate = this.angleToCoordinate(angle, 4.5, this.radialScale);

            //draw axis line
            this.gPlot
                .append('line')
                .attr('x1', 190)
                .attr('y1', 190)
                .attr('x2', line_coordinate.x)
                .attr('y2', line_coordinate.y)
                .attr('stroke-width', '0.5')
                .attr('stroke', 'gray');

            //draw axis label
            this.gPlot
                .append('text')
                .attr('id', 'label' + i)
                .attr('x', label_coordinate.x)
                .attr('y', label_coordinate.y)
                .attr('text-anchor', 'middle')
                .style('font-size', '9')
                .text(ft_name)
                .on('mouseover', function(event) {
                    const vizBox = document
                        .querySelector('#radarchartPlaceholder crczp-clustering-visualization')
                        .getBoundingClientRect();

                    tooltip.transition().ease(d3.easeLinear, 2).duration(300).delay(10).style('opacity', 0.9);
                    tooltip
                        .html(ft_tooltip)
                        .style('left', event.clientX - vizBox.x + 'px')
                        .style('top', event.clientY - vizBox.y - 20 + 'px');
                })
                .on('mousemove', function(event) {
                    const vizBox = document
                        .querySelector('#radarchartPlaceholder crczp-clustering-visualization')
                        .getBoundingClientRect();
                    tooltip
                        .style('left', event.clientX - vizBox.x + 'px')
                        .style('top', event.clientY - vizBox.y - 20 + 'px');
                })
                .on('mouseout', function() {
                    tooltip.transition().duration(0).style('opacity', 0);
                });
        }

        const line = d3
            .line<{ x: number; y: number }>()
            .x((d) => d.x)
            .y((d) => d.y);

        for (let i = 0; i < data.length; i++) {
            const d = data[i];
            const color = this.config.colors[i] || VIS_CONFIG.colors[i];
            const coordinates = this.getPathCoordinates(d.center, this.radialScale);

            //draw the path element
            this.gPlot
                .append('path')
                .datum(coordinates)
                .attr('class', 'cluster')
                .attr('d', line)
                .attr('cx', 100)
                .attr('cy', 100)
                .attr('stroke-width', 1)
                .attr('stroke', color)
                .attr('fill', color)
                .attr('stroke-opacity', 0.7)
                .attr('fill-opacity', radarOpacity);

            this.gPlot
                .selectAll('.cluster')
                .attr('id', (d, i) => 'c-' + i)
                .attr('clusterNum', (d, i) => i)
                .on('mouseover', function(event) {
                    const clusterSize = data[d3.select(this).attr('clusterNum')].points.length;
                    const vizBox = document
                        .querySelector('#radarchartPlaceholder crczp-clustering-visualization')
                        .getBoundingClientRect();
                    tooltip
                        .style('left', event.clientX - vizBox.x + 'px')
                        .style('top', event.clientY - vizBox.y - 20 + 'px')
                        .text('Cluster of ' + clusterSize + ' trainees')
                        .transition('ease')
                        .style('opacity', 1);
                    const z = 'path#' + d3.select(this).attr('id');
                    d3.selectAll('.cluster').transition('ease').style('fill-opacity', 0.1);
                    d3.select(z).transition('ease').style('fill-opacity', 0.6);
                })
                .on('mousemove', function(event) {
                    const vizBox = document
                        .querySelector('#radarchartPlaceholder crczp-clustering-visualization')
                        .getBoundingClientRect();
                    tooltip
                        .style('left', event.clientX - vizBox.x + 'px')
                        .style('top', event.clientY - vizBox.y - 20 + 'px');
                })
                .on('mouseout', function() {
                    tooltip.transition('ease').style('opacity', 0);
                    d3.selectAll('.cluster').transition('ease').style('fill-opacity', radarOpacity);
                });
        }
    }

    /**
     * A tooltip to clarify the labels
     */
    createTooltip() {
        if (typeof this.tooltip !== 'undefined') this.tooltip.remove();

        this.tooltip = this.d3
            .select('#radar-chart')
            .append('div')
            .attr('class', 'clustering-radar-tooltip')
            .style('opacity', '0');
    }

    angleToCoordinate(angle: number, value: number, radialScale: any) {
        const x = Math.cos(angle) * radialScale(value);
        const y = Math.sin(angle) * radialScale(value);
        return { x: 190 + x, y: 190 - y };
    }

    /**
     * Computes all 2D coordinates of each cluster
     * @param data_point the coordinates
     * @param radialScale scale to which coordinate adapts
     */
    getPathCoordinates(data_point: number[], radialScale: any) {
        const coordinates = [];
        // to close the path
        let lastCoordinate = {};
        for (let i = 0; i < this.features.length; i++) {
            const angle = Math.PI / 2 + (2 * Math.PI * i) / this.features.length;
            const newCoordinate = this.angleToCoordinate(angle, data_point[i], radialScale);
            lastCoordinate = i === 0 ? newCoordinate : lastCoordinate;
            coordinates.push(newCoordinate);
        }
        coordinates.push(lastCoordinate);
        return coordinates;
    }

    clear() {
        this.svg.remove();
        if (this.smallSvgs != undefined) {
            for (const svg of this.smallSvgs) {
                svg.remove();
            }
        }
    }

    drawChartBase(baseConfig: ClusteringRenderBaseConfig): void {
        const d3: D3 = this.d3,
            element = baseConfig.element;

        // create svg
        // calculate the height first, width can change when the scrollbar is added
        this.wrapperWidth = Math.max(
            document.getElementById(element)?.getBoundingClientRect().width, // original (standalone) size
            window.innerWidth - window.innerWidth * 0.37
        ); // get width in the dashboard as a 75% piece of a halfpage
        const maxHeight: number = Math.min(this.wrapperWidth * 0.7, window.innerHeight - 130);
        const minHeight = 400;
        this.wrapperHeight = Math.max(maxHeight, minHeight);

        this.chartArea = d3
            .select('#' + element)
            .attr('height', this.wrapperHeight)
            .attr('width', this.wrapperWidth)
            .attr('style', 'padding: 10px 15px');
    }

    /**
     * Clear the specified HTML when needed (e.g., resize)
     */
    clearSelection(selection: string): void {
        this.d3.select(selection).html('');
    }

    toggleInfo() {
        this.showInfo = !this.showInfo;
    }

    onResize() {
        this.drawChart();
    }
}
