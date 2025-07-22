import {ChangeDetectionStrategy, Component, DestroyRef, HostListener, inject, OnInit,} from '@angular/core';
import {ActivatedRoute} from '@angular/router';
import {OffsetPaginationEvent} from '@sentinel/common/pagination';
import {SentinelControlItem, SentinelControlItemSignal, SentinelControlsComponent} from '@sentinel/components/controls';
import {TrainingDefinitionInfo, TrainingInstance,} from '@crczp/training-model';
import {combineLatestWith, Observable, switchMap} from 'rxjs';
import {filter, map, take} from 'rxjs/operators';
import {TrainingInstanceEditControls} from '../model/adapter/training-instance-edit-controls';
import {TrainingInstanceChangeEvent} from '../model/events/training-instance-change-event';
import {TrainingInstanceEditService} from '../services/state/edit/training-instance-edit.service';
import {TrainingInstanceEditConcreteService} from '../services/state/edit/training-instance-edit-concrete.service';
import {OrganizersAssignService} from '../services/state/organizers-assign/organizers-assign.service';
import {Pool, SandboxDefinition} from '@crczp/sandbox-model';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {SentinelUserAssignComponent, SentinelUserAssignService} from '@sentinel/components/user-assign';
import {
    MatExpansionPanel,
    MatExpansionPanelContent,
    MatExpansionPanelDescription,
    MatExpansionPanelHeader,
    MatExpansionPanelTitle
} from "@angular/material/expansion";
import {MatDivider} from "@angular/material/divider";
import {TrainingInstanceEditComponent} from "./training-instance-edit/training-instance-edit.component";
import {MatIcon} from "@angular/material/icon";
import {MatError} from "@angular/material/input";
import {AsyncPipe} from "@angular/common";
import {PortalConfig} from "@crczp/common";
import {TrainingInstanceCanDeactivate} from "../services/can-deactivate/training-instance-can-deactivate.service";

/**
 * Main component of training instance edit/create page. Serves mainly as a smart component wrapper
 */
@Component({
    selector: 'crczp-training-instance-edit-overview',
    templateUrl: './training-instance-edit-overview.component.html',
    styleUrls: ['./training-instance-edit-overview.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    providers: [
        {
            provide: TrainingInstanceEditService,
            useClass: TrainingInstanceEditConcreteService,
        },
        {
            provide: SentinelUserAssignService,
            useClass: OrganizersAssignService,
        },
        TrainingInstanceCanDeactivate
    ],
    imports: [
        MatExpansionPanel,
        MatExpansionPanelHeader,
        MatExpansionPanelTitle,
        MatExpansionPanelDescription,
        MatIcon,
        MatError,
        MatExpansionPanelContent,
        SentinelControlsComponent,
        MatDivider,
        TrainingInstanceEditComponent,
        AsyncPipe,
        SentinelUserAssignComponent
    ]
})
export class TrainingInstanceEditOverviewComponent implements OnInit {
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
    private activeRoute = inject(ActivatedRoute);
    private editService = inject(TrainingInstanceEditService);
    private organizersAssignService = inject(SentinelUserAssignService);

    constructor() {
        const settings = inject(PortalConfig);

        this.defaultPaginationSize = settings.defaultPageSize;
        this.trainingInstance$ = this.editService.trainingInstance$;
        this.hasStarted$ = this.editService.hasStarted$;
        this.instanceValid$ = this.editService.instanceValid$;
        const saveDisabled$: Observable<boolean> =
            this.editService.saveDisabled$;
        this.editMode$ = this.editService.editMode$;
        this.tiTitle$ = this.editService.trainingInstance$.pipe(
            map((ti) => ti.title)
        );
        this.activeRoute.data
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe((data) =>
                this.editService.set(
                    data[TrainingInstance.name]
                )
            );

        this.trainingDefinitions$ =
            this.editService.releasedTrainingDefinitions$.pipe(
                combineLatestWith(
                    this.editService.unreleasedTrainingDefinitions$
                ),
                map(([released, unreleased]) => [
                    ...released.elements,
                    ...unreleased.elements,
                ])
            );
        this.pools$ = this.editService.pools$.pipe(
            map((pools) => pools.elements)
        );
        this.sandboxDefinitions$ = this.editService.sandboxDefinitions$.pipe(
            map((definitions) => definitions.elements)
        );
        this.refreshTrainingDefinitions();
        this.refreshPools();
        this.refreshSandboxDefinitions();
        this.controls = TrainingInstanceEditControls.create(
            this.editService,
            saveDisabled$,
            this.instanceValid$
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
                        !!trainingInstance && !!trainingInstance.id
                )
            )
            .subscribe((trainingInstance) =>
                this.organizersAssignService
                    .getAssigned(
                        trainingInstance.id,
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
    onTrainingInstanceChanged($event: TrainingInstanceChangeEvent): void {
        this.editService.change($event);
        this.canDeactivateTIEdit = false;
    }

    isLocalEnvironmentAllowed(): boolean {
        return this.editService.isLocalEnvironmentAllowed();
    }

    private refreshTrainingDefinitions() {
        const pagination = new OffsetPaginationEvent(
            0,
            this.PAGE_SIZE,
            '',
            'asc'
        );
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
        const pagination = new OffsetPaginationEvent(
            0,
            this.PAGE_SIZE,
            '',
            'asc'
        );
        this.editService.getAllPools(pagination).pipe(take(1)).subscribe();
    }

    private refreshSandboxDefinitions() {
        const pagination = new OffsetPaginationEvent(
            0,
            this.PAGE_SIZE,
            '',
            'asc'
        );
        this.editService
            .getAllSandboxDefinitions(pagination)
            .pipe(take(1))
            .subscribe();
    }
}
