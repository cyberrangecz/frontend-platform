import { OperatorFunction } from 'rxjs';
import {
    EntityType,
    ResolveEntities,
    ResolveEntitiesSafe,
} from './entity-type';

export abstract class EntityResolverService {
    /**
     * RxJS operator that resolves ID fields to entity objects.
     * Removes each entity type's owned ID fields from result rows and inserts
     * the resolved entity under its output key. Errors from batch fetches propagate.
     *
     * @param entityTypes Entity types to resolve. Each type owns a set of DB column
     *   names and maps to a typed output key.
     */
    abstract resolve<T, const ETs extends readonly EntityType[]>(
        entityTypes: ETs,
    ): OperatorFunction<T[], ResolveEntities<T, ETs>[]>;

    /**
     * Tolerant variant of {@link resolve}. When a batch fetch fails or an entity ID
     * is absent from the response, falls back to `{ <outputKey>Id: number }` instead
     * of erroring. Per-entity-type failures are caught independently.
     *
     * @param entityTypes Entity types to resolve.
     */
    abstract resolveSafe<T, const ETs extends readonly EntityType[]>(
        entityTypes: ETs,
    ): OperatorFunction<T[], ResolveEntitiesSafe<T, ETs>[]>;
}
