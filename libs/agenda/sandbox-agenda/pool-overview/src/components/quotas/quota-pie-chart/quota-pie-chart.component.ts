import { ChartData } from 'libs/agenda/sandbox-agenda/pool-overview/src/model/chart-data';
import { AfterViewInit, ChangeDetectionStrategy, Component, ElementRef, Input, ViewChild } from '@angular/core';
import * as d3 from 'd3';
import { Quota } from '@crczp/sandbox-model';

@Component({
    selector: 'crczp-quota-pie-chart',
    templateUrl: './quota-pie-chart.component.html',
    styleUrls: ['./quota-pie-chart.component.css'],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QuotaPieChartComponent implements AfterViewInit {
    @ViewChild('containerPieChart') element: ElementRef;

    @Input() quota: Quota;
    @Input() quotaColor: string;

    private width: number;
    private height: number;
    private margin: number;
    private radius: number;
    private svg;

    private data: ChartData;

    ngAfterViewInit(): void {
        this.setup();
        this.buildSvg();
        this.buildPie();
    }

    private setup(): void {
        this.height = 100;
        this.width = 100;
        this.margin = 10;
        this.radius = Math.min(this.width, this.height) / 2 - this.margin;
        this.data = this.prepareChartData();
    }

    private buildSvg(): void {
        this.svg = d3
            .select(this.element.nativeElement)
            .append('svg')
            .attr('width', this.width)
            .attr('height', this.height)
            .append('g')
            .attr('transform', 'translate(' + this.width / 2 + ',' + this.height / 2 + ')');
    }

    private buildPie(): void {
        const g = this.svg.append('g');

        const pie = d3.pie().sort(null);

        const colorScale = d3.scaleOrdinal().domain(Object.values(this.data)).range([this.quotaColor, '#DDDDDD']);

        const arc = d3.arc().innerRadius(0).outerRadius(this.radius);

        const arcs = g
            .selectAll('arc')
            .data(pie(Object.values(this.data)))
            .enter()
            .append('g');

        arcs.append('path')
            .attr('fill', (d) => colorScale(d.data))
            .attr('d', arc);
    }

    private prepareChartData(): ChartData {
        return new ChartData(this.quota.inUse, this.quota.limit - this.quota.inUse);
    }
}
