import { TrainingDefinitionInfo, TrainingInstance } from '@crczp/training-model';
import { BehaviorSubject, Observable, timer } from 'rxjs';
import { filter, map, switchMap } from 'rxjs/operators';
import { TrainingInstanceChangeEvent } from '../../../model/events/training-instance-change-event';
import { Pool, SandboxDefinition } from '@crczp/sandbox-model';
import { OffsetPagination, OffsetPaginationEvent, PaginatedResource } from '@sentinel/common/pagination';

/**
 * Layer between component and API service. Implement concrete service by extending this class.
 * Provide concrete class in Angular Module. For more info see https://angular.io/guide/dependency-injection-providers.
 * Subscribe to trainingInstance$ to receive latest data updates.
 */
export abstract class TrainingInstanceEditService {
    protected trainingInstanceSubject$: BehaviorSubject<TrainingInstance> = new BehaviorSubject(undefined);

    /**
     * Currently edited training instance
     */
    trainingInstance$: Observable<TrainingInstance> = this.trainingInstanceSubject$
        .asObservable()
        .pipe(filter((ti) => ti !== undefined && ti !== null));

    protected releasedTrainingDefinitionsSubject: BehaviorSubject<PaginatedResource<TrainingDefinitionInfo>> =
        new BehaviorSubject(this.initTrainingDefinitions(999));

    releasedTrainingDefinitions$: Observable<PaginatedResource<TrainingDefinitionInfo>> =
        this.releasedTrainingDefinitionsSubject.asObservable();

    protected unreleasedTrainingDefinitionsSubject: BehaviorSubject<PaginatedResource<TrainingDefinitionInfo>> =
        new BehaviorSubject(this.initTrainingDefinitions(999));

    unreleasedTrainingDefinitions$: Observable<PaginatedResource<TrainingDefinitionInfo>> =
        this.unreleasedTrainingDefinitionsSubject.asObservable();

    protected poolsSubject$: BehaviorSubject<PaginatedResource<Pool>> = new BehaviorSubject(this.initPools(999));

    pools$: Observable<PaginatedResource<Pool>> = this.poolsSubject$.asObservable();

    protected sandboxDefinitionsSubject$: BehaviorSubject<PaginatedResource<SandboxDefinition>> = new BehaviorSubject(
        this.initSandboxDefinitions(999),
    );

    sandboxDefinitions$: Observable<PaginatedResource<SandboxDefinition>> =
        this.sandboxDefinitionsSubject$.asObservable();

    /**
     * Current mode (edit - true or create - false)
     */
    protected editModeSubject$: BehaviorSubject<boolean> = new BehaviorSubject(false);

    editMode$: Observable<boolean> = this.editModeSubject$.asObservable();

    protected instanceValidSubject$: BehaviorSubject<boolean> = new BehaviorSubject(true);

    /**
     * True if it training instance is in valid state, false otherwise
     */
    instanceValid$ = this.instanceValidSubject$.asObservable();

    hasStarted$: Observable<boolean>;

    protected saveDisabledSubject$: BehaviorSubject<boolean> = new BehaviorSubject(true);

    /**
     * True if it is possible to save edited training instance in its current state, false otherwise
     */
    abstract saveDisabled$: Observable<boolean>;

    protected constructor() {
        this.hasStarted$ = timer(1).pipe(
            switchMap(() => this.trainingInstance$),
            map((ti) => ti?.hasStarted()),
        );
    }

    /**
     * Sets training instance as currently edited
     * @param trainingInstance to set as currently edited
     */
    abstract set(trainingInstance: TrainingInstance): void;

    /**
     * Saves changes in currently edited training instance
     */
    abstract save(): Observable<any>;

    /**
     * Handles changes of edited training instance
     * @param changeEvent training instance object and its validity
     */
    abstract change(changeEvent: TrainingInstanceChangeEvent): void;

    /**
     * Handles change of pool selection
     * @param poolId pool ID of selected pool
     */
    abstract poolSelectionChange(poolId: number): void;

    /**
     * Handles change of sandbox definition selection
     * @param sandboxDefinitionId ID of selected sandbox definition
     */
    abstract sandboxDefinitionSelectionChange(sandboxDefinitionId: number): void;

    abstract getAllTrainingDefinitions(
        OffsetPaginationEvent: OffsetPaginationEvent,
        stateFilter: string,
    ): Observable<PaginatedResource<TrainingDefinitionInfo>>;

    abstract getAllPools(OffsetPaginationEvent: OffsetPaginationEvent): Observable<PaginatedResource<Pool>>;

    abstract getAllSandboxDefinitions(
        OffsetPaginationEvent: OffsetPaginationEvent,
    ): Observable<PaginatedResource<SandboxDefinition>>;

    /**
     * Check whether to give the user the option to
     * create local environment training instance
     */
    abstract isLocalEnvironmentAllowed(): boolean;

    protected initTrainingDefinitions(pageSize: number): PaginatedResource<TrainingDefinitionInfo> {
        return new PaginatedResource([], new OffsetPagination(0, 0, pageSize, 0, 0));
    }

    protected initPools(pageSize: number): PaginatedResource<Pool> {
        return new PaginatedResource([], new OffsetPagination(0, 0, pageSize, 0, 0));
    }

    protected initSandboxDefinitions(pageSize: number): PaginatedResource<SandboxDefinition> {
        return new PaginatedResource([], new OffsetPagination(0, 0, pageSize, 0, 0));
    }
}
