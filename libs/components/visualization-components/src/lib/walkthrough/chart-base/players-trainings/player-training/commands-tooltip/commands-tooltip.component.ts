import { ChangeDetectionStrategy, Component, ElementRef, Input } from '@angular/core';
import * as d3 from 'd3';
import { AbsolutePositionService } from '../../../../service/absolute-position.service';

@Component({
    // eslint-disable-next-line @angular-eslint/component-selector
    selector: 'g[commands-tooltip]',
    templateUrl: './commands-tooltip.component.html',
    styleUrls: ['./commands-tooltip.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CommandsTooltipComponent {
    @Input() xPosition!: number;
    @Input() yPosition!: number;

    @Input() visible = false;

    @Input() commands!: Array<string>;

    private g;

    constructor(
        element: ElementRef,
        public absolutePositionService: AbsolutePositionService,
    ) {
        this.g = d3.select(element.nativeElement);
    }

    getAbsoluteXPosition(): number {
        return this.absolutePositionService.getAbsoluteX(this.xPosition) - this.getMaxCommandSize() * 3;
    }

    private getMaxCommandSize(): number {
        let max = 0;
        this.commands.forEach((command) => (max = Math.max(max, command.length)));
        return Math.min(max, 70);
    }

    getRectWidth(): number {
        return 30 + this.getMaxCommandSize() * 8;
    }

    getRectHeight(): number {
        return 13 * this.commands.length + 20;
    }
}
