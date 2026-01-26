import {
    ChangeDetectionStrategy,
    Component,
    EventEmitter,
    inject,
    Input,
    OnChanges,
    Output,
    SimpleChanges,
} from '@angular/core';
import {
    SentinelStepper,
    SentinelStepperComponent,
    StepperStateChange,
    StepStateEnum,
} from '@sentinel/components/stepper';
import { MatDialog } from '@angular/material/dialog';
import { PhaseMoveEvent } from '../../../../../../model/events/phase-move-event';
import { PhaseStepperAdapter } from '@crczp/components';

@Component({
    selector: 'crczp-task-stepper',
    templateUrl: './task-stepper.component.html',
    styleUrls: ['./task-stepper.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [SentinelStepperComponent],
})
export class TaskStepperComponent implements OnChanges {
    dialog = inject(MatDialog);

    @Input() tasks: PhaseStepperAdapter[];
    @Input() activeStep: number;
    @Output() activeStepChange: EventEmitter<number> = new EventEmitter();
    @Output() phaseMove: EventEmitter<PhaseMoveEvent> = new EventEmitter();

    taskStepper: SentinelStepper<PhaseStepperAdapter> = { items: [] };
    private previousActiveStep = -1;

    ngOnChanges(changes: SimpleChanges): void {
        if ('tasks' in changes) {
            this.taskStepper.items = this.tasks;
        }
        this.changeSelectedStep(this.activeStep);
    }

    activeStepChanged(activeStep: number): void {
        this.activeStepChange.emit(activeStep);
    }

    swapPhases(event: StepperStateChange): void {
        this.phaseMove.emit(new PhaseMoveEvent(event));
    }

    private changeSelectedStep(index: number) {
        if (
            this.previousActiveStep >= 0 &&
            this.previousActiveStep < this.taskStepper.items.length
        ) {
            this.taskStepper.items[this.previousActiveStep].state =
                StepStateEnum.SELECTABLE;
        }
        this.taskStepper.items[index].state = StepStateEnum.ACTIVE;
        this.previousActiveStep = this.activeStep;
    }
}
