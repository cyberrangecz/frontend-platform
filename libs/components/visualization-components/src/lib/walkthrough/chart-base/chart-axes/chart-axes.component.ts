import { ChangeDetectionStrategy, Component, ElementRef, Input } from '@angular/core';
import * as d3 from 'd3';
import { AbsolutePositionService } from '../../service/absolute-position.service';
import { SuccessAxisComponent } from './success-axis/success-axis.component';
import { YAxisComponent } from './y-axis/y-axis.component';
import { CommonModule } from '@angular/common';
import { WalkthroughUserData } from '@crczp/visualization-model';

@Component({
    // eslint-disable-next-line @angular-eslint/component-selector
    selector: 'g[chart-axes]',
    templateUrl: './chart-axes.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [SuccessAxisComponent, YAxisComponent, CommonModule]
})
export class ChartAxesComponent {
    @Input() usersData!: WalkthroughUserData[];

    private g: any;

    constructor(
        element: ElementRef,
        public absolutePositionService: AbsolutePositionService,
    ) {
        this.g = d3.select(element.nativeElement);
    }

    getAxesCount(): number {
        return Math.max(...this.usersData.map((value) => value.events.length));
    }
}
