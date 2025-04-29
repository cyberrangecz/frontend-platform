import { ChangeDetectionStrategy, Component, ElementRef, Input } from '@angular/core';
import * as d3 from 'd3';
import { WalkthroughUserData } from '@crczp/visualization-model';
import { AbsolutePositionService } from '../../service/absolute-position.service';
import { TrainingUser } from '@crczp/training-model';

@Component({
    // eslint-disable-next-line @angular-eslint/component-selector
    selector: 'g[players-trainings]',
    templateUrl: './players-trainings.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlayersTrainingsComponent {
    @Input() usersData!: WalkthroughUserData[];
    @Input() margin!: any;

    private g: any;
    private selectedUser!: TrainingUser;
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

    isUserSelected(userData: WalkthroughUserData): boolean {
        return this.selectedUser === userData.user;
    }

    setUserSelected(userData: WalkthroughUserData) {
        this.selectedUser = userData.user;
    }

    // because of absence of z-index in SVG, we must draw tooltip at the end. We have to draw it here.
    tooltipShownChanged(event: any): void {
        this.tooltip = event;
    }
}
