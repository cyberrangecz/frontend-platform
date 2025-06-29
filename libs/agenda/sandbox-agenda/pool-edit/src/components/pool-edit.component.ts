import { ChangeDetectionStrategy, Component, DestroyRef, inject, OnInit } from '@angular/core';
import { SentinelControlItem } from '@sentinel/components/controls';
import { BehaviorSubject, combineLatest, defer, Observable, switchMap, tap } from 'rxjs';
import { map, take } from 'rxjs/operators';
import { PoolEditService } from 'libs/agenda/sandbox-agenda/pool-edit/src/services/pool-edit.service';
import { PoolFormGroup } from 'libs/agenda/sandbox-agenda/pool-edit/src/components/pool-form-group';
import { AbstractControl } from '@angular/forms';
import { Pool, SandboxDefinition } from '@crczp/sandbox-model';
import { ActivatedRoute } from '@angular/router';
import { PoolChangedEvent } from 'libs/agenda/sandbox-agenda/pool-edit/src/model/pool-changed-event';
import { SandboxDefinitionOverviewService } from '@crczp/sandbox-agenda/internal';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { OffsetPaginationEvent } from '@sentinel/common/pagination';

/**
 * Component with form for creating pool
 */
@Component({
    selector: 'crczp-sandbox-pool-create',
    templateUrl: './pool-edit.component.html',
    styleUrls: ['./pool-edit.component.css'],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PoolEditComponent implements OnInit {
    pool: Pool;
    poolFormGroup: PoolFormGroup;
    editMode = false;
    canDeactivatePoolEdit = true;
    controls: SentinelControlItem[];

    destroyRef = inject(DestroyRef);

    currentSandboxDefinitionFilter$: BehaviorSubject<string> = new BehaviorSubject('');
    filteredSandboxDefinitions$: Observable<SandboxDefinition[]> = combineLatest([
        this.sandboxDefinitionService.resource$,
        this.currentSandboxDefinitionFilter$,
    ]).pipe(
        map(([definitions, filter]) =>
            definitions.elements.filter((definition) =>
                this.sandboxDefinitionToDisplayString(definition).includes(filter),
            ),
        ),
    );

    constructor(
        private activeRoute: ActivatedRoute,
        private poolEditService: PoolEditService,
        private sandboxDefinitionService: SandboxDefinitionOverviewService,
    ) {
        this.activeRoute.data
            .pipe(
                tap((data) => {
                    this.pool = data.pool === undefined ? new Pool() : data.pool;
                    this.poolEditService.set(data.pool);
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
    }

    ngOnInit(): void {
        this.sandboxDefinitionService
            .getAll(new OffsetPaginationEvent(0, Number.MAX_SAFE_INTEGER, '', 'asc'))
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe();
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

    onControlsAction(control: SentinelControlItem): void {
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

    sandboxDefinitionToDisplayString(sandboxDefinition?: SandboxDefinition): string {
        if (!sandboxDefinition) {
            return '';
        }
        return sandboxDefinition.title + ' [' + sandboxDefinition.rev + ']';
    }

    private onChanged() {
        this.poolFormGroup.setValuesToPool(this.pool);
        this.canDeactivatePoolEdit = false;
        const change: PoolChangedEvent = new PoolChangedEvent(this.pool, this.poolFormGroup.formGroup.valid);
        this.poolEditService.change(change);
    }

    onSandboxDefinitionFilter($event: string) {
        this.currentSandboxDefinitionFilter$.next($event);
    }
}
