import {Component, ElementRef, inject, Input, OnInit, ViewChild} from '@angular/core';
import {AbsolutePositionService} from './service/absolute-position.service';
import {ChartBaseComponent} from './chart-base/chart-base.component';

import {WalkthroughVisualizationData} from '@crczp/visualization-model';

@Component({
    selector: 'crczp-walkthrough-visualization',
    templateUrl: './walkthrough-visualization.component.html',
    styleUrls: ['./walkthrough-visualization.component.scss'],
    imports: [
        ChartBaseComponent
    ]
})
export class WalkthroughVisualizationComponent implements OnInit {
    @Input() data!: WalkthroughVisualizationData;
    margin = {left: 80, right: 80, top: 20, bottom: 20};
    private absolutePositionService = inject(AbsolutePositionService);
    @ViewChild('chart', {static: true}) private chartContainer?: ElementRef;

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
