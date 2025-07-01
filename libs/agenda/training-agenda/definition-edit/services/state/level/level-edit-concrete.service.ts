import { Injectable } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import {
    SentinelConfirmationDialogComponent,
    SentinelConfirmationDialogConfig,
    SentinelDialogResultEnum,
} from '@sentinel/components/dialogs';
import { TrainingDefinitionApi } from '@crczp/training-api';
import {
    AbstractLevelTypeEnum,
    AccessLevel,
    AssessmentLevel,
    InfoLevel,
    Level,
    TrainingLevel,
} from '@crczp/training-model';
import { EMPTY, Observable } from 'rxjs';
import { switchMap, tap } from 'rxjs/operators';
import { TrainingErrorHandler, TrainingNotificationService } from '@crczp/training-agenda';
import { LevelEditService } from './level-edit.service';

/**
 * Service handling editing of training definition's levels and related operations.
 * Serves as a layer between component and API service
 * Subscribe to levels$, activeStep$ and activeLevelCanBeSaved$ to receive latest data updates.
 */
@Injectable()
export class LevelEditConcreteService extends LevelEditService {
    constructor(
        private api: TrainingDefinitionApi,
        private dialog: MatDialog,
        private errorHandler: TrainingErrorHandler,
        private notificationService: TrainingNotificationService,
    ) {
        super();
    }

    /**
     * Initiates service with levels and related training definition id
     * @param trainingDefinitionId id of training definition
     * @param levels all levels associated with training definition id
     */
    set(trainingDefinitionId: number, levels: Level[]): void {
        this.trainingDefinitionId = trainingDefinitionId;
        this.levelsSubject$.next(levels);
    }

    getLevelsCount(): number {
        return this.levelsSubject$.getValue().length;
    }

    setActiveLevel(levelIndex: number): void {
        this.activeStepSubject$.next(levelIndex);
    }

    /**
     * Performs necessary actions to initiate and update values related to active level change
     * @param level new active level
     */
    onActiveLevelChanged(level: Level): void {
        level.isUnsaved = true;
        const newLevels = this.levelsSubject$.getValue();
        newLevels[this.activeStepSubject$.getValue()] = level;
        this.levelsSaveDisabledSubject$.next(!level.valid);
        this.levelsValidSubject$.next(level.valid);
        this.levelsSubject$.next(newLevels);
        this.unsavedLevelsSubject$.next(this.levelsSubject$.getValue().filter((level) => level.isUnsaved));
    }

    getSelected(): Level {
        return this.levelsSubject$.getValue()[this.activeStepSubject$.getValue()];
    }

    navigateToLastLevel(): void {
        this.setActiveLevel(this.levelsSubject$.getValue().length - 1);
    }

    navigateToPreviousLevel(): void {
        const curr = this.activeStepSubject$.getValue();
        if (curr > 0) {
            this.setActiveLevel(curr - 1);
        } else {
            this.setActiveLevel(0);
        }
    }

    /**
     * Creates new level with default values based on passed level type
     * @param levelType enum of possible level types
     */
    add(levelType: AbstractLevelTypeEnum): Observable<Level> {
        let added$: Observable<Level>;
        switch (levelType) {
            case AbstractLevelTypeEnum.Info: {
                added$ = this.addInfoLevel();
                break;
            }
            case AbstractLevelTypeEnum.Assessment: {
                added$ = this.addAssessmentLevel();
                break;
            }
            case AbstractLevelTypeEnum.Training: {
                added$ = this.addTrainingLevel();
                break;
            }
            case AbstractLevelTypeEnum.Access: {
                added$ = this.addAccessLevel();
                break;
            }
            default:
                console.error('Unsupported type of level in add method od LevelEditService');
        }
        return added$.pipe(tap(() => this.navigateToLastLevel()));
    }

    saveUnsavedLevels(): Observable<any> {
        if (this.unsavedLevelsSubject$.getValue().length > 0) {
            return this.sendRequestToSaveLevels(this.unsavedLevelsSubject$.getValue()).pipe(
                tap(
                    () => {
                        this.onLevelsSaved();
                        this.notificationService.emit('success', `Levels have been saved`);
                    },
                    (err) => this.errorHandler.emit(err, `Saving levels in training definition`),
                ),
            );
        } else {
            return EMPTY;
        }
    }

    /**
     * Displays dialog to delete selected level and displays alert with result of the operation
     */
    deleteSelected(): Observable<Level[]> {
        const level = this.getSelected();
        return this.displayDialogToDelete(level).pipe(
            switchMap((result) =>
                result === SentinelDialogResultEnum.CONFIRMED ? this.callApiToDelete(level) : EMPTY,
            ),
        );
    }

    /**
     * Moves level from index to a new one. Updates optimistically and rollback is performed on error
     * @param fromIndex current index of level
     * @param toIndex new index of level
     */
    move(fromIndex: number, toIndex: number): Observable<any> {
        const levels = this.levelsSubject$.getValue();
        const from = levels[fromIndex];
        this.moveInternally(fromIndex, toIndex);
        return this.api.moveLevelTo(this.trainingDefinitionId, from.id, toIndex).pipe(
            tap(
                (_) => _,
                (err) => {
                    this.moveRollback(fromIndex);
                    this.errorHandler.emit(err, `Moving level "${from.title}"`);
                },
            ),
        );
    }

    private moveRollback(fromIndex: number) {
        const levels = this.levelsSubject$.getValue();
        this.levelsSubject$.next(levels.sort((a, b) => a.order - b.order));
        this.setActiveLevel(fromIndex);
    }

    private addTrainingLevel(): Observable<TrainingLevel> {
        return this.api.createTrainingLevel(this.trainingDefinitionId).pipe(
            switchMap((basicLevelInfo) => this.api.getLevel(basicLevelInfo.id) as Observable<TrainingLevel>),
            tap(
                (level) => this.onLevelAdded(level),
                (err) => this.errorHandler.emit(err, 'Adding training level'),
            ),
        );
    }

    private addAccessLevel(): Observable<AccessLevel> {
        return this.api.createAccessLevel(this.trainingDefinitionId).pipe(
            switchMap((basicLevelInfo) => this.api.getLevel(basicLevelInfo.id) as Observable<AccessLevel>),
            tap(
                (level) => this.onLevelAdded(level),
                (err) => this.errorHandler.emit(err, 'Adding training level'),
            ),
        );
    }

    private addInfoLevel(): Observable<InfoLevel> {
        return this.api.createInfoLevel(this.trainingDefinitionId).pipe(
            switchMap((basicLevelInfo) => this.api.getLevel(basicLevelInfo.id) as Observable<InfoLevel>),
            tap(
                (level) => this.onLevelAdded(level),
                (err) => this.errorHandler.emit(err, 'Adding info level'),
            ),
        );
    }

    private addAssessmentLevel(): Observable<AssessmentLevel> {
        return this.api.createAssessmentLevel(this.trainingDefinitionId).pipe(
            switchMap((basicLevelInfo) => this.api.getLevel(basicLevelInfo.id) as Observable<AssessmentLevel>),
            tap(
                (level) => this.onLevelAdded(level),
                (err) => this.errorHandler.emit(err, 'Adding assessment level'),
            ),
        );
    }

    private displayDialogToDelete(level: Level): Observable<SentinelDialogResultEnum> {
        const dialogRef = this.dialog.open(SentinelConfirmationDialogComponent, {
            data: new SentinelConfirmationDialogConfig(
                'Delete Level',
                `Do you want to delete level "${level.title}"?`,
                'Cancel',
                'Delete',
            ),
        });
        return dialogRef.afterClosed();
    }

    private callApiToDelete(level: Level): Observable<Level[]> {
        return this.api.deleteLevel(this.trainingDefinitionId, level.id).pipe(
            tap(
                () => this.onLevelDeleted(level.id),
                (err) => this.errorHandler.emit(err, 'Deleting level "' + level.title + '"'),
            ),
        );
    }

    private onLevelDeleted(deletedId: number) {
        this.levelsSubject$.next(this.levelsSubject$.getValue().filter((level) => level.id !== deletedId));
        this.navigateToPreviousLevel();
    }

    private onLevelAdded(level: Level) {
        this.levelsSubject$.next([...this.levelsSubject$.getValue(), level]);
    }

    private sendRequestToSaveLevels(levels: Level[]): Observable<any> {
        return this.api.updateTrainingDefinitionLevels(this.trainingDefinitionId, levels);
    }

    private onLevelsSaved(): void {
        this.unsavedLevelsSubject$.getValue().forEach((level) => {
            level.isUnsaved = false;
            level.valid = true;
        });
        this.unsavedLevelsSubject$.next([]);
        this.levelsSaveDisabledSubject$.next(true);
    }

    private moveInternally(fromIndex: number, toIndex: number, activeIndex?: number) {
        const levels = this.levelsSubject$.getValue();
        levels.splice(toIndex, 0, levels.splice(fromIndex, 1)[0]);
        levels.forEach((level, index) => (level.order = index));
        this.levelsSubject$.next(levels);
    }
}
