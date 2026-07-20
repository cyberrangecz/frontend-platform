import { Observable, OperatorFunction } from 'rxjs';
import { EntityType, EntityValueType, ResolveEntities, ResolveEntitiesSafe } from './entity-type';

/**
 * Resolves entity IDs to typed entity objects.
 *
 * @contract Must cache per ID, so resolving the same IDs repeatedly — even every poll
 * tick — does not refetch. Callers resolve directly without their own caching or
 * deduplication layer.
 */
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

    /**
     * Imperatively batch-resolves a list of entity ids to a id→entity lookup Map.
     * Designed for aggregate (GROUP BY) panels where rows carry no single owned entity
     * id column and the pipeline-based {@link resolve} / {@link resolveSafe} operators
     * cannot be used. The caller joins the returned Map onto its aggregate rows.
     *
     * Duplicate ids in the input are tolerated and are silently deduplicated before
     * the fetch is issued.
     *
     * The implementation caches per individual entity ID at the HTTP API layer (see
     * class-level documentation). Repeat calls for already-cached IDs complete
     * synchronously without a network round-trip. Callers MUST NOT layer their own
     * caching on top.
     *
     * @param type  The entity type to fetch.
     * @param ids   The entity ids to resolve. Duplicates are tolerated.
     * @returns Observable that emits exactly one {@link Map} from numeric id to the
     *   resolved entity of type {@link EntityValueType}`[ET]`. Fetch errors propagate
     *   to the subscriber unchanged — no swallowing or fallback occurs.
     */
    abstract resolveMap<ET extends EntityType>(
        type: ET,
        ids: number[],
    ): Observable<Map<number, EntityValueType[ET]>>;
}
