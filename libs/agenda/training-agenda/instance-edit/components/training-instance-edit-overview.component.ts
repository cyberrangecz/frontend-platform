import { ChangeDetectionStrategy, Component, DestroyRef, HostListener, inject, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import {
    SentinelControlItem,
    SentinelControlItemSignal,
    SentinelControlsComponent
} from '@sentinel/components/controls';
import { TrainingDefinitionInfo, TrainingInstance } from '@crczp/training-model';
import { BehaviorSubject, combineLatestWith, Observable, switchMap } from 'rxjs';
import { filter, map, take } from 'rxjs/operators';
import { TrainingInstanceEditControls } from '../model/adapter/training-instance-edit-controls';
import { TrainingInstanceChangeEvent } from '../model/events/training-instance-change-event';
import { Pool, SandboxDefinition } from '@crczp/sandbox-model';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { SentinelUserAssignComponent, SentinelUserAssignService } from '@sentinel/components/user-assign';
import {
    MatExpansionPanel,
    MatExpansionPanelContent,
    MatExpansionPanelDescription,
    MatExpansionPanelHeader,
    MatExpansionPanelTitle
} from '@angular/material/expansion';
import { AsyncPipe } from '@angular/common';
import { MatIcon } from '@angular/material/icon';
import { MatError } from '@angular/material/input';
import { TrainingInstanceEditComponent } from './training-instance-edit/training-instance-edit.component';
import { MatDivider } from '@angular/material/divider';
import { CommonTrainingInstanceEditService } from '../services/state/edit/common-training-instance-edit.service';
import { createInfinitePaginationEvent, createPaginationEvent } from '@crczp/api-common';
import { PoolSort, SandboxDefinitionSort } from '@crczp/sandbox-api';
import { TrainingDefinitionSort, TrainingInstanceSort } from '@crczp/training-api';

/**
 * Main component of training instance edit/create page. Serves mainly as a smart component wrapper
 */
@Component({
    selector: 'crczp-training-instance-edit-overview',
    templateUrl: './training-instance-edit-overview.component.html',
    styleUrls: ['./training-instance-edit-overview.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        SentinelControlsComponent,
        MatIcon,
        MatExpansionPanelDescription,
        MatExpansionPanelTitle,
        MatExpansionPanelHeader,
        MatExpansionPanel,
        MatExpansionPanelContent,
        MatIcon,
        MatError,
        AsyncPipe,
        TrainingInstanceEditComponent,
        MatDivider,
        SentinelUserAssignComponent,
    ],
})
export class TrainingInstanceEditOverviewComponent implements OnInit {
    readonly PAGE_SIZE: number = 999;
    protected tiTitle$: Observable<string>;
    protected editMode$: Observable<boolean>;
    protected controls: SentinelControlItem[];
    protected trainingInstance$: Observable<TrainingInstance>;
    protected trainingDefinitions$: Observable<TrainingDefinitionInfo[]>;
    protected pools$: Observable<Pool[]>;
    protected sandboxDefinitions$: Observable<SandboxDefinition[]>;
    protected hasStarted$: Observable<boolean>;
    protected readonly canDeactivateOrganizers = new BehaviorSubject<boolean>(
        true,
    );
    protected readonly canDeactivateTIEdit = new BehaviorSubject<boolean>(true);
    private readonly instanceValid$: Observable<boolean>;
    private destroyRef = inject(DestroyRef);
    private readonly activeRoute = inject(ActivatedRoute);
    private readonly editService = inject(CommonTrainingInstanceEditService);
    private readonly organizersAssignService = inject(
        SentinelUserAssignService,
    );
    private trainingInstancePagination =
        createPaginationEvent<TrainingInstanceSort>({
            sort: 'id',
            sortDir: 'asc',
        });

    constructor() {
        this.trainingInstance$ = this.editService.trainingInstance$;
        this.hasStarted$ = this.editService.hasStarted$;
        this.instanceValid$ = this.editService.instanceValid$;
        const saveDisabled$: Observable<boolean> =
            this.editService.saveDisabled$;
        this.editMode$ = this.editService.editMode$;
        this.tiTitle$ = this.editService.trainingInstance$.pipe(
            map((ti) => ti.title),
        );
        this.activeRoute.data
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe((data) =>
                this.editService.set(data[TrainingInstance.name] || null),
            );

        this.trainingDefinitions$ =
            this.editService.releasedTrainingDefinitions$.pipe(
                combineLatestWith(
                    this.editService.unreleasedTrainingDefinitions$,
                ),
                map(([released, unreleased]) => [
                    ...released.elements,
                    ...unreleased.elements,
                ]),
            );
        this.pools$ = this.editService.pools$.pipe(
            map((pools) => pools.elements),
        );
        this.sandboxDefinitions$ = this.editService.sandboxDefinitions$.pipe(
            map((definitions) => definitions.elements),
        );
        this.refreshTrainingDefinitions();
        this.refreshPools();
        this.refreshSandboxDefinitions();
        this.controls = TrainingInstanceEditControls.create(
            this.editService,
            saveDisabled$,
            this.instanceValid$,
        );
    }

    ngOnInit(): void {
        this.editMode$
            .pipe(
                takeUntilDestroyed(this.destroyRef),
                filter((editMode) => editMode),
                switchMap(() => this.editService.trainingInstance$),
                takeUntilDestroyed(this.destroyRef),
                filter(
                    (trainingInstance) =>
                        !!trainingInstance && !!trainingInstance.id,
                ),
            )
            .subscribe((trainingInstance) =>
                this.organizersAssignService
                    .getAssigned(
                        trainingInstance.id,
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
        return (
            this.canDeactivateTIEdit.value && this.canDeactivateOrganizers.value
        );
    }

    onControlsAction(control: SentinelControlItemSignal): void {
        this.canDeactivateTIEdit.next(true);
        control.result$.pipe(take(1)).subscribe();
    }

    /**
     * Changes canDeactivate state of the component
     * @param hasUnsavedChanges true if organizers component has unsaved changes, false otherwise
     */
    onOrganizersChanged(hasUnsavedChanges: boolean): void {
        this.canDeactivateOrganizers.next(!hasUnsavedChanges);
    }

    /**
     * Updates state of the training instance and changes canDeactivate state of the component
     * @param $event training instance change event, containing latest update of training instance and its validity
     */
    onTrainingInstanceChanged($event: TrainingInstanceChangeEvent): void {
        this.editService.change($event);
        this.canDeactivateTIEdit.next(false);
    }

    isLocalEnvironmentAllowed(): boolean {
        return this.editService.isLocalEnvironmentAllowed();
    }

    private refreshTrainingDefinitions() {
        const pagination =
            createInfinitePaginationEvent<TrainingDefinitionSort>('title');
        this.editService
            .getAllTrainingDefinitions(pagination, 'RELEASED')
            .pipe(take(1))
            .subscribe();
        this.editService
            .getAllTrainingDefinitions(pagination, 'UNRELEASED')
            .pipe(take(1))
            .subscribe();
    }

    private refreshPools() {
        this.editService
            .getAllPools(createInfinitePaginationEvent<PoolSort>('id'))
            .pipe(take(1))
            .subscribe();
    }

    private refreshSandboxDefinitions() {
        this.editService
            .getAllSandboxDefinitions(
                createInfinitePaginationEvent<SandboxDefinitionSort>('name'),
            )
            .pipe(take(1))
            .subscribe();
    }
}
