import { ChangeDetectionStrategy, Component, ElementRef, Input } from '@angular/core';
import * as d3 from 'd3';
import { UserData } from '../../../model/user-data';
import { AbsolutePositionService } from '../../../services/absolute-position.service';
import { User } from '../../../model/user';

@Component({
    // eslint-disable-next-line @angular-eslint/component-selector
    selector: 'g[players-trainings]',
    templateUrl: './players-trainings.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlayersTrainingsComponent {
    @Input() usersData!: UserData[];
    @Input() margin!: any;

    private g: any;
    private selectedUser!: User;
    tooltip!: any;

    constructor(
        element: ElementRef,
        public absolutePositionService: AbsolutePositionService,
    ) {
        this.g = d3.select(element.nativeElement);
    }

    getAxesCount(): number {
        return Math.max(...this.usersData.map((value) => value.events.length));
    }

    isUserSelected(userData: UserData): boolean {
        return this.selectedUser === userData.user;
    }

    setUserSelected(userData: UserData) {
        this.selectedUser = userData.user;
    }

    // because of absence of z-index in SVG, we must draw tooltip at the end. We have to draw it here.
    tooltipShownChanged(event: any): void {
        this.tooltip = event;
    }
}
