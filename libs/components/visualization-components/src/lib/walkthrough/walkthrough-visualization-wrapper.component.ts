import {Component, ElementRef, Input, OnInit, ViewChild} from '@angular/core';
import {AbsolutePositionService} from './service/absolute-position.service';
import {ChartBaseComponent} from './chart-base/chart-base.component';
import {CommonModule} from '@angular/common';
import {WalkthroughVisualizationData} from '@crczp/visualization-model';

@Component({
    selector: 'crczp-walkthrough-visualization-wrapper',
    templateUrl: './walkthrough-visualization-wrapper.component.html',
    styleUrls: ['./walkthrough-visualization-wrapper.component.scss'],
    imports: [
        ChartBaseComponent,
        CommonModule
    ]
})
export class WalkthroughVisualizationWrapperComponent implements OnInit {
    @Input() data!: WalkthroughVisualizationData;

    @ViewChild('chart', { static: true }) private chartContainer?: ElementRef;

    margin = { left: 80, right: 80, top: 20, bottom: 20 };

    constructor(private absolutePositionService: AbsolutePositionService) {}

    ngOnInit(): void {
        this.absolutePositionService.svgWidth = this.innerWidth();
        this.absolutePositionService.svgHeight = this.innerHeight();
        this.absolutePositionService.data = this.data;
    }

    innerWidth(): number {
        return this.chartContainer?.nativeElement.clientWidth - this.margin.left - this.margin.right;
    }

    innerHeight(): number {
        return this.chartContainer?.nativeElement.clientHeight - this.margin.top - this.margin.bottom;
    }

    getMarginTransform(): string {
        return `translate(${this.margin.left},${this.margin.top})`;
    }
}
