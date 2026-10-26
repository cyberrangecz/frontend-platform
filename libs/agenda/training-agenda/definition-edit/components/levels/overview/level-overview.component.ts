import { AsyncPipe } from '@angular/common';
import {
    ChangeDetectionStrategy,
    Component,
    DestroyRef,
    EventEmitter,
    inject,
    Input,
    OnChanges,
    OnInit,
    Output,
    SimpleChanges,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatDivider } from '@angular/material/divider';
import {
    LevelMoveEvent,
    LevelStepperAdapter,
    TrainingLevelStepperComponent,
} from '@crczp/components';
import {
    Level,
    TrainingDefinitionWithLevels,
} from '@crczp/training-model';
import {
    SentinelControlItem,
    SentinelControlsComponent,
} from '@sentinel/components/controls';
import { BehaviorSubject, combineLatest, Observable } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import { LevelOverviewControls } from '../../../model/adapters/level-overview-controls';
import { LevelEditService } from '../../../services/state/level/level-edit.service';
import { AbstractLevelEditComponent } from '../level/abstract-level-edit.component';

/**
 * Smart component for level stepper and level edit components
 */
@Component({
    selector: 'crczp-level-overview',
    templateUrl: './level-overview.component.html',
    styleUrls: ['./level-overview.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        AsyncPipe,
        SentinelControlsComponent,
        MatDivider,
        AbstractLevelEditComponent,
        TrainingLevelStepperComponent,
    ],
})
export class LevelOverviewComponent implements OnInit, OnChanges {
    @Output() hasUnsavedChanges: EventEmitter<boolean> = new EventEmitter();
    @Output() levelsCount: EventEmitter<number> = new EventEmitter();
    @Input() trainingDefinition: TrainingDefinitionWithLevels;
    @Input() editMode: boolean;
    @Input() editingBlocked = false;
    activeStep$: Observable<number>;
    stepperLevels: Observable<LevelStepperAdapter[]>;
    controls: SentinelControlItem[];
    destroyRef = inject(DestroyRef);
    private levelService = inject(LevelEditService);
    private editingBlockedSubject$ = new BehaviorSubject(false);
    private editModeSubject$ = new BehaviorSubject(false);

    ngOnInit(): void {
        this.activeStep$ = this.levelService.activeStep$;
        this.stepperLevels = this.levelService.levels$.pipe(
            map((levels) =>
                levels.map((level) => new LevelStepperAdapter(level)),
            ),
            tap(() =>
                this.levelsCount.emit(this.levelService.getLevelsCount()),
            ),
        );

        this.levelService.hasUnsavedChanges$
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe((hasUnsavedChanges) =>
                this.hasUnsavedChanges.emit(hasUnsavedChanges),
            );
        this.initControl();
    }

    ngOnChanges(changes: SimpleChanges): void {
        if ('trainingDefinition' in changes) {
            this.levelService.set(this.trainingDefinition.levels as Level[]);
        }
        if ('editMode' in changes) {
            this.editModeSubject$.next(this.editMode);
        }
        if ('editingBlocked' in changes) {
            this.levelService.setEditingBlocked(this.editingBlocked);
            this.editingBlockedSubject$.next(this.editingBlocked);
        }
    }

    /**
     * Calls service to set new active level
     * @param levelIndex index of new active level
     */
    onActiveLevelChange(levelIndex: number): void {
        this.levelService.setActiveLevel(levelIndex);
    }

    /**
     * Call service to move level from original position to a new one
     * @param event event of level move
     */
    onLevelMoved(event: LevelMoveEvent): void {
        this.levelService.move(
            event.stepperState.previousIndex,
            event.stepperState.currentIndex,
        );
    }

    /**
     * Calls service to change active level
     * @param level level to set as active
     */
    onActiveLevelChanged(level: Level): void {
        this.levelService.onActiveLevelChanged(level);
    }

    private initControl() {
        const addDisabled$ = combineLatest([
            this.editModeSubject$,
            this.editingBlockedSubject$,
        ]).pipe(map(([editMode, blocked]) => blocked || !editMode));
        const deleteDisabled$ = combineLatest([
            this.levelService.levels$,
            this.editingBlockedSubject$,
        ]).pipe(map(([levels, blocked]) => blocked || levels.length <= 0));
        this.controls = LevelOverviewControls.create(
            this.levelService,
            addDisabled$,
            deleteDisabled$,
        );
    }
}
