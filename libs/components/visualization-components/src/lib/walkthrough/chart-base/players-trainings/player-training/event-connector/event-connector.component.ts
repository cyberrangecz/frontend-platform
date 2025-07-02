import { ChangeDetectionStrategy, Component, ElementRef, EventEmitter, Input, OnInit, Output, inject } from '@angular/core';
import * as d3 from 'd3';
import {AbsolutePositionService} from '../../../../service/absolute-position.service';

export type TooltipEvent = {
    visible: boolean;
    x: number;
    y: number;
    commands: Array<string>;
};

@Component({
    // eslint-disable-next-line @angular-eslint/component-selector
    selector: 'g[event-connector]',
    template: '',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EventConnectorComponent implements OnInit {
    private absolutePositionService = inject(AbsolutePositionService);

    @Input() maxYPosition!: number;
    private _isSelected!: boolean;
    @Input() set isSelected(value: boolean) {
        this._isSelected = value;
        this.path?.style('stroke', this._isSelected ? 'blue' : 'var(--neutral-50)');
    }

    @Input() startX!: number;
    @Input() startY!: number;
    @Input() endX!: number;
    @Input() endY!: number;
    @Input() commands!: Array<string>;
    @Output() tooltipShownChanged = new EventEmitter<TooltipEvent>();

    private g: any;
    private path: any;
    public isTextVisible = false;

    constructor() {
        const element = inject(ElementRef);

        this.g = d3.select(element.nativeElement);
    }

    ngOnInit(): void {
        this.drawConnector();
    }

    private drawConnector() {
        const link = d3.linkHorizontal()({
            source: [this.absolutePositionService.getAbsoluteX(this.startX), this.getYPosition(this.startY)],
            target: [this.absolutePositionService.getAbsoluteX(this.endX), this.getYPosition(this.endY)],
        });
        this.path = this.g.append('path');
        this.path
            .attr('d', link)
            .attr('padding', '20px')
            .attr('stroke-width', '3pt')
            .attr('fill', 'none')
            .attr('stroke-dasharray', this.commands.length <= 0 ? '7' : 0)
            .style('stroke', 'var(--neutral-50)')
            .on('mouseover', () => {
                if (this.commands.length > 0) {
                    this.tooltipShownChanged.emit(this.getTooltipEvent(true));
                }
            })
            .on('mouseout', () => {
                this.tooltipShownChanged.emit(this.getTooltipEvent(false));
            });
    }

    private getTooltipEvent(visible: boolean): TooltipEvent {
        return {
            visible: visible,
            x: (this.startX + this.endX) / 2,
            y: (this.startY + this.endY) / 2,
            commands: this.commands,
        };
    }

    private getYPosition(y: number) {
        return y > this.maxYPosition ? this.maxYPosition : y;
    }
}
