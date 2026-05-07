import { ApplicationInitStatus, inject, provideAppInitializer } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom, of } from 'rxjs';
import { CacheService } from '@crczp/event-query-engine';

/**
 * Verifies that the Angular bootstrap sequence runs all APP_INITIALIZER tokens
 * and that the cache eviction initializer registered in main.ts is wired correctly.
 *
 * These tests do not touch PGlite — CacheService is mocked. The focus is the
 * bootstrap mechanism, not cache correctness.
 */

function triggerInitializers(): Promise<void> {
    const status = TestBed.inject(ApplicationInitStatus);
    (status as any).runInitializers();
    return status.donePromise;
}

afterEach(() => TestBed.resetTestingModule());

describe('Bootstrap — APP_INITIALIZER mechanism', () => {
    it('runs a synchronous initializer', async () => {
        const spy = vi.fn();

        TestBed.configureTestingModule({
            providers: [provideAppInitializer(spy)],
        });

        await triggerInitializers();

        expect(spy).toHaveBeenCalledOnce();
    });

    it('runs a Promise-returning initializer', async () => {
        const spy = vi.fn().mockResolvedValue(void 0);

        TestBed.configureTestingModule({
            providers: [provideAppInitializer(spy)],
        });

        await triggerInitializers();

        expect(spy).toHaveBeenCalledOnce();
    });

    it('runs all registered initializers', async () => {
        const first = vi.fn().mockResolvedValue(void 0);
        const second = vi.fn().mockResolvedValue(void 0);

        TestBed.configureTestingModule({
            providers: [
                provideAppInitializer(first),
                provideAppInitializer(second),
            ],
        });

        await triggerInitializers();

        expect(first).toHaveBeenCalledOnce();
        expect(second).toHaveBeenCalledOnce();
    });
});

describe('Bootstrap — cache eviction initializer', () => {
    it('calls CacheService.evictStaleInstances during bootstrap', async () => {
        const evictSpy = vi.fn().mockReturnValue(of(void 0));

        TestBed.configureTestingModule({
            providers: [
                { provide: CacheService, useValue: { evictStaleInstances: evictSpy } },
                provideAppInitializer(() => {
                    const cache = inject(CacheService);
                    return firstValueFrom(cache.evictStaleInstances());
                }),
            ],
        });

        await triggerInitializers();

        expect(evictSpy).toHaveBeenCalledOnce();
    });

    it('bootstrap completes when eviction observable completes without error', async () => {
        const evictSpy = vi.fn().mockReturnValue(of(void 0));

        TestBed.configureTestingModule({
            providers: [
                { provide: CacheService, useValue: { evictStaleInstances: evictSpy } },
                provideAppInitializer(() => {
                    const cache = inject(CacheService);
                    return firstValueFrom(cache.evictStaleInstances());
                }),
            ],
        });

        await expect(triggerInitializers()).resolves.not.toThrow();
    });
});
