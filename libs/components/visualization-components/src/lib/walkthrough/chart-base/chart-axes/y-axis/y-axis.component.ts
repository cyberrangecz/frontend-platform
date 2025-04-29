import { ChangeDetectionStrategy, Component, ElementRef, Input, OnInit } from '@angular/core';
import * as d3 from 'd3';
import { AbsolutePositionService } from '../../../service/absolute-position.service';

@Component({
    // eslint-disable-next-line @angular-eslint/component-selector
    selector: 'g[y-axis]',
    template: '',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class YAxisComponent implements OnInit {
    @Input() xRelative!: number;

    private g: any;

    constructor(
        element: ElementRef,
        private absolutePositionService: AbsolutePositionService,
    ) {
        this.g = d3.select(element.nativeElement);
    }

    ngOnInit(): void {
        this.g
            .append('line')
            .attr('class', 'axis')
            .attr('x1', this.absolutePositionService.getAbsoluteX(this.xRelative))
            .attr('y1', '0%')
            .attr('x2', this.absolutePositionService.getAbsoluteX(this.xRelative))
            .attr('y2', '95%')
            .style('stroke', 'var(--neutral-50)')
            .style('stroke-dasharray', '7px')
            .style('stroke-width', 1);
    }
}
