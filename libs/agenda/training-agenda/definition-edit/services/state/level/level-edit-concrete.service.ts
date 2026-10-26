import { inject, Injectable } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import {
    SentinelConfirmationDialogComponent,
    SentinelConfirmationDialogConfig,
    SentinelDialogResultEnum
} from '@sentinel/components/dialogs';
import { AbstractLevelTypeEnum, Level } from '@crczp/training-model';
import { EMPTY, Observable, of } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { LevelEditService } from './level-edit.service';
import { createNewLevel } from './new-level.factory';

/**
 * Keeps the levels of the edited training definition in memory and applies every change to them locally.
 * Subscribe to levels$, activeStep$, levelsValid$ and hasUnsavedChanges$ to receive latest data updates.
 */
@Injectable()
export class LevelEditConcreteService extends LevelEditService {
    private dialog = inject(MatDialog);
    private editingBlocked = false;

    set(levels: Level[]): void {
        this.levelsSubject$.next(levels);
        this.levelsValidSubject$.next(levels.every((level) => level.valid));
        this.hasUnsavedChangesSubject$.next(false);
        this.setActiveLevel(
            Math.min(
                this.activeStepSubject$.getValue(),
                Math.max(levels.length - 1, 0)
            )
        );
    }

    getLevels(): Level[] {
        return this.levelsSubject$.getValue();
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
        const levels = [...this.levelsSubject$.getValue()];
        levels[this.activeStepSubject$.getValue()] = level;
        this.applyChange(levels);
    }

    getSelected(): Level {
        return this.levelsSubject$.getValue()[
            this.activeStepSubject$.getValue()
        ];
    }

    navigateToLastLevel(): void {
        this.setActiveLevel(this.levelsSubject$.getValue().length - 1);
    }

    navigateToPreviousLevel(): void {
        this.setActiveLevel(Math.max(this.activeStepSubject$.getValue() - 1, 0));
    }

    add(levelType: AbstractLevelTypeEnum): Observable<Level> {
        if (this.editingBlocked) {
            return EMPTY;
        }
        const level = createNewLevel(levelType);
        this.applyChange([...this.levelsSubject$.getValue(), level]);
        this.navigateToLastLevel();
        return of(level);
    }

    deleteSelected(): Observable<Level[]> {
        if (this.editingBlocked) {
            return EMPTY;
        }
        const level = this.getSelected();
        return this.displayDialogToDelete(level).pipe(
            switchMap((result) =>
                result === SentinelDialogResultEnum.CONFIRMED
                    ? of(level)
                    : EMPTY
            ),
            map((deletedLevel) => this.removeLevel(deletedLevel))
        );
    }

    move(fromIndex: number, toIndex: number): void {
        const levels = [...this.levelsSubject$.getValue()];
        if (this.editingBlocked) {
            this.levelsSubject$.next(levels);
            return;
        }
        levels.splice(toIndex, 0, levels.splice(fromIndex, 1)[0]);
        this.applyChange(levels);
    }

    setEditingBlocked(blocked: boolean): void {
        this.editingBlocked = blocked;
    }

    private displayDialogToDelete(
        level: Level
    ): Observable<SentinelDialogResultEnum> {
        const dialogRef = this.dialog.open(
            SentinelConfirmationDialogComponent,
            {
                data: new SentinelConfirmationDialogConfig(
                    'Delete Level',
                    `Do you want to delete level "${level.title}"?`,
                    'Cancel',
                    'Delete'
                ),
            }
        );
        return dialogRef.afterClosed();
    }

    private removeLevel(level: Level): Level[] {
        const remaining = this.levelsSubject$
            .getValue()
            .filter((candidate) => candidate !== level);
        this.applyChange(remaining);
        this.navigateToPreviousLevel();
        return remaining;
    }

    private applyChange(levels: Level[]): void {
        levels.forEach((level, index) => (level.order = index));
        this.levelsSubject$.next(levels);
        this.levelsValidSubject$.next(levels.every((level) => level.valid));
        this.hasUnsavedChangesSubject$.next(true);
    }
}
