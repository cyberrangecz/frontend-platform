import {OffsetPaginationEvent} from '@sentinel/common/pagination';
import {ChangeDetectionStrategy, Component, DestroyRef, HostListener, inject, OnInit} from '@angular/core';
import {async, combineLatestWith, Observable, switchMap} from 'rxjs';
import {TrainingDefinitionInfo, TrainingInstance} from '@crczp/training-model';
import {SentinelControlItem, SentinelControlItemSignal, SentinelControlsComponent} from '@sentinel/components/controls';
import {ActivatedRoute} from '@angular/router';
import {filter, map, take} from 'rxjs/operators';
import {AdaptiveInstanceEditService} from '../services/state/edit/adaptive-instance-edit.service';
import {AdaptiveInstanceEditControls} from '../models/adapter/adaptive-instance-edit-controls';
import {ADAPTIVE_INSTANCE_DATA_ATTRIBUTE_NAME} from '@crczp/training-agenda';
import {AdaptiveInstanceChangeEvent} from '../models/events/adaptive-instance-change-event';
import {AdaptiveInstanceEditConcreteService} from '../services/state/edit/adaptive-instance-edit-concrete.service';
import {OrganizersAssignService} from '../services/state/organizers-assign/organizers-assign.service';
import {Pool, SandboxDefinition} from '@crczp/sandbox-model';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {SentinelUserAssignComponent, SentinelUserAssignService} from '@sentinel/components/user-assign';
import {PaginationStorageService} from "@crczp/common";
import {
    MatExpansionPanel,
    MatExpansionPanelContent,
    MatExpansionPanelDescription,
    MatExpansionPanelHeader,
    MatExpansionPanelTitle
} from "@angular/material/expansion";
import {AdaptiveInstanceEditComponent} from "./adaptive-instance-edit/adaptive-instance-edit.component";
import {MatIcon} from "@angular/material/icon";
import {MatError} from "@angular/material/input";
import {MatDivider} from "@angular/material/divider";
import {AsyncPipe, NgIf} from "@angular/common";

@Component({
    selector: 'crczp-adaptive-instance-edit-overview',
    templateUrl: './adaptive-instance-edit-overview.component.html',
    styleUrls: ['./adaptive-instance-edit-overview.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    providers: [
        {provide: AdaptiveInstanceEditService, useClass: AdaptiveInstanceEditConcreteService},
        {provide: SentinelUserAssignService, useClass: OrganizersAssignService},
    ],
    imports: [
        MatIcon,
        MatError,
        MatExpansionPanelDescription,
        MatExpansionPanelTitle,
        MatExpansionPanelHeader,
        MatExpansionPanel,
        AdaptiveInstanceEditComponent,
        MatExpansionPanelContent,
        SentinelControlsComponent,
        MatDivider,
        AsyncPipe,
        SentinelUserAssignComponent,
        NgIf
    ]
})
export class AdaptiveInstanceEditOverviewComponent implements OnInit {
    readonly PAGE_SIZE: number = 999;

    trainingInstance$: Observable<TrainingInstance>;
    trainingDefinitions$: Observable<TrainingDefinitionInfo[]>;
    pools$: Observable<Pool[]>;
    sandboxDefinitions$: Observable<SandboxDefinition[]>;
    hasStarted$: Observable<boolean>;
    editMode$: Observable<boolean>;
    tiTitle$: Observable<string>;
    instanceValid$: Observable<boolean>;
    canDeactivateOrganizers = true;
    canDeactivateTIEdit = true;
    defaultPaginationSize: number;
    controls: SentinelControlItem[];
    destroyRef = inject(DestroyRef);
    protected readonly async = async;

    constructor(
        private activeRoute: ActivatedRoute,
        private paginationService: PaginationStorageService,
        private editService: AdaptiveInstanceEditService,
        private userAssignService: SentinelUserAssignService,
    ) {
        this.defaultPaginationSize = this.paginationService.DEFAULT_PAGE_SIZE;
        this.trainingInstance$ = this.editService.trainingInstance$;
        this.hasStarted$ = this.editService.hasStarted$;
        this.instanceValid$ = this.editService.instanceValid$;
        const saveDisabled$: Observable<boolean> = this.editService.saveDisabled$;
        this.editMode$ = this.editService.editMode$;
        this.tiTitle$ = this.editService.trainingInstance$.pipe(map((ti) => ti.title));
        this.activeRoute.data
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe((data) => this.editService.set(data[ADAPTIVE_INSTANCE_DATA_ATTRIBUTE_NAME]));

        this.trainingDefinitions$ = this.editService.releasedTrainingDefinitions$.pipe(
            combineLatestWith(this.editService.unreleasedTrainingDefinitions$),
            map(([released, unreleased]) => [...released.elements, ...unreleased.elements]),
        );
        this.pools$ = this.editService.pools$.pipe(map((pools) => pools.elements));
        this.sandboxDefinitions$ = this.editService.sandboxDefinitions$.pipe(
            map((definitions) => definitions.elements),
        );
        this.refreshTrainingDefinitions();
        this.refreshPools();
        this.refreshSandboxDefinitions();
        this.controls = AdaptiveInstanceEditControls.create(this.editService, saveDisabled$, this.instanceValid$);
    }

    ngOnInit(): void {
        this.editMode$
            .pipe(
                takeUntilDestroyed(this.destroyRef),
                filter((editMode) => editMode),
                switchMap(() => this.editService.trainingInstance$),
                takeUntilDestroyed(this.destroyRef),
                filter((trainingInstance) => !!trainingInstance && !!trainingInstance.id),
            )
            .subscribe((trainingInstance) =>
                this.userAssignService
                    .getAssigned(trainingInstance.id, new OffsetPaginationEvent(0, this.defaultPaginationSize))
                    .subscribe(),
            );
    }

    /**
     * Shows dialog asking the user if he really wants to leave the page after refresh or navigating to another page
     */
    @HostListener('window:beforeunload')
    canRefreshOrLeave(): boolean {
        return this.canDeactivateTIEdit && this.canDeactivateOrganizers;
    }

    onControlsAction(control: SentinelControlItemSignal): void {
        this.canDeactivateTIEdit = true;
        control.result$.pipe(take(1)).subscribe();
    }

    /**
     * Determines if all changes in sub components are saved and user can navigate to different component
     * @returns true if saved all his changes, false otherwise
     */
    canDeactivate(): boolean {
        return this.canDeactivateTIEdit && this.canDeactivateOrganizers;
    }

    /**
     * Changes canDeactivate state of the component
     * @param hasUnsavedChanges true if organizers component has unsaved changes, false otherwise
     */
    onOrganizersChanged(hasUnsavedChanges: boolean): void {
        this.canDeactivateOrganizers = !hasUnsavedChanges;
    }

    /**
     * Updates state of the training instance and changes canDeactivate state of the component
     * @param $event training instance change event, containing latest update of training instance and its validity
     */
    onTrainingInstanceChanged($event: AdaptiveInstanceChangeEvent): void {
        this.editService.change($event);
        this.canDeactivateTIEdit = false;
    }

    isLocalEnvironmentAllowed(): boolean {
        return this.editService.isLocalEnvironmentAllowed();
    }

    private refreshTrainingDefinitions() {
        const pagination = new OffsetPaginationEvent(0, this.PAGE_SIZE, '', 'asc');
        this.editService.getAllTrainingDefinitions(pagination, 'RELEASED').pipe(take(1)).subscribe();
        this.editService.getAllTrainingDefinitions(pagination, 'UNRELEASED').pipe(take(1)).subscribe();
    }

    private refreshPools() {
        const pagination = new OffsetPaginationEvent(0, this.PAGE_SIZE, '', 'asc');
        this.editService.getAllPools(pagination).pipe(take(1)).subscribe();
    }

    private refreshSandboxDefinitions() {
        const pagination = new OffsetPaginationEvent(0, this.PAGE_SIZE, '', 'asc');
        this.editService.getAllSandboxDefinitions(pagination).pipe(take(1)).subscribe();
    }
}
