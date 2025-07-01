import {
    ChangeDetectionStrategy,
    Component,
    EventEmitter,
    Input,
    OnChanges,
    Output,
    SimpleChanges,
} from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { SentinelStepper, StepperStateChange, StepStateEnum } from '@sentinel/components/stepper';
import { LevelStepperAdapter } from '@crczp/training-agenda/internal';
import { LevelMoveEvent } from '../../../model/events/level-move-event';

/**
 * Stepper component for navigation between training definition levels
 */
@Component({
    selector: 'crczp-levels-stepper',
    templateUrl: './training-level-stepper.component.html',
    styleUrls: ['./training-level-stepper.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TrainingLevelStepperComponent implements OnChanges {
    @Input() levels: LevelStepperAdapter[];
    @Input() movingInProgress: boolean;
    @Input() activeStep: number;
    @Output() activeStepChange: EventEmitter<number> = new EventEmitter();
    @Output() levelMove: EventEmitter<LevelMoveEvent> = new EventEmitter();
    @Output() initialLevels: EventEmitter<LevelStepperAdapter[]> = new EventEmitter();

    levelStepper: SentinelStepper<LevelStepperAdapter> = { items: [] };

    private previousActiveStep = -1;

    constructor(public dialog: MatDialog) {}

    ngOnChanges(changes: SimpleChanges): void {
        if ('levels' in changes) {
            this.levelStepper.items = this.levels;
        }
        this.changeSelectedStep(this.activeStep);
    }

    /**
     * Passes active step change event to parent component
     * @param activeStep index of active (selected) level
     */
    activeStepChanged(activeStep: number): void {
        this.activeStepChange.emit(activeStep);
    }

    /**
     * Wraps stepper state change event to level move event and emits it to parent component
     * @param event state of the stepper
     */
    swapLevels(event: StepperStateChange): void {
        this.levelMove.emit(new LevelMoveEvent(event));
    }

    private changeSelectedStep(index: number) {
        if (this.previousActiveStep >= 0 && this.previousActiveStep < this.levelStepper.items.length) {
            this.levelStepper.items[this.previousActiveStep].state = StepStateEnum.SELECTABLE;
        }
        this.levelStepper.items[index].state = StepStateEnum.ACTIVE;
        this.previousActiveStep = this.activeStep;
    }
}
