import { Observable } from 'rxjs';
import { PlatformEventType } from '@crczp/training-model';
import { RawEventRow } from '../cache/cache.interface';

export interface EventFetchParams {
    instanceId: number;
    eventType: PlatformEventType;
    sinceTimestamp: number;
}

export abstract class EventFetchApi {
    abstract fetch(params: EventFetchParams): Observable<RawEventRow[]>;
}
