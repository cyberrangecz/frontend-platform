import { inject, Injectable } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { PoolApi } from '@crczp/sandbox-api';
import { Pool, SandboxDefinition } from '@crczp/sandbox-model';
import {
    BehaviorSubject,
    combineLatest,
    defer,
    finalize,
    from,
    Observable,
    ReplaySubject,
} from 'rxjs';
import { map, switchMap, tap } from 'rxjs/operators';
import { SandboxDefinitionSelectComponent } from '../components/sandbox-definition-select/sandbox-definition-select.component';
import { PoolEditService } from './pool-edit.service';
import { PoolChangedEvent } from '../model/pool-changed-event';
import { ErrorHandlerService, NotificationService } from '@crczp/utils';
import { Routing } from '@crczp/routing-commons';

@Injectable()
export class PoolEditConcreteService extends PoolEditService {
    private router = inject(Router);
    private dialog = inject(MatDialog);
    private notificationService = inject(NotificationService);
    private errorHandler = inject(ErrorHandlerService);
    private api = inject(PoolApi);

    private editModeSubject$: BehaviorSubject<boolean> = new BehaviorSubject(
        false
    );
    /**
     * True if existing pool is edited, false if new one is created
     */
    editMode$: Observable<boolean> = this.editModeSubject$.asObservable();
    private requestsCountSubject$: BehaviorSubject<number> =
        new BehaviorSubject(0);
    isLoading$: Observable<boolean> = this.requestsCountSubject$
        .asObservable()
        .pipe(map((value: number) => value > 0));

    private poolSubject$: ReplaySubject<Pool> = new ReplaySubject();

    private isValidSubject$: BehaviorSubject<boolean> = new BehaviorSubject(
        false
    );

    /**
     * True if saving is disabled (for example invalid data), false otherwise
     */
    saveDisabled$: Observable<boolean> = combineLatest(
        this.isValidSubject$.asObservable(),
        this.isLoading$
    ).pipe(map(([valid, loading]) => !valid || loading));

    private editedPool: Pool;

    create(): Observable<any> {
        return defer(() => {
            this.requestsCountSubject$.next(
                this.requestsCountSubject$.value + 1
            );
            return this.api.createPool(this.editedPool).pipe(
                tap(
                    () =>
                        this.notificationService.emit(
                            'success',
                            'Pool was created'
                        ),
                    (err) =>
                        this.errorHandler.emitAPIError(err, 'Creating pool')
                ),
                switchMap(() =>
                    from(
                        this.router.navigate([
                            Routing.RouteBuilder.pool.build(),
                        ])
                    )
                ),
                finalize(() =>
                    this.requestsCountSubject$.next(
                        this.requestsCountSubject$.value - 1
                    )
                )
            );
        });
    }

    /**
     * Handles pool state changes. Updates internal state and emits observables
     * @param changeEvent edited group-overview change event
     */
    change(changeEvent: PoolChangedEvent): void {
        this.isValidSubject$.next(changeEvent.isValid);
        this.editedPool = changeEvent.pool;
    }

    /**
     * Updates pool with new data
     */
    update(): Observable<any> {
        return defer(() => {
            this.requestsCountSubject$.next(
                this.requestsCountSubject$.value + 1
            );
            return this.api.updatePool(this.editedPool).pipe(
                tap(
                    () => {
                        this.notificationService.emit(
                            'success',
                            'Pool was updated'
                        );
                        this.onSaved();
                    },
                    (err) => this.errorHandler.emitAPIError(err, 'Editing pool')
                ),
                finalize(() =>
                    this.requestsCountSubject$.next(
                        this.requestsCountSubject$.value - 1
                    )
                )
            );
        });
    }

    selectDefinition(
        currSelected: SandboxDefinition
    ): Observable<SandboxDefinition> {
        const dialogRef = this.dialog.open(SandboxDefinitionSelectComponent, {
            data: currSelected,
        });
        return dialogRef.afterClosed();
    }

    /**
     * Saves/creates edited pool
     */
    save(): Observable<any> {
        return (
            this.editModeSubject$.getValue() ? this.update() : this.create()
        ).pipe(
            tap(() => this.router.navigate([Routing.RouteBuilder.pool.build()]))
        );
    }

    /**
     * Sets pool to state
     * @param initialPool pool to state
     */
    set(initialPool: Pool): void {
        let pool = initialPool;
        this.setEditMode(pool);
        if (pool === null || pool === undefined) {
            pool = new Pool();
        }
        this.poolSubject$.next(pool);
    }

    private setEditMode(pool: Pool) {
        this.editModeSubject$.next(pool !== null && pool !== undefined);
    }

    private onSaved() {
        this.editModeSubject$.next(true);
        this.isValidSubject$.next(false);
        this.poolSubject$.next(this.editedPool);
        this.editedPool = null;
    }
}
