import { ChangeDetectionStrategy, Component, ElementRef, Input, inject } from '@angular/core';
import * as d3 from 'd3';
import {AbsolutePositionService} from '../../service/absolute-position.service';
import {SuccessAxisComponent} from './success-axis/success-axis.component';
import {YAxisComponent} from './y-axis/y-axis.component';

import {WalkthroughUserData} from '@crczp/visualization-model';

@Component({
    // eslint-disable-next-line @angular-eslint/component-selector
    selector: 'g[chart-axes]',
    templateUrl: './chart-axes.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [SuccessAxisComponent, YAxisComponent]
})
export class ChartAxesComponent {
    absolutePositionService = inject(AbsolutePositionService);

    @Input() usersData!: WalkthroughUserData[];

    private g: any;

    constructor() {
        const element = inject(ElementRef);

        this.g = d3.select(element.nativeElement);
    }

    getAxesCount(): number {
        return Math.max(...this.usersData.map((value) => value.events.length));
    }
}
