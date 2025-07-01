import {STEPPER_GLOBAL_OPTIONS} from '@angular/cdk/stepper';
import {ChangeDetectionStrategy, Component, Input, OnChanges, OnInit, SimpleChanges} from '@angular/core';
import {MatDialog} from '@angular/material/dialog';
import {SentinelControlItem} from '@sentinel/components/controls';
import {MatDivider} from "@angular/material/divider";
import {
    MatExpansionPanel,
    MatExpansionPanelDescription,
    MatExpansionPanelHeader,
    MatExpansionPanelTitle
} from "@angular/material/expansion";
import {TaskStepperComponent} from "../stepper/task-stepper.component";
import {TaskEditComponent} from "../detail/task-edit.component";
import {NgIf} from "@angular/common";
import {PhaseStepperAdapter} from "../../../../../../model/adapters/phase-stepper-adapter";
import {Phase} from "@crczp/training-model";

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
            useValue: {showError: true},
        },
    ],
    imports: [
        MatDivider,
        MatExpansionPanelDescription,
        MatExpansionPanelTitle,
        MatExpansionPanelHeader,
        MatExpansionPanel,
        TaskStepperComponent,
        TaskEditComponent,
        NgIf
    ]
})
export class TasksOverviewComponent implements OnInit, OnChanges {
    @Input() tasks: Phase[];

    stepperTasks: PhaseStepperAdapter[];
    controls: SentinelControlItem[];
    activeStep: number;

    constructor(public dialog: MatDialog) {
    }

    ngOnInit(): void {
        this.update();
    }

    ngOnChanges(changes: SimpleChanges) {
        if ('tasks' in changes && !changes['tasks'].isFirstChange()) {
            this.update();
        }
    }

    onActiveTaskChanged(index: number): void {
        this.activeStep = index;
    }

    private update(): void {
        this.activeStep = 0;
        this.stepperTasks = this.tasks.map((task) => new PhaseStepperAdapter(task));
    }
}
