import { inject, Injectable } from '@angular/core';
import { CRCZPHttpService } from '@crczp/api-common';
import { PortalConfig } from '@crczp/utils';
import { Observable } from 'rxjs';
import { RawEventRow } from '../../cache/cache.interface';
import { EventFetchApi, EventFetchParams } from '../event-fetch-api';
import { toWireEventType } from '../event-type-wire-literal';
import { mapToRawEventRows } from '../event-row-mapper';

/**
 * Fetches training instance events from the backend REST API and maps them to RawEventRow records
 * for insertion into the local SQLite cache.
 *
 * Endpoint: GET {linearTraining}/training-instances/{instanceId}/events
 */
@Injectable({ providedIn: 'root' })
export class EventFetchApiImpl extends EventFetchApi {
    private readonly crczpHttp = inject(CRCZPHttpService);
    private readonly trainingInstancesEndpointUri: string;

    constructor() {
        super();
        const basePath = inject(PortalConfig).basePaths.linearTraining;
        this.trainingInstancesEndpointUri = `${basePath}/training-instances`;
    }

    /**
     * Fetches all events of a given type for the specified instance since the provided timestamp.
     *
     * @param params - Fetch parameters including instanceId, eventType, sinceTimestamp, and optional poolId.
     * @returns Observable emitting the mapped RawEventRow array on completion.
     */
    fetch({ instanceId, eventType, sinceTimestamp, poolId }: EventFetchParams): Observable<RawEventRow[]> {
        return this.crczpHttp
            .get<Record<string, unknown>[]>(
                `${this.trainingInstancesEndpointUri}/${instanceId}/events`,
                'Fetch training instance events',
            )
            .withParams({ eventType: toWireEventType(eventType), sinceTimestamp, poolId })
            .withMapper((dtos) => mapToRawEventRows(dtos, eventType, instanceId))
            .execute();
    }
}
