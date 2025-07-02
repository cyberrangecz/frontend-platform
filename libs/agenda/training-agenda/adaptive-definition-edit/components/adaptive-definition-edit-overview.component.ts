import {ChangeDetectionStrategy, Component, DestroyRef, HostListener, inject, OnInit,} from '@angular/core';
import {ActivatedRoute} from '@angular/router';
import {
    SentinelControlItem,
    SentinelControlItemSignal,
    SentinelControlsComponent,
} from '@sentinel/components/controls';
import {MitreTechnique, Phase, TrainingDefinition,} from '@crczp/training-model';
import {async, combineLatest, Observable, switchMap} from 'rxjs';
import {filter, map, tap} from 'rxjs/operators';
import {TrainingDefinitionEditControls} from '../model/adapters/training-definition-edit-controls';
import {TrainingDefinitionChangeEvent} from '../model/events/training-definition-change-event';
import {AdaptiveDefinitionEditService} from '../services/state/edit/adaptive-definition-edit.service';
import {ADAPTIVE_DEFINITION_DATA_ATTRIBUTE_NAME} from '@crczp/training-agenda';
import {AdaptiveDefinitionEditConcreteService} from '../services/state/edit/adaptive-definition-edit-concrete.service';
import {AuthorsAssignService} from '../services/state/authors-assign/authors-assign.service';
import {PhaseEditService} from '../services/state/phase/phase-edit.service';
import {PhaseEditConcreteService} from '../services/state/phase/phase-edit-concrete.service';
import {MitreTechniquesService} from '../services/state/mitre-techniques/mitre-techniques.service';
import {MitreTechniquesConcreteService} from '../services/state/mitre-techniques/mitre-techniques-concrete.service';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {OffsetPaginationEvent} from '@sentinel/common/pagination';
import {SentinelUserAssignComponent, SentinelUserAssignService,} from '@sentinel/components/user-assign';
import {PaginationStorageService} from '@crczp/common';
import {
    MatExpansionPanel,
    MatExpansionPanelContent,
    MatExpansionPanelDescription,
    MatExpansionPanelHeader,
    MatExpansionPanelTitle,
} from '@angular/material/expansion';
import {MatDivider} from '@angular/material/divider';
import {AsyncPipe, NgIf} from '@angular/common';
import {ModelSimulatorComponentWrapper} from './model-simulator/model-simulator-component-wrapper.component';
import {MatError} from '@angular/material/input';
import {MatIcon} from '@angular/material/icon';
import {PhaseOverviewComponent} from './phases/overview/phase-overview.component';
import {
    AdaptiveTrainingDefinitionEditComponent
} from './adaptive-definition/adaptive-training-definition-edit.component';

/**
 * Main smart component of training definition edit/new page.
 */
@Component({
    selector: 'crczp-adaptive-definition-detail',
    templateUrl: './adaptive-definition-edit-overview.component.html',
    styleUrls: ['./adaptive-definition-edit-overview.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    providers: [
        {
            provide: AdaptiveDefinitionEditService,
            useClass: AdaptiveDefinitionEditConcreteService,
        },
        {provide: PhaseEditService, useClass: PhaseEditConcreteService},
        {provide: SentinelUserAssignService, useClass: AuthorsAssignService},
        {
            provide: MitreTechniquesService,
            useClass: MitreTechniquesConcreteService,
        },
    ],
    imports: [
        MatError,
        MatExpansionPanelContent,
        MatDivider,
        AsyncPipe,
        SentinelUserAssignComponent,
        ModelSimulatorComponentWrapper,
        MatIcon,
        MatExpansionPanel,
        MatExpansionPanelHeader,
        MatExpansionPanelDescription,
        MatExpansionPanelTitle,
        NgIf,
        PhaseOverviewComponent,
        AdaptiveTrainingDefinitionEditComponent,
        SentinelControlsComponent,
    ],
})
export class AdaptiveDefinitionEditOverviewComponent implements OnInit {
    private activeRoute = inject(ActivatedRoute);
    private paginationService = inject(PaginationStorageService);
    private editService = inject(AdaptiveDefinitionEditService);
    private phaseEditService = inject(PhaseEditService);
    private mitreTechniquesService = inject(MitreTechniquesService);
    private authorsAssignService = inject(SentinelUserAssignService);

    trainingDefinition$: Observable<TrainingDefinition>;
    editMode$: Observable<boolean>;
    tdTitle$: Observable<string>;
    phasesCount = -1;
    definitionSaveDisabled$: Observable<boolean>;
    phasesSaveDisabled$: Observable<boolean>;
    phases$: Observable<Phase[]>;
    trainingPhasesCount$: Observable<number>;
    unsavedPhases: Phase[] = [];
    canDeactivateAuthors = true;
    canDeactivateTDEdit = true;
    defaultPaginationSize: number;
    controls: SentinelControlItem[];
    mitreTechniques$: Observable<MitreTechnique[]>;
    destroyRef = inject(DestroyRef);
    protected readonly async = async;

    constructor() {
        this.defaultPaginationSize = this.paginationService.DEFAULT_PAGE_SIZE;
        this.trainingDefinition$ = this.editService.trainingDefinition$;
        this.tdTitle$ = this.editService.trainingDefinition$.pipe(
            map((td) => td.title)
        );
        this.definitionSaveDisabled$ = this.editService.saveDisabled$;
        this.phasesSaveDisabled$ = this.phaseEditService.saveDisabled$;
        this.mitreTechniques$ = this.mitreTechniquesService.mitreTechniques$;
        this.phases$ = this.phaseEditService.phases$;
        this.trainingPhasesCount$ =
            this.phaseEditService.presentTrainingPhases$.pipe(
                map((phases) => phases.length)
            );
        this.mitreTechniquesService
            .getAll()
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe();
        const valid$: Observable<boolean> = combineLatest(
            this.editService.definitionValid$,
            this.phaseEditService.phasesValid$
        ).pipe(map((valid) => valid[0] && valid[1]));
        this.activeRoute.data
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe((data) =>
                this.editService.set(
                    data[ADAPTIVE_DEFINITION_DATA_ATTRIBUTE_NAME]
                )
            );
        this.editMode$ = this.editService.editMode$.pipe(
            tap(
                () =>
                    (this.controls = TrainingDefinitionEditControls.create(
                        this.editService,
                        this.definitionSaveDisabled$,
                        this.phasesSaveDisabled$,
                        valid$
                    ))
            )
        );
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
                        !!trainingDefinition && !!trainingDefinition.id
                )
            )
            .subscribe((trainingDefinition) =>
                this.authorsAssignService
                    .getAssigned(
                        trainingDefinition.id,
                        new OffsetPaginationEvent(0, this.defaultPaginationSize)
                    )
                    .subscribe()
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
     * Determines if all changes in subcomponents are saved and user can navigate to different page
     */
    canDeactivate(): boolean {
        return (
            this.canDeactivateTDEdit &&
            this.canDeactivateAuthors &&
            this.unsavedPhases.length <= 0
        );
    }

    /**
     * Passes state of edited training definition to service and changes state of the component (canDeactivate)
     * @param $event training definition change event containing validity and new state
     */
    onTrainingDefinitionChanged($event: TrainingDefinitionChangeEvent): void {
        this.editService.change($event);
        this.canDeactivateTDEdit = false;
    }

    onControlsAction(control: SentinelControlItemSignal): void {
        control.result$
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe(() => (this.canDeactivateTDEdit = true));
    }

    /**
     * Changes state of the component when one of the phase is saved
     * @param unsavedPhases unsaved phase emitted from child component
     */
    onUnsavedPhasesChanged(unsavedPhases: Phase[]): void {
        this.unsavedPhases = unsavedPhases;
    }

    /**
     * Changes state of the component when phase is added or deleted
     * @param count new count of phase
     */
    onPhasesCountChanged(count: number): void {
        this.phasesCount = count;
    }

    /**
     * Changes state of the component when authors of the training definition are changed
     * @param hasUnsavedChanges true if the child component has unsaved, false otherwise
     */
    onAuthorsChanged(hasUnsavedChanges: boolean): void {
        this.canDeactivateAuthors = !hasUnsavedChanges;
    }
}
