import { inject, Injectable } from '@angular/core';
import { forkJoin, Observable, of, OperatorFunction } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
import { Utils } from '@crczp/utils';

import { EntityFetchApi, FetcherMap } from '../entity-fetch-api.service';
import { EntityResolverService } from '../entity-resolver.service';
import { provideEntityResolverService } from '../provide-entity-resolver';
import {
    EntityType,
    EntityValueType,
    ResolveEntities,
    ResolveEntitiesSafe,
} from '../entity-type';
import { ENTITY_REGISTRY } from './entity-registry';
import { collectIds } from './id-collector';
import { EnrichmentSpec, enrichRows } from './row-enricher';

@Injectable()
export class EntityResolverServiceImpl extends EntityResolverService {
    private readonly fetchers: FetcherMap;

    constructor() {
        super();
        Utils.Provision.warnMissingProviders([EntityFetchApi], provideEntityResolverService);
        const api = inject(EntityFetchApi);

        this.fetchers = {
            [EntityType.Instance]: (ids) => api.fetchInstances(ids),
            [EntityType.TrainingRun]: (ids) => api.fetchTrainingRuns(ids),
            [EntityType.User]: (ids) => api.fetchUsers(ids),
            [EntityType.Level]: (ids) => api.fetchLevels(ids),
            [EntityType.TrainingDefinition]: (ids) => api.fetchTrainingDefinitions(ids),
            [EntityType.Hint]: (ids) => api.fetchHints(ids),
        };
    }

    override resolve<TRow, const ETs extends readonly EntityType[]>(
        entityTypes: ETs,
    ): OperatorFunction<TRow[], ResolveEntities<TRow, ETs>[]> {
        return (source$) =>
            source$.pipe(
                switchMap((rows) =>
                    this.doResolve(
                        rows as Record<string, unknown>[],
                        entityTypes,
                        false,
                    ),
                ),
            ) as Observable<ResolveEntities<TRow, ETs>[]>;
    }

    override resolveSafe<TRow, const ETs extends readonly EntityType[]>(
        entityTypes: ETs,
    ): OperatorFunction<TRow[], ResolveEntitiesSafe<TRow, ETs>[]> {
        return (source$) =>
            source$.pipe(
                switchMap((rows) =>
                    this.doResolve(
                        rows as Record<string, unknown>[],
                        entityTypes,
                        true,
                    ),
                ),
            ) as Observable<ResolveEntitiesSafe<TRow, ETs>[]>;
    }

    override resolveMap<ET extends EntityType>(
        type: ET,
        ids: number[],
    ): Observable<Map<number, EntityValueType[ET]>> {
        const dedupedIds = [...new Set(ids)];
        if (dedupedIds.length === 0) {
            return of(new Map<number, EntityValueType[ET]>());
        }
        return this.fetchers[type](dedupedIds).pipe(
            map((entities) => new Map(entities.map((entity) => [entity.id, entity]))),
        );
    }

    private doResolve(
        rows: Record<string, unknown>[],
        entityTypes: readonly EntityType[],
        safe: boolean,
    ): Observable<Record<string, unknown>[]> {
        if (rows.length === 0) return of([]);

        const pending = entityTypes
            .map((entityType) => this.buildEntityFetch$(entityType, rows, safe))
            .filter((obs): obs is Observable<EnrichmentSpec> => obs !== null);

        if (pending.length === 0) return of(rows);
        return forkJoin(pending).pipe(map((specs) => enrichRows(rows, specs)));
    }

    private buildEntityFetch$<ET extends EntityType>(
        entityType: ET,
        rows: Record<string, unknown>[],
        safe: boolean,
    ): Observable<EnrichmentSpec> | null {
        const entry = ENTITY_REGISTRY[entityType];
        const collected = collectIds(rows, entry);
        if (collected === null) return null;

        const fetch$ = this.fetchers[entityType](collected.ids).pipe(
            map(
                (entities) =>
                    ({
                        matchedField: collected.matchedField,
                        outputKey: entry.outputKey,
                        entityMap: new Map<number, unknown>(
                            entities.map((entity) => [entity[entry.idField], entity]),
                        ),
                        safe,
                    }) satisfies EnrichmentSpec,
            ),
        );

        if (!safe) return fetch$;

        return fetch$.pipe(
            catchError(() =>
                of({
                    matchedField: collected.matchedField,
                    outputKey: entry.outputKey,
                    entityMap: new Map<number, unknown>(),
                    safe: true,
                } satisfies EnrichmentSpec),
            ),
        );
    }
}
