import { ChangeDetectionStrategy, Component, ElementRef, Input } from '@angular/core';
import * as d3 from 'd3';
import { UserData } from '../../model/user-data';
import { PlayersTrainingsComponent } from './players-trainings/players-trainings.component';
import { ChartAxesComponent } from './chart-axes/chart-axes.component';

@Component({
    // eslint-disable-next-line @angular-eslint/component-selector
    selector: 'g[chart-base]',
    templateUrl: './chart-base.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [PlayersTrainingsComponent,ChartAxesComponent]
})
export class ChartBaseComponent {
    @Input() usersData!: UserData[];

    @Input() svgWidth!: number;
    @Input() svgHeight!: number;

    private g: any;

    constructor(element: ElementRef) {
        this.g = d3.select(element.nativeElement);
    }
}
