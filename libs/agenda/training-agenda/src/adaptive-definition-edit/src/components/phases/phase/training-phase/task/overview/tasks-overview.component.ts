import { STEPPER_GLOBAL_OPTIONS } from '@angular/cdk/stepper';
import { ChangeDetectionStrategy, Component, DestroyRef, inject, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { SentinelControlItem } from '@sentinel/components/controls';
import { defer, Observable, of } from 'rxjs';
import { map } from 'rxjs/operators';
import { PhaseStepperAdapter } from '@crczp/training-agenda/internal';
import { PhaseEditService } from '../../../../../../services/state/phase/phase-edit.service';
import { PhaseMoveEvent } from '../../../../../../model/events/phase-move-event';
import { Task } from '@crczp/training-model';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

/**
 * Main hint edit component. Contains stepper to navigate through existing hints and controls to create new hints
 */
@Component({
    selector: 'crczp-tasks-overview',
    templateUrl: './tasks-overview.component.html',
    styleUrls: ['./tasks-overview.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    providers: [
        {
            provide: STEPPER_GLOBAL_OPTIONS,
            useValue: { showError: true },
        },
    ],
})
export class TasksOverviewComponent implements OnInit {
    stepperTasks: Observable<PhaseStepperAdapter[]>;
    controls: SentinelControlItem[];
    activeStep$: Observable<number>;
    tasksHasErrors: boolean;
    destroyRef = inject(DestroyRef);

    constructor(
        public dialog: MatDialog,
        private phaseService: PhaseEditService,
    ) {}

    ngOnInit(): void {
        this.activeStep$ = this.phaseService.activeTaskStep$;
        this.stepperTasks = this.phaseService.activeTasks$.pipe(
            map((tasks) => tasks.map((task) => new PhaseStepperAdapter(task))),
        );
        this.initControls();
    }

    onActiveTaskChanged(index: number): void {
        this.phaseService.setActiveTask(index);
    }

    onControlAction(control: SentinelControlItem): void {
        control.result$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe();
    }

    onTaskMoved(event: PhaseMoveEvent): void {
        this.phaseService.moveTasks(event.stepperState.previousIndex, event.stepperState.currentIndex);
    }

    onTaskChanged(task: Task): void {
        this.phaseService.onActiveTaskChanged(task);
    }

    private initControls() {
        this.controls = [
            new SentinelControlItem(
                'add',
                'Add',
                'primary',
                of(false),
                defer(() => this.phaseService.addTask()),
            ),
            new SentinelControlItem(
                'copy',
                'Copy',
                'accent',
                this.phaseService.activeTasks$.pipe(map((tasks) => tasks.length <= 0)),
                defer(() => this.phaseService.cloneTask()),
            ),
            new SentinelControlItem(
                'delete',
                'Delete',
                'warn',
                this.phaseService.activeTasks$.pipe(map((tasks) => tasks.length <= 0)),
                defer(() => this.phaseService.deleteTask()),
            ),
        ];
    }
}
