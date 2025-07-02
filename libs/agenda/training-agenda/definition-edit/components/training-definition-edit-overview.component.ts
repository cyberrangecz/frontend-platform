import {ChangeDetectionStrategy, Component, DestroyRef, HostListener, inject, OnInit} from '@angular/core';
import {ActivatedRoute} from '@angular/router';
import {SentinelControlItem, SentinelControlsComponent} from '@sentinel/components/controls';
import {Level, MitreTechnique, TrainingDefinition} from '@crczp/training-model';
import {async, combineLatest, Observable, switchMap} from 'rxjs';
import {filter, map, tap} from 'rxjs/operators';
import {TrainingDefinitionEditControls} from '../model/adapters/training-definition-edit-controls';
import {TRAINING_DEFINITION_DATA_ATTRIBUTE_NAME} from '@crczp/training-agenda';
import {TrainingDefinitionChangeEvent} from '../model/events/training-definition-change-event';
import {TrainingDefinitionEditService} from '../services/state/edit/training-definition-edit.service';
import {SentinelUserAssignComponent, SentinelUserAssignService} from '@sentinel/components/user-assign';
import {AuthorsAssignService} from '../services/state/authors-assign/authors-assign.service';
import {TrainingDefinitionEditConcreteService} from '../services/state/edit/training-definition-edit-concrete.service';
import {LevelEditService} from '../services/state/level/level-edit.service';
import {LevelEditConcreteService} from '../services/state/level/level-edit-concrete.service';
import {MitreTechniquesService} from '../services/state/mitre-techniques/mitre-techniques.service';
import {MitreTechniquesConcreteService} from '../services/state/mitre-techniques/mitre-techniques-concrete.service';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {OffsetPaginationEvent} from '@sentinel/common/pagination';
import {PaginationStorageService} from "@crczp/common";
import {
    MatExpansionPanel,
    MatExpansionPanelContent,
    MatExpansionPanelDescription,
    MatExpansionPanelHeader,
    MatExpansionPanelTitle
} from "@angular/material/expansion";
import {MatIcon} from "@angular/material/icon";
import {MatError} from "@angular/material/input";
import {MatDivider} from "@angular/material/divider";
import {TrainingDefinitionEditComponent} from "./definition/training-definition-edit.component";
import {LevelOverviewComponent} from "./levels/overview/level-overview.component";
import {AsyncPipe, NgIf} from "@angular/common";

/**
 * Main smart component of training definition edit/new page.
 */
@Component({
    selector: 'crczp-training-definition-detail',
    templateUrl: './training-definition-edit-overview.component.html',
    styleUrls: ['./training-definition-edit-overview.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    providers: [
        {provide: SentinelUserAssignService, useClass: AuthorsAssignService},
        {provide: LevelEditService, useClass: LevelEditConcreteService},
        {provide: TrainingDefinitionEditService, useClass: TrainingDefinitionEditConcreteService},
        {provide: MitreTechniquesService, useClass: MitreTechniquesConcreteService},
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
        NgIf,
        AsyncPipe,
        SentinelUserAssignComponent
    ]
})
export class TrainingDefinitionEditOverviewComponent implements OnInit {
    private activeRoute = inject(ActivatedRoute);
    private paginationService = inject(PaginationStorageService);
    private editService = inject(TrainingDefinitionEditService);
    private levelEditService = inject(LevelEditService);
    private mitreTechniquesService = inject(MitreTechniquesService);
    private authorsAssignService = inject(SentinelUserAssignService);

    trainingDefinition$: Observable<TrainingDefinition>;
    editMode$: Observable<boolean>;
    tdTitle$: Observable<string>;
    levelsCount = -1;
    saveDisabled$: Observable<boolean>;
    levelSaveDisabled$: Observable<boolean>;
    unsavedLevels: Level[] = [];
    unsavedLevels$: Observable<Level[]>;
    canDeactivateAuthors = true;
    canDeactivateTDEdit = true;
    defaultPaginationSize: number;
    controls: SentinelControlItem[];
    mitreTechniques$: Observable<MitreTechnique[]>;
    destroyRef = inject(DestroyRef);
    protected readonly async = async;

    constructor() {
        const levelEditService = this.levelEditService;

        this.defaultPaginationSize = this.paginationService.DEFAULT_PAGE_SIZE;
        this.trainingDefinition$ = this.editService.trainingDefinition$;
        this.tdTitle$ = this.editService.trainingDefinition$.pipe(map((td) => td.title));
        this.saveDisabled$ = this.editService.saveDisabled$;
        this.mitreTechniques$ = this.mitreTechniquesService.mitreTechniques$;
        this.mitreTechniquesService.getAll().pipe(takeUntilDestroyed(this.destroyRef)).subscribe();
        const valid$: Observable<boolean> = combineLatest(
            this.editService.definitionValid$,
            this.levelEditService.levelsValid$,
        ).pipe(map((valid) => valid[0] && valid[1]));
        this.levelSaveDisabled$ = this.levelEditService.levelsSaveDisabled$;
        this.unsavedLevels$ = levelEditService.unsavedLevels$;
        this.activeRoute.data
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe((data) => this.editService.set(data[TRAINING_DEFINITION_DATA_ATTRIBUTE_NAME]));
        this.editMode$ = this.editService.editMode$.pipe(
            tap(
                () =>
                    (this.controls = TrainingDefinitionEditControls.create(
                        this.editService,
                        this.saveDisabled$,
                        this.levelSaveDisabled$,
                        valid$,
                    )),
            ),
        );
    }

    ngOnInit(): void {
        this.editMode$
            .pipe(
                takeUntilDestroyed(this.destroyRef),
                filter((editMode) => editMode),
                switchMap(() => this.editService.trainingDefinition$),
                takeUntilDestroyed(this.destroyRef),
                filter((trainingDefinition) => !!trainingDefinition && !!trainingDefinition.id),
            )
            .subscribe((trainingDefinition) =>
                this.authorsAssignService
                    .getAssigned(trainingDefinition.id, new OffsetPaginationEvent(0, this.defaultPaginationSize))
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
        return this.canDeactivateTDEdit && this.canDeactivateAuthors && this.unsavedLevels.length <= 0;
    }

    /**
     * Passes state of edited training definition to service and changes state of the component (canDeactivate)
     * @param $event training definition change event containing validity and new state
     */
    onTrainingDefinitionChanged($event: TrainingDefinitionChangeEvent): void {
        this.editService.change($event);
        this.canDeactivateTDEdit = false;
    }

    onControlsAction(control: SentinelControlItem): void {
        control.result$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => (this.canDeactivateTDEdit = true));
    }

    /**
     * Changes state of the component when one of the levels is saved
     * @param unsavedLevels unsaved levels emitted from child component
     */
    onUnsavedLevelsChanged(unsavedLevels: Level[]): void {
        this.unsavedLevels = unsavedLevels;
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
        this.canDeactivateAuthors = !hasUnsavedChanges;
    }
}
