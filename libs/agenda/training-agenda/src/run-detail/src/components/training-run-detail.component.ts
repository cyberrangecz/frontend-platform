import { AfterViewInit, ChangeDetectionStrategy, Component, DestroyRef, inject, OnInit } from '@angular/core';
import { Level } from '@crczp/training-model';
import { Observable } from 'rxjs';
import { take, tap } from 'rxjs/operators';
import { LevelStepperAdapter } from '@crczp/training-agenda/internal';
import { TrainingRunStepper } from '../model/training-run-stepper';
import { SentinelUser } from '@sentinel/layout';
import { SentinelAuthService } from '@sentinel/auth';
import { RunningTrainingRunService } from '../services/training-run/running/running-training-run.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Component({
    selector: 'crczp-training-run-detail',
    templateUrl: './training-run-detail.component.html',
    styleUrls: ['./training-run-detail.component.css'],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
/**
 * Main component of trainees training. Displays window with current level of a training and navigation to the next.
 * Optionally displays stepper with progress of the training and timer counting time from the start of a training.
 */
export class TrainingRunDetailComponent implements OnInit, AfterViewInit {
    user$: Observable<SentinelUser>;
    activeLevel$: Observable<Level>;
    backtrackedLevel$: Observable<Level>;
    isCurrentLevelAnswered$: Observable<boolean>;
    levels: Level[];
    stepper: TrainingRunStepper;

    isStepperDisplayed: boolean;
    startTime: Date;
    isLast: boolean;
    sandboxInstanceId: string;
    sandboxDefinitionId: number;
    localEnvironment: boolean;
    backwardMode: boolean;
    destroyRef = inject(DestroyRef);

    constructor(
        private trainingRunService: RunningTrainingRunService,
        private auth: SentinelAuthService,
    ) {}

    ngOnInit(): void {
        this.init();
    }

    ngAfterViewInit(): void {
        if (!this.localEnvironment) {
            this.trainingRunService.loadConsoles(this.sandboxInstanceId).pipe(take(1)).subscribe();
        }
    }

    private init() {
        this.user$ = this.auth.activeUser$;
        this.levels = this.trainingRunService.getLevels();
        this.startTime = this.trainingRunService.getStartTime();
        this.isStepperDisplayed = this.trainingRunService.getIsStepperDisplayed();
        this.sandboxInstanceId = this.trainingRunService.sandboxInstanceId;
        this.sandboxDefinitionId = this.trainingRunService.sandboxDefinitionId;
        this.localEnvironment = this.trainingRunService.localEnvironment;
        this.backwardMode = this.trainingRunService.getBackwardMode();
        this.isCurrentLevelAnswered$ = this.trainingRunService.isCurrentLevelAnswered$;
        if (this.isStepperDisplayed) {
            const stepperAdapterLevels = this.levels.map((level) => new LevelStepperAdapter(level));
            this.stepper = new TrainingRunStepper(
                stepperAdapterLevels,
                this.trainingRunService.getActiveLevelPosition(),
            );
        }
        this.activeLevel$ = this.trainingRunService.activeLevel$.pipe(
            takeUntilDestroyed(this.destroyRef),
            tap(() => {
                this.isLast = this.trainingRunService.isLast();
                if (this.isStepperDisplayed) {
                    this.stepper.onActiveLevelUpdated(this.trainingRunService.getActiveLevelPosition());
                }
            }),
        );
        this.backtrackedLevel$ = this.trainingRunService.backtrackedLevel$;
    }

    /**
     * Jump to training run level.
     * @param index of desired level
     */
    activeStepChanged(index: number): void {
        if (this.stepper.activeLevelIndex !== index && index >= 0 && index < this.levels.length) {
            this.trainingRunService.moveToLevel(this.levels[index].id).pipe(take(1)).subscribe();
            this.stepper.onActiveLevelUpdated(index);
        }
    }

    next(): void {
        this.trainingRunService.next().pipe(take(1)).subscribe();
    }
}
