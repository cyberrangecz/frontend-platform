import { AccessTrainingRunInfo, Level, Phase } from '@crczp/training-model';
import { BehaviorSubject, Observable } from 'rxjs';
import { ErrorHandlerService } from '@crczp/utils';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import {
    LoadingDialogComponent,
    LoadingDialogOptions,
} from '@crczp/components';
import { TrainingRunStepper } from '../../model/training-run-stepper';
import { map } from 'rxjs/operators';

export abstract class AbstractTrainingRunService {
    private readonly runInfoSubject$ =
        new BehaviorSubject<AccessTrainingRunInfo>(undefined);

    protected constructor(
        private errorHandlerService: ErrorHandlerService,
        private dialog: MatDialog,
        accessTrainingRunInfo: AccessTrainingRunInfo,
    ) {
        this.runInfoSubject$.next(accessTrainingRunInfo);
    }

    public get runInfo(): AccessTrainingRunInfo {
        return this.runInfoSubject$.value;
    }

    public get runInfo$(): Observable<AccessTrainingRunInfo> {
        return this.runInfoSubject$.asObservable();
    }

    public get stepperBar$(): Observable<TrainingRunStepper | null> {
        return this.runInfoSubject$.asObservable().pipe(
            map((runInfo) => {
                if (runInfo.isStepperDisplayed) {
                    return new TrainingRunStepper(
                        runInfo.levels,
                        runInfo.displayedLevel.id,
                        runInfo.backwardMode,
                    );
                }
                return null;
            }),
        );
    }

    public get isLastLevelDisplayed(): boolean {
        return (
            this.runInfo.displayedLevel.id ===
            this.runInfo.levels[this.runInfo.levels.length - 1]?.id
        );
    }

    public get isLastLevelDisplayed$(): Observable<boolean> {
        return this.runInfo$.pipe(map((_) => this.isLastLevelDisplayed));
    }

    public updateRunInfo(properties: Partial<AccessTrainingRunInfo>): void {
        this.runInfoSubject$.next(this.runInfo.update(properties));
    }

    public nextLevel(): void {
        if (!this.runInfo.isLevelAnswered) {
            this.errorHandlerService.emitFrontendErrorNotification(
                'Cannot proceed to next level before answering the current level',
            );
        }
        if (this.runInfo.isBacktracked) {
            this.displayNextLevel();
        } else if (this.isLastLevelDisplayed) {
            this.callApiToFinish().subscribe();
        } else {
            this.callApiToNextLevel().subscribe();
        }
    }

    public updateLevel(trainingLevel: Level | Phase): void {
        const updatedLevels = this.runInfo.levels.map((level) =>
            level.id === trainingLevel.id ? trainingLevel : level,
        );
        this.updateRunInfo({ levels: updatedLevels });
    }

    public displayLevel(levelId: number): void {
        const currentLevelOrder = this.runInfo.currentLevel.order;
        const targetLevel = this.findLevelOrThrow(levelId);
        if (targetLevel.order > currentLevelOrder) {
            this.errorHandlerService.emitFrontendErrorNotification(
                'Cannot display a level ahead of the current level',
            );
        }
        this.updateRunInfo({ displayedLevelId: targetLevel.id });
    }

    protected abstract callApiToNextLevel(): Observable<Phase | Level>;

    protected abstract callApiToFinish(): Observable<boolean>;

    protected findLevelOrThrow(levelId: number): Level | Phase {
        const targetLevel = this.runInfo.levels.find(
            (lvl) => lvl.id === levelId,
        );
        if (!targetLevel) {
            this.errorHandlerService.emitFrontendErrorNotification(
                `Level with ID ${levelId} not found in current training run`,
            );
        }
        return targetLevel;
    }

    protected displayNextLevel() {
        const nextLevel = this.runInfo.levels.find(
            (lvl) => lvl.order === this.runInfo.currentLevel.order + 1,
        );
        this.updateRunInfo({ displayedLevelId: nextLevel.id });
    }

    private displayLoadingDialog(): MatDialogRef<LoadingDialogComponent> {
        return this.dialog.open(LoadingDialogComponent, {
            data: new LoadingDialogOptions(
                'Processing training data for visualization',
                `Please wait while your training data are being processed`,
            ),
        });
    }
}
