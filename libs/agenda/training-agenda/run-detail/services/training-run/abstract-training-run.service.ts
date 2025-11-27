import {
    AccessLevel,
    AccessPhase,
    AccessTrainingRunInfo,
    AssessmentLevel,
    InfoLevel,
    InfoPhase,
    Level,
    Phase,
    QuestionnairePhase,
    TrainingLevel,
    TrainingPhase
} from '@crczp/training-model';
import { BehaviorSubject, Observable } from 'rxjs';
import { ErrorHandlerService } from '@crczp/utils';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { LoadingDialogComponent, LoadingDialogOptions } from '@crczp/components';

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

    public updateRunInfo(properties: Partial<AccessTrainingRunInfo>): void {
        this.runInfoSubject$.next(this.runInfo.update(properties));
    }

    public nextLevel(): void {
        if (this.runInfo.isBacktracked) {
            this.displayNextLevel();
        } else if (this.runInfo.isLastLevelDisplayed) {
            this.callApiToFinish().subscribe(() => {
                this.navigateToRunSummary();
            });
        } else {
            this.callApiToNextLevel().subscribe((nextLevel) => {
                this.updateRunInfoWithNextLevel(nextLevel);
                this.advanceCurrentLevel();
            });
        }
    }

    public updateRunInfoWithNextLevel(level: Level | Phase): void {
        const updatedLevels = this.runInfo.levels.map((lvl) =>
            lvl.id === level.id ? level : lvl,
        );
        this.updateRunInfo({ levels: updatedLevels });
    }

    public updateRunInfoWithLoadedLevel(level: Level | Phase): void {
        const updatedLevels = this.runInfo.levels.map((lvl) => {
            if (lvl.id !== level.id) {
                return lvl;
            }
            if (lvl instanceof TrainingPhase) {
                lvl.currentTask.content = (
                    level as TrainingPhase
                ).currentTask.content;
            }
            if (
                lvl instanceof TrainingLevel ||
                lvl instanceof InfoLevel ||
                lvl instanceof InfoPhase
            ) {
                lvl.content = (level as TrainingLevel).content;
            }
            if (lvl instanceof AccessPhase || lvl instanceof AccessLevel) {
                lvl.cloudContent = (
                    level as AccessPhase | AccessLevel
                ).cloudContent;
                lvl.localContent = (
                    level as AccessPhase | AccessLevel
                ).localContent;
            }
            if (
                lvl instanceof AssessmentLevel ||
                lvl instanceof QuestionnairePhase
            ) {
                lvl.questions = (
                    level as AssessmentLevel | QuestionnairePhase
                ).questions;
            }
            return lvl;
        });
        this.updateRunInfo({
            displayedLevelId: level.id,
            levels: updatedLevels,
        });
    }

    public displayLevelByOrder(levelOrder: number): void {
        const targetLevel = this.runInfo.levels.find(
            (lvl) => lvl.order === levelOrder,
        );
        if (!targetLevel) {
            this.errorHandlerService.emitFrontendErrorNotification(
                `Level with order ${levelOrder} not found in current training run`,
            );
        }
        this.displayLevel(targetLevel.id);
    }

    public displayLevel(levelId: number): void {
        const targetLevel = this.findLevelOrThrow(levelId);
        if (!targetLevel.isLoaded) {
            this.callApiToLoadLevel(targetLevel.id).subscribe((loadedLevel) => {
                this.updateRunInfoWithLoadedLevel(loadedLevel);
            });
        } else {
            this.updateRunInfo({ displayedLevelId: targetLevel.id });
        }
    }

    protected abstract navigateToRunSummary(): void;

    protected abstract callApiToNextLevel(): Observable<Phase | Level>;

    protected abstract callApiToFinish(): Observable<boolean>;

    protected abstract callApiToLoadLevel(
        levelId: number,
    ): Observable<Phase | Level>;

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
        this.displayLevelByOrder(this.runInfo.displayedLevel.order + 1);
    }

    private displayLoadingDialog(): MatDialogRef<LoadingDialogComponent> {
        return this.dialog.open(LoadingDialogComponent, {
            data: new LoadingDialogOptions(
                'Processing training data for visualization',
                `Please wait while your training data are being processed`,
            ),
        });
    }

    private advanceCurrentLevel() {
        const nextLevelByOrder = this.runInfo.levels.find(
            (lvl) => lvl.order === this.runInfo.currentLevel.order + 1,
        );
        if (!nextLevelByOrder) {
            this.errorHandlerService.emitFrontendErrorNotification(
                `Next level with order ${
                    this.runInfo.currentLevel.order + 1
                } not found in current training run`,
            );
        }
        this.updateRunInfo({
            currentLevelId: nextLevelByOrder.id,
            displayedLevelId: nextLevelByOrder.id,
            isCurrentLevelAnswered: false,
        });
    }
}
