import { AfterViewInit, Component, ElementRef, Input, ViewChild } from '@angular/core';
import * as d3 from 'd3';
import { BarData } from 'libs/agenda/sandbox-agenda/pool-overview/src/model/bar-data';
import { Quota } from '@crczp/sandbox-model';

@Component({
    selector: 'crczp-resource-bar',
    templateUrl: './resource-bar.component.html',
    styleUrls: ['./resource-bar.component.css'],
})
export class ResourceBarComponent implements AfterViewInit {
    @ViewChild('containerBar') element: ElementRef;

    @Input() quota: Quota;
    @Input() poolUsage: number;
    @Input() color: string;
    private width: number;
    private height: number;
    private svg;

    private data: BarData;

    ngAfterViewInit(): void {
        this.setup();
        this.buildSvg();
        this.buildBar();
    }

    private setup(): void {
        this.height = 12;
        const table = document.getElementsByTagName('table')[0];
        this.width = parseFloat(window.getComputedStyle(table)?.width) / 4;
        this.data = this.prepareData();
    }

    private buildSvg(): void {
        this.svg = d3
            .select(this.element.nativeElement)
            .append('svg')
            .attr('width', this.width)
            .attr('height', this.height)
            .append('g');
    }

    private buildBar() {
        const x = d3.scaleLinear().range([0, this.width]).domain([0, 100]);

        const g = this.svg.append('g');

        // used by pool
        g.append('rect')
            .attr('x', '0')
            .attr('y', '0')
            .attr('width', x(this.data.used))
            .attr('height', this.height)
            .attr('fill', this.color);

        // used overall
        g.append('rect')
            .attr('x', x(this.data.used))
            .attr('y', '0')
            .attr('width', x(this.data.usedAll))
            .attr('height', this.height)
            .attr('fill', this.color)
            .attr('opacity', 0.2);

        // unused
        g.append('rect')
            .attr('x', x(this.data.usedAll))
            .attr('y', '0')
            .attr('width', x(this.data.max))
            .attr('height', this.height)
            .attr('fill', '#ffffff');
    }

    private prepareData(): BarData {
        return new BarData(100, (this.quota.inUse / this.quota.limit) * 100, this.poolUsage);
    }
}
