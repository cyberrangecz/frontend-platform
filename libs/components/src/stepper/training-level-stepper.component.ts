import {
    ChangeDetectionStrategy,
    Component,
    computed,
    effect,
    inject,
    input,
    output,
} from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import {
    SentinelStepper,
    SentinelStepperComponent,
    StepperStateChange,
    StepStateEnum,
} from '@sentinel/components/stepper';
import { LevelStepperAdapter } from './level-stepper-adapter';
import { LevelMoveEvent } from './level-move-event';

/**
 * Stepper component for navigation between training definition levels
 */
@Component({
    selector: 'crczp-levels-stepper',
    templateUrl: './training-level-stepper.component.html',
    styleUrls: ['./training-level-stepper.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [SentinelStepperComponent],
})
export class TrainingLevelStepperComponent {
    dialog = inject(MatDialog);

    readonly levels = input.required<LevelStepperAdapter[]>();
    readonly movingInProgress = input<boolean>();
    readonly activeStep = input.required<number>();
    readonly activeStepChange = output<number>();
    readonly levelMove = output<LevelMoveEvent>();
    readonly initialLevels = output<LevelStepperAdapter[]>();

    /**
     * Stepper model holding the current levels; a new object for every new level list.
     */
    protected readonly levelStepper = computed<
        SentinelStepper<LevelStepperAdapter>
    >(() => ({ items: this.levels() }));

    constructor() {
        effect(() => {
            const activeStep = this.activeStep();
            this.levelStepper().items.forEach((item, index) => {
                item.state =
                    index === activeStep
                        ? StepStateEnum.ACTIVE
                        : StepStateEnum.SELECTABLE;
            });
        });
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
}
