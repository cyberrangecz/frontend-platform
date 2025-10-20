import { ChangeDetectionStrategy, Component, DestroyRef, inject, OnInit } from '@angular/core';
import {
    SentinelControlItem,
    SentinelControlItemSignal,
    SentinelControlsComponent
} from '@sentinel/components/controls';
import { BehaviorSubject, combineLatest, defer, Observable, switchMap, tap } from 'rxjs';
import { map, take } from 'rxjs/operators';
import { PoolEditService } from '../services/pool-edit.service';
import { PoolFormGroup } from './pool-form-group';
import { AbstractControl, ReactiveFormsModule } from '@angular/forms';
import { Pool, SandboxDefinition } from '@crczp/sandbox-model';
import { ActivatedRoute } from '@angular/router';
import { PoolChangedEvent } from '../model/pool-changed-event';
import {
    SandboxDefinitionOverviewConcreteService,
    SandboxDefinitionOverviewService
} from '@crczp/sandbox-agenda/internal';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatCard, MatCardContent, MatCardHeader, MatCardTitle } from '@angular/material/card';
import { MatDivider } from '@angular/material/divider';
import {
    SentinelResourceSelectorComponent,
    SentinelSelectorElementDirective,
    SentinelSelectorSelectedElementDirective
} from '@sentinel/components/resource-selector';
import { AsyncPipe } from '@angular/common';
import { MatError, MatFormField, MatInput, MatLabel } from '@angular/material/input';
import { MatTooltip } from '@angular/material/tooltip';
import { MatCheckbox } from '@angular/material/checkbox';
import { createInfinitePaginationEvent } from '@crczp/api-common';

/**
 * Component with form for creating pool
 */
@Component({
    selector: 'crczp-sandbox-pool-create',
    templateUrl: './pool-edit.component.html',
    styleUrls: ['./pool-edit.component.css'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        MatCardTitle,
        MatCardHeader,
        MatCard,
        SentinelControlsComponent,
        MatCardContent,
        MatDivider,
        SentinelResourceSelectorComponent,
        MatError,
        SentinelSelectorSelectedElementDirective,
        SentinelSelectorElementDirective,
        MatFormField,
        MatTooltip,
        MatInput,
        MatInput,
        ReactiveFormsModule,
        MatLabel,
        AsyncPipe,
        MatCheckbox,
    ],
    providers: [
        {
            provide: SandboxDefinitionOverviewService,
            useClass: SandboxDefinitionOverviewConcreteService,
        },
        PoolEditService,
    ],
})
export class PoolEditComponent implements OnInit {
    pool: Pool;
    poolFormGroup: PoolFormGroup;
    editMode = false;
    canDeactivatePoolEdit = true;
    controls: SentinelControlItem[];
    destroyRef = inject(DestroyRef);
    currentSandboxDefinitionFilter$: BehaviorSubject<string> =
        new BehaviorSubject('');
    filteredSandboxDefinitions$: Observable<SandboxDefinition[]>;
    private activeRoute = inject(ActivatedRoute);
    private poolEditService = inject(PoolEditService);
    private sandboxDefinitionService = inject(SandboxDefinitionOverviewService);

    constructor() {
        this.activeRoute.data
            .pipe(
                tap((data) => {
                    this.pool =
                        data[Pool.name] === undefined
                            ? new Pool()
                            : data[Pool.name];
                    this.poolEditService.set(data[Pool.name]);
                }),
                switchMap(() => this.poolEditService.editMode$),
                tap((editMode) => {
                    this.editMode = editMode;
                    this.initControls(editMode);
                    this.poolFormGroup = new PoolFormGroup(this.pool, editMode);
                }),
                switchMap(() => this.poolFormGroup.formGroup.valueChanges),
            )
            .subscribe(() => this.onChanged());

        this.filteredSandboxDefinitions$ = combineLatest([
            this.sandboxDefinitionService.resource$,
            this.currentSandboxDefinitionFilter$,
        ]).pipe(
            map(([definitions, filter]) =>
                definitions.elements.filter((definition) =>
                    this.sandboxDefinitionToDisplayString(definition).includes(
                        filter,
                    ),
                ),
            ),
        );
    }

    get sandboxDefinition(): AbstractControl {
        return this.poolFormGroup.formGroup.get('sandboxDefinition');
    }

    get poolSize(): AbstractControl {
        return this.poolFormGroup.formGroup.get('poolSize');
    }

    get comment(): AbstractControl {
        return this.poolFormGroup.formGroup.get('comment');
    }

    ngOnInit(): void {
        this.sandboxDefinitionService
            .getAll(createInfinitePaginationEvent('name'))
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe();
    }

    onControlsAction(control: SentinelControlItemSignal): void {
        control.result$.pipe(take(1)).subscribe();
    }

    initControls(isEditMode: boolean): void {
        this.controls = [
            new SentinelControlItem(
                isEditMode ? 'save' : 'create',
                isEditMode ? 'Save' : 'Create',
                'primary',
                this.poolEditService.saveDisabled$,
                defer(() => this.poolEditService.save()),
            ),
        ];
    }

    /**
     * Check the amount of allocated sandboxes and make sure the user doesn't set the number below.
     */
    getMinimumPoolSize(): number {
        return this.pool ? this.pool.usedSize : 0;
    }

    sandboxDefinitionToDisplayString(
        sandboxDefinition?: SandboxDefinition,
    ): string {
        if (!sandboxDefinition) {
            return '';
        }
        return sandboxDefinition.title + ' [' + sandboxDefinition.rev + ']';
    }

    onSandboxDefinitionFilter($event: string) {
        this.currentSandboxDefinitionFilter$.next($event);
    }

    private onChanged() {
        this.poolFormGroup.setValuesToPool(this.pool);
        this.canDeactivatePoolEdit = false;
        const change: PoolChangedEvent = new PoolChangedEvent(
            this.pool,
            this.poolFormGroup.formGroup.valid,
        );
        this.poolEditService.change(change);
    }
}
