import {
    ChangeDetectionStrategy,
    ChangeDetectorRef,
    Component,
    computed,
    effect,
    inject,
    Injector,
    input,
    output,
    untracked,
    viewChild,
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

    protected readonly stepperStructure = computed(() =>
        this.levels()
            .map(({ id, icon }) => `${id}\u0000${icon}`)
            .join('\u0001'),
    );

    /**
     * Stepper model holding the current levels. The stepper reads its model once, so the model is
     * a new object only when the ids, icons or order of the levels change; a new level list of the
     * same structure is swapped into the existing model.
     */
    protected readonly levelStepper = computed<
        SentinelStepper<LevelStepperAdapter>
    >(() => {
        this.stepperStructure();
        return { items: [...untracked(this.levels)] };
    });

    private readonly stepperInjector = viewChild(SentinelStepperComponent, {
        read: Injector,
    });

    constructor() {
        effect(() => {
            const activeStep = this.activeStep();
            const { items } = this.levelStepper();
            items.splice(0, items.length, ...this.levels());
            items.forEach((item, index) => {
                item.state =
                    index === activeStep
                        ? StepStateEnum.ACTIVE
                        : StepStateEnum.SELECTABLE;
            });
            this.stepperInjector()?.get(ChangeDetectorRef).markForCheck();
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
