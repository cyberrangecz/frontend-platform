import { Pool, SandboxDefinition } from '@crczp/sandbox-model';
import { Observable } from 'rxjs';
import { PoolChangedEvent } from '../model/pool-changed-event';

export abstract class PoolEditService {
    /**
     * True if existing pool is edited, false if new is created
     */
    abstract editMode$: Observable<boolean>;

    /**
     * True if save is disabled (for example invalid data), false otherwise
     */
    abstract saveDisabled$: Observable<boolean>;

    abstract selectDefinition(currSelected: SandboxDefinition): Observable<SandboxDefinition>;

    /**
     * Creates a new pool
     */
    abstract create(): Observable<any>;

    abstract change(changeEvent: PoolChangedEvent): void;

    /**
     * Updates pool with new data
     */
    abstract update(): Observable<any>;

    /**
     * Sets pool for editing
     * @param pool pool to be edited
     */
    abstract set(pool: Pool): void;

    /**
     * Saves/creates edited pool
     */
    abstract save(): Observable<any>;
}
