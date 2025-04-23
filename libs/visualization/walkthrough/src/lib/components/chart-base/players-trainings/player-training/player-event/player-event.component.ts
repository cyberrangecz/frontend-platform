import { ChangeDetectionStrategy, Component, ElementRef, Input, OnInit } from '@angular/core';
import * as d3 from 'd3';
import { Event } from '../../../../../model/event';
import { AbsolutePositionService } from '../../../../../services/absolute-position.service';

@Component({
    // eslint-disable-next-line @angular-eslint/component-selector
    selector: 'g[player-event]',
    template: '',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlayerEventComponent implements OnInit {
    @Input() xPosition!: number;
    @Input() yPosition!: number;

    @Input() maxYPosition!: number;

    @Input() userEvent!: Event;

    private _isSelected!: boolean;
    @Input() set isSelected(value: boolean) {
        this._isSelected = value;
        this.circle?.style('stroke', this._isSelected ? 'blue' : 'var(--neutral-50)');
        this.text?.style('fill', this._isSelected ? 'blue' : 'var(--neutral-50)');
    }

    private g: any;
    private circle: any;
    private text: any;

    constructor(
        element: ElementRef,
        public absolutePositionService: AbsolutePositionService,
    ) {
        this.g = d3.select(element.nativeElement);
    }

    ngOnInit(): void {
        this.circle = this.g.append('circle');
        this.circle
            .attr('cx', this.absolutePositionService.getAbsoluteX(this.xPosition))
            .attr('cy', this.getYPosition(this.yPosition))
            .attr('r', '9px')
            .style('stroke', 'var(--neutral-50)')
            .style('fill', 'var(--neutral-98)')
            .style('cursor', 'pointer')
            .style('stroke-width', 2);
        this.text = this.g.append('text');
        this.text
            .attr('x', this.absolutePositionService.getAbsoluteX(this.xPosition) + 7)
            .attr('y', this.getYPosition(this.yPosition) - 10)
            .attr('dy', '0.2em')
            .text(this.userEvent.type);
    }

    private getYPosition(y: number): number {
        return y > this.maxYPosition ? this.maxYPosition : y;
    }
}
