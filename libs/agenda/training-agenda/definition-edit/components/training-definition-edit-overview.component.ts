import { ChangeDetectionStrategy, Component, DestroyRef, HostListener, inject, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import {
    SentinelControlItem,
    SentinelControlsComponent
} from '@sentinel/components/controls';
import { Level, MitreTechnique, TrainingDefinitionWithLevels } from '@crczp/training-model';
import { combineLatest, defer, Observable, switchMap } from 'rxjs';
import { filter, map, tap } from 'rxjs/operators';
import { UnsavedChangesTracker } from '@crczp/utils';
import { TrainingDefinitionChangeEvent } from '../model/events/training-definition-change-event';
import { TrainingDefinitionEditService } from '../services/state/edit/training-definition-edit.service';
import { SentinelUserAssignComponent, SentinelUserAssignService } from '@sentinel/components/user-assign';
import { AuthorsAssignService } from '../services/state/authors-assign/authors-assign.service';
import {
    TrainingDefinitionEditConcreteService
} from '../services/state/edit/training-definition-edit-concrete.service';
import { LevelEditService } from '../services/state/level/level-edit.service';
import { LevelEditConcreteService } from '../services/state/level/level-edit-concrete.service';
import { MitreTechniquesService } from '../services/state/mitre-techniques/mitre-techniques.service';
import { MitreTechniquesConcreteService } from '../services/state/mitre-techniques/mitre-techniques-concrete.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
    MatExpansionPanel,
    MatExpansionPanelContent,
    MatExpansionPanelDescription,
    MatExpansionPanelHeader,
    MatExpansionPanelTitle
} from '@angular/material/expansion';
import { MatIcon } from '@angular/material/icon';
import { MatError } from '@angular/material/input';
import { MatDivider } from '@angular/material/divider';
import { TrainingDefinitionEditComponent } from './definition/training-definition-edit.component';
import { LevelOverviewComponent } from './levels/overview/level-overview.component';
import { AsyncPipe } from '@angular/common';
import { createInfinitePaginationEvent } from '@crczp/api-common';

/**
 * Main smart component of training definition edit/new page.
 */
@Component({
    selector: 'crczp-training-definition-detail',
    templateUrl: './training-definition-edit-overview.component.html',
    styleUrls: ['./training-definition-edit-overview.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    providers: [
        { provide: SentinelUserAssignService, useClass: AuthorsAssignService },
        { provide: LevelEditService, useClass: LevelEditConcreteService },
        {
            provide: TrainingDefinitionEditService,
            useClass: TrainingDefinitionEditConcreteService,
        },
        {
            provide: MitreTechniquesService,
            useClass: MitreTechniquesConcreteService,
        },
    ],
    imports: [
        MatIcon,
        MatError,
        MatExpansionPanelDescription,
        MatExpansionPanelTitle,
        MatExpansionPanelHeader,
        MatExpansionPanel,
        SentinelControlsComponent,
        MatDivider,
        TrainingDefinitionEditComponent,
        LevelOverviewComponent,
        MatExpansionPanelContent,
        AsyncPipe,
        SentinelUserAssignComponent,
    ],
})
export class TrainingDefinitionEditOverviewComponent implements OnInit {
    trainingDefinition$: Observable<TrainingDefinitionWithLevels>;
    editMode$: Observable<boolean>;
    tdTitle$: Observable<string>;
    levelsCount = -1;
    saveDisabled$: Observable<boolean>;
    levelSaveDisabled$: Observable<boolean>;
    protected readonly unsavedChanges = new UnsavedChangesTracker<
        'trainingDefinition' | 'levels' | 'authors'
    >();
    defaultPaginationSize: number;
    controls: SentinelControlItem[];
    mitreTechniques$: Observable<MitreTechnique[]>;
    destroyRef = inject(DestroyRef);
    private activeRoute = inject(ActivatedRoute);
    private editService = inject(TrainingDefinitionEditService);
    private levelEditService = inject(LevelEditService);
    private mitreTechniquesService = inject(MitreTechniquesService);
    private authorsAssignService = inject(SentinelUserAssignService);

    constructor() {
        this.trainingDefinition$ = this.editService.trainingDefinition$;
        this.tdTitle$ = this.editService.trainingDefinition$.pipe(
            map((td) => td.title),
        );
        this.saveDisabled$ = this.editService.saveDisabled$;
        this.mitreTechniques$ = this.mitreTechniquesService.mitreTechniques$;
        this.mitreTechniquesService
            .getAll()
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe();
        const valid$: Observable<boolean> = combineLatest([
            this.editService.definitionValid$,
            this.levelEditService.levelsValid$,
        ]).pipe(map((valid) => valid[0] && valid[1]));
        this.levelSaveDisabled$ = this.levelEditService.levelsSaveDisabled$;
        this.activeRoute.data
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe((data) =>
                this.editService.set(data[TrainingDefinitionWithLevels.name] || null),
            );
        this.editMode$ = this.editService.editMode$.pipe(
            tap(() => (this.controls = this.buildControls(valid$))),
        );
    }

    /**
     * Builds the Save control, enabled only while the definition and levels are
     * both valid and either has changes to persist.
     *
     * @param valid$ Combined validity of the definition and its levels.
     */
    private buildControls(valid$: Observable<boolean>): SentinelControlItem[] {
        const saveDisabled$: Observable<boolean> = combineLatest([
            this.saveDisabled$,
            this.levelSaveDisabled$,
            valid$,
        ]).pipe(
            map(
                ([definitionSaveDisabled, levelSaveDisabled, valid]) =>
                    (definitionSaveDisabled && levelSaveDisabled) || !valid,
            ),
        );
        return [
            new SentinelControlItem(
                'save',
                'Save',
                'primary',
                saveDisabled$,
                defer(() =>
                    this.editService
                        .save()
                        .pipe(this.unsavedChanges.clearOnSuccess('trainingDefinition')),
                ),
            ),
        ];
    }

    ngOnInit(): void {
        this.editMode$
            .pipe(
                takeUntilDestroyed(this.destroyRef),
                filter((editMode) => editMode),
                switchMap(() => this.editService.trainingDefinition$),
                takeUntilDestroyed(this.destroyRef),
                filter(
                    (trainingDefinition) =>
                        !!trainingDefinition && !!trainingDefinition.id,
                ),
            )
            .subscribe((trainingDefinition) =>
                this.authorsAssignService
                    .getAssigned(
                        trainingDefinition.id,
                        createInfinitePaginationEvent('familyName'),
                    )
                    .subscribe(),
            );
    }

    /**
     * Shows dialog asking the user if he really wants to leave the page after refresh or navigating to another page
     */
    @HostListener('window:beforeunload')
    canRefreshOrLeave(): boolean {
        return this.canDeactivate();
    }

    /**
     * Determines if all changes in sub components are saved and user can navigate to different page
     */
    canDeactivate(): boolean {
        return !this.unsavedChanges.hasAny();
    }

    /**
     * Passes state of edited training definition to service and changes state of the component (canDeactivate)
     * @param $event training definition change event containing validity and new state
     */
    onTrainingDefinitionChanged($event: TrainingDefinitionChangeEvent): void {
        this.editService.change($event);
        this.unsavedChanges.set('trainingDefinition', true);
    }

    /**
     * Changes state of the component when one of the levels is saved
     * @param unsavedLevels unsaved levels emitted from child component
     */
    onUnsavedLevelsChanged(unsavedLevels: Level[]): void {
        this.unsavedChanges.set('levels', unsavedLevels.length > 0);
    }

    /**
     * Changes state of the component when level is added or deleted
     * @param count new count of levels
     */
    onLevelsCountChanged(count: number): void {
        this.levelsCount = count;
    }

    /**
     * Changes state of the component when authors of the training definition are changed
     * @param hasUnsavedChanges true if the child component has unsaved, false otherwise
     */
    onAuthorsChanged(hasUnsavedChanges: boolean): void {
        this.unsavedChanges.set('authors', hasUnsavedChanges);
    }
}
