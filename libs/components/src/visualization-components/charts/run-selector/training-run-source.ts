import {
    EnvironmentProviders,
    forwardRef,
    inject,
    Injectable,
    makeEnvironmentProviders,
    Signal,
} from '@angular/core';
import { from, map, Observable } from 'rxjs';
import { DataBrokerService, EntityResolverService, EntityType, trainingRunStartedTable } from '@crczp/event-query-engine';
import { PlatformEventType } from '@crczp/visualization-model';
import { TrainingRunBasic } from '@crczp/training-model';

/**
 * Abstract class used as DI token for the list of training runs visible in the dashboard.
 * Override in app or route providers via provideTrainingRunSource() to replace the root
 * default with a real or mock implementation.
 *
 * The root default is DefaultTrainingRunSource (broker-backed).
 */
@Injectable({ providedIn: 'root', useExisting: forwardRef(() => DefaultTrainingRunSource) })
export abstract class TrainingRunSource {
    abstract runs(instanceId: Signal<number>): Observable<TrainingRunBasic[]>;
}

@Injectable({ providedIn: 'root' })
export class DefaultTrainingRunSource extends TrainingRunSource {
    private readonly dataBroker = inject(DataBrokerService);
    private readonly entityResolver = inject(EntityResolverService);

    runs(instanceId: Signal<number>): Observable<TrainingRunBasic[]> {
        return this.dataBroker
            .query<{ training_run_id: number }>(
                instanceId,
                [PlatformEventType.TRAINING_RUN_STARTED],
                (db) => from((db as any).select().from(trainingRunStartedTable)) as Observable<{ training_run_id: number }[]>,
            )
            .pipe(
                this.entityResolver.resolve([EntityType.TrainingRun] as const),
                map((rows) => {
                    const seen = new Set<number>();
                    const result: TrainingRunBasic[] = [];
                    for (const row of rows) {
                        if (!seen.has(row.trainingRun.id)) {
                            seen.add(row.trainingRun.id);
                            result.push(row.trainingRun);
                        }
                    }
                    return result;
                }),
            );
    }
}

/**
 * Registers a {@link TrainingRunSource} implementation for an environment or route.
 * Call in bootstrap providers or route-level providers to override the root default.
 */
export function provideTrainingRunSource(
    useClass: new (...args: unknown[]) => TrainingRunSource,
): EnvironmentProviders {
    return makeEnvironmentProviders([{ provide: TrainingRunSource, useClass }]);
}
