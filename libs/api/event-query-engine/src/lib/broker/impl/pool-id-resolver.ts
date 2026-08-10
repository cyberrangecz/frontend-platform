import { Observable, map, of } from 'rxjs';
import { PlatformEventType } from '@crczp/training-model';
import { LinearTrainingInstanceApi } from '@crczp/training-api';

export function needsPoolId(eventTypes: PlatformEventType[]): boolean {
    return eventTypes.includes(PlatformEventType.COMMAND);
}

export function resolvePoolId(
    instanceId: number,
    eventTypes: PlatformEventType[],
    instanceApi: LinearTrainingInstanceApi,
): Observable<number | undefined> {
    if (!needsPoolId(eventTypes)) return of(undefined);
    return instanceApi.get(instanceId).pipe(map((instance) => instance.poolId));
}
