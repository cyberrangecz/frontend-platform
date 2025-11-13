import { ChangeDetectionStrategy, Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { AccessTrainingRunInfo, Level, Phase } from '@crczp/training-model';
import { take } from 'rxjs/operators';
import { LevelStepperAdapter } from '@crczp/training-agenda/internal';
import { TrainingRunStepper } from '../model/training-run-stepper';
import { SentinelUser } from '@sentinel/layout';
import { SentinelAuthService } from '@sentinel/auth';
import { RunningTrainingRunService } from '../services/training-run/running-training-run.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AbstractLevelComponent } from './level/abstract-level.component';
import { SentinelStepperComponent } from '@sentinel/components/stepper';
import { AsyncPipe } from '@angular/common';
import {
    TrainingRunLevelsDeactivateGuard
} from '../services/can-deactivate/training-run-levels-can-deactivate.service';
import { ActivatedRoute } from '@angular/router';

@Component({
    selector: 'crczp-training-run-detail',
    templateUrl: './training-run-detail.component.html',
    styleUrls: ['./training-run-detail.component.css'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [AbstractLevelComponent, SentinelStepperComponent, AsyncPipe],
    providers: [
        TrainingRunLevelsDeactivateGuard,
        {
            provide: RunningTrainingRunService,
            useClass: RunningTrainingRunService,
        },
    ],
})
/**
 * Main component of trainees training. Displays window with current level of a training and navigation to the next.
 * Optionally displays stepper with progress of the training and timer counting time from the start of a training.
 */
export class TrainingRunDetailComponent implements OnInit {
    readonly user = signal<SentinelUser>(undefined);
    readonly activeLevel = signal<Level | Phase>(undefined);
    readonly displayedLevel = signal<Level | Phase>(undefined);
    readonly isCurrentLevelAnswered = signal<boolean>(false);

    readonly stepper = signal<TrainingRunStepper>(undefined);
    readonly startTime = signal<Date>(undefined);
    readonly sandboxInstanceId = signal<string>(undefined);
    readonly sandboxDefinitionId = signal<number>(undefined);

    readonly levels = signal<(Level | Phase)[]>([]);
    readonly isStepperDisplayed = signal(false);
    readonly isLast = signal(false);
    readonly localEnvironment = signal(false);
    readonly backwardMode = signal(false);

    destroyRef = inject(DestroyRef);
    private trainingRunService = inject(RunningTrainingRunService);
    private auth = inject(SentinelAuthService);
    private activeRoute = inject(ActivatedRoute);

    ngOnInit(): void {
        this.activeRoute.data
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe((data) => {
                if (this.trainingRunService.isInitialized) {
                    return;
                }
                this.trainingRunService.updateRunInfo(
                    data[AccessTrainingRunInfo.name],
                );
            });

        this.auth.activeUser$
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe((user) => this.user.set(user));

        this.trainingRunService.runInfo$
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe((info) => {
                this.levels.set(info.levels);
                this.isStepperDisplayed.set(info.levels.length > 1);
                this.startTime.set(info.startTime);
                this.sandboxInstanceId.set(info.sandboxInstanceId);
                this.sandboxDefinitionId.set(info.sandboxDefinitionId);
                this.localEnvironment.set(
                    info.sandboxDefinitionId && !info.sandboxInstanceId,
                );
                this.backwardMode.set(info.backwardMode);
                this.activeLevel.set(info.currentLevel);
                this.isCurrentLevelAnswered.set(info.isLevelAnswered);
            });

        this.registerStepperBarBuilder();
    }

    registerStepperBarBuilder(): void {
        this.trainingRunService.activeLevelPosition$
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe((position) => {
                if (this.isStepperDisplayed()) {
                    const stepperAdapterLevels = this.levels().map(
                        (level) => new LevelStepperAdapter(level),
                    );
                    this.stepper.set(
                        new TrainingRunStepper(stepperAdapterLevels, position),
                    );
                }
            });
    }

    /**
     * Jump to training run level.
     * @param index of desired level
     */
    activeStepChanged(index: number): void {
        if (
            this.stepper().activeLevelIndex !== index &&
            index >= 0 &&
            index < this.levels().length
        ) {
            this.displayedLevel.set(this.levels()[index]);
            this.stepper().onActiveLevelUpdated(index);
        }
    }

    next(): void {
        this.trainingRunService.next().pipe(take(1)).subscribe();
    }
}
