import { ChangeDetectionStrategy, Component, ElementRef, EventEmitter, Input, Output } from '@angular/core';
import * as d3 from 'd3';
import { UserData } from '../../../../model/user-data';
import { Event } from '../../../../model/event';
import { EventType } from '../../../../model/enums/event-type';
import { AbsolutePositionService } from '../../../../services/absolute-position.service';
import { User } from '../../../../model/user';
import { MatTooltipModule } from '@angular/material/tooltip';
import { EventConnectorComponent } from './event-connector/event-connector.component';
import { PlayerEventComponent } from './player-event/player-event.component';

@Component({
    // eslint-disable-next-line @angular-eslint/component-selector
    selector: 'g[player-training]',
    templateUrl: './player-training.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [MatTooltipModule, EventConnectorComponent,PlayerEventComponent]
})
export class PlayerTrainingComponent {
    @Input() userData!: UserData;
    @Input() isUserSelected!: boolean;
    @Input() userIndex!: number;
    @Input() axesCount!: number;
    @Input() yCoordinate!: number;
    @Input() maxYPosition!: number;
    @Output() userSelectedEvent = new EventEmitter<User>();
    @Output() tooltipShownChanged = new EventEmitter<any>();

    private g: any;

    constructor(
        element: ElementRef,
        private absolutePositionService: AbsolutePositionService,
    ) {
        this.g = d3.select(element.nativeElement);
    }

    getYCoordinate(indexOfEvent: number): number {
        return this.absolutePositionService.getYPositionOfUserEvent(this.userIndex, indexOfEvent, this.userData);
    }

    userSelected() {
        this.userSelectedEvent.emit(this.userData.user);
    }

    getEventDifference(event: Event): number {
        switch (event.type) {
            case EventType.HintTaken:
                return 1;
            case EventType.WrongAnswerSubmitted:
                return 5;
            case EventType.SolutionDisplayed:
                return 20;
            case EventType.CorrectAnswerSubmitted:
                return -10;
        }
        return 0;
    }

    triggerTooltipShownChanged(event: any) {
        this.tooltipShownChanged.emit(event);
    }

    getXCoordinate(indexOfEvent: number) {
        if (this.userData.events.length - 1 == indexOfEvent) {
            return 100; // last event show on success-rate axis
        } else {
            return this.absolutePositionService.getRelativeXPositionOfEvent(indexOfEvent, this.axesCount);
        }
    }
}
