import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { PlatformEventType } from '@crczp/training-model';
import { ErrorHandlerService, PortalConfig } from '@crczp/utils';
import { CacheSyncService } from '../../sync/sync.interface';
import { InstanceSyncDriver } from './instance-sync-driver';

/**
 * Owns one {@link InstanceSyncDriver} per training instance and routes reader connections to the
 * driver for their instance. Drivers are created lazily on first connection and kept thereafter; an
 * idle driver goes dormant (its polling timer suspended) rather than being torn down, so switching
 * back to a previously visited instance resumes without re-warming its loaded-types set.
 */
@Injectable()
export class SyncDriverRegistry {
    private readonly syncService = inject(CacheSyncService);
    private readonly errorHandler = inject(ErrorHandlerService);
    private readonly intervalMs = inject(PortalConfig).polling.pollingPeriodShortMs;
    private readonly drivers = new Map<number, InstanceSyncDriver>();

    /**
     * Connects a reader to the driver for the given instance.
     *
     * @param instanceId Training instance to sync for.
     * @param eventTypes Event types the reader needs; must contain at least one.
     * @returns A stream of ticks, one per completed sync cycle.
     */
    connect(instanceId: number, eventTypes: PlatformEventType[]): Observable<void> {
        return this.driverFor(instanceId).connect(eventTypes);
    }

    private driverFor(instanceId: number): InstanceSyncDriver {
        let driver = this.drivers.get(instanceId);
        if (!driver) {
            driver = new InstanceSyncDriver(
                instanceId,
                this.intervalMs,
                this.syncService,
                this.errorHandler,
            );
            this.drivers.set(instanceId, driver);
        }
        return driver;
    }
}
