// @vitest-environment jsdom
import { TestBed } from '@angular/core/testing';
import { firstValueFrom, of, throwError } from 'rxjs';

import { EntityFetchApi } from '../entity-fetch-api.service';
import { EntityResolverService } from '../entity-resolver.service';
import { EntityType } from '../entity-type';
import { EntityResolverServiceImpl } from './entity-resolver.service';

class MockEntityFetchApi extends EntityFetchApi {
    fetchInstances = vi.fn();
    fetchTrainingRuns = vi.fn();
    fetchUsers = vi.fn();
    fetchLevels = vi.fn();
    fetchTrainingDefinitions = vi.fn();
    fetchHints = vi.fn();
}

describe('EntityResolverServiceImpl', () => {
    let service: EntityResolverService;
    let api: MockEntityFetchApi;

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [
                { provide: EntityResolverService, useClass: EntityResolverServiceImpl },
                { provide: EntityFetchApi, useClass: MockEntityFetchApi },
            ],
        });
        service = TestBed.inject(EntityResolverService);
        api = TestBed.inject(EntityFetchApi) as MockEntityFetchApi;
    });

    describe('resolve()', () => {
        it('emits empty array immediately without fetching', async () => {
            const result = await firstValueFrom(of([]).pipe(service.resolve([EntityType.Instance])));
            expect(result).toEqual([]);
            expect(api.fetchInstances).not.toHaveBeenCalled();
        });

        it('resolves id field to entity object', async () => {
            const instance = { id: 1, title: 'Test' };
            api.fetchInstances.mockReturnValue(of([instance]));

            const result = await firstValueFrom(
                of([{ instance_id: 1, score: 100 }]).pipe(service.resolve([EntityType.Instance])),
            );

            expect(api.fetchInstances).toHaveBeenCalledWith([1]);
            expect(result).toEqual([{ score: 100, instance }]);
        });

        it('deduplicates ids before fetching', async () => {
            api.fetchInstances.mockReturnValue(of([{ id: 1 }]));

            await firstValueFrom(
                of([{ instance_id: 1 }, { instance_id: 1 }]).pipe(service.resolve([EntityType.Instance])),
            );

            expect(api.fetchInstances).toHaveBeenCalledWith([1]);
        });

        it('propagates fetch error', async () => {
            api.fetchInstances.mockReturnValue(throwError(() => new Error('network error')));

            await expect(
                firstValueFrom(
                    of([{ instance_id: 1 }]).pipe(service.resolve([EntityType.Instance])),
                ),
            ).rejects.toThrow('network error');
        });

        it('skips entity type when no owned field present in rows', async () => {
            const rows = [{ unrelated_field: 99 }];
            const result = await firstValueFrom(
                of(rows).pipe(service.resolve([EntityType.Instance])),
            );

            expect(api.fetchInstances).not.toHaveBeenCalled();
            expect(result).toEqual(rows);
        });

        it('fetches multiple entity types and merges results', async () => {
            const instance = { id: 1 };
            const user = { id: 2 };
            api.fetchInstances.mockReturnValue(of([instance]));
            api.fetchUsers.mockReturnValue(of([user]));

            const result = await firstValueFrom(
                of([{ instance_id: 1, user_ref_id: 2 }]).pipe(
                    service.resolve([EntityType.Instance, EntityType.User]),
                ),
            );

            expect(result).toEqual([{ instance, user }]);
        });

        it('fetches multiple distinct IDs in a single call', async () => {
            const i1 = { id: 1 };
            const i2 = { id: 2 };
            api.fetchInstances.mockReturnValue(of([i1, i2]));

            const result = await firstValueFrom(
                of([{ instance_id: 1 }, { instance_id: 2 }, { instance_id: 1 }]).pipe(
                    service.resolve([EntityType.Instance]),
                ),
            );

            expect(api.fetchInstances).toHaveBeenCalledTimes(1);
            expect(api.fetchInstances).toHaveBeenCalledWith([1, 2]);
            expect(result).toEqual([{ instance: i1 }, { instance: i2 }, { instance: i1 }]);
        });

        it('drops id field and omits output key when entity absent from response', async () => {
            api.fetchInstances.mockReturnValue(of([]));

            const result = await firstValueFrom(
                of([{ instance_id: 99, score: 5 }]).pipe(service.resolve([EntityType.Instance])),
            );

            expect(result).toEqual([{ score: 5 }]);
        });

        it('accepts training_instance_id as alternate Instance field', async () => {
            const instance = { id: 5 };
            api.fetchInstances.mockReturnValue(of([instance]));

            const result = await firstValueFrom(
                of([{ training_instance_id: 5 }]).pipe(service.resolve([EntityType.Instance])),
            );

            expect(api.fetchInstances).toHaveBeenCalledWith([5]);
            expect(result).toEqual([{ instance }]);
        });
    });

    describe('resolveSafe()', () => {
        it('resolves normally when fetch succeeds', async () => {
            const instance = { id: 1, title: 'Safe' };
            api.fetchInstances.mockReturnValue(of([instance]));

            const result = await firstValueFrom(
                of([{ instance_id: 1 }]).pipe(service.resolveSafe([EntityType.Instance])),
            );

            expect(result).toEqual([{ instance }]);
        });

        it('uses fallback when fetch errors', async () => {
            api.fetchInstances.mockReturnValue(throwError(() => new Error('forbidden')));

            const result = await firstValueFrom(
                of([{ instance_id: 5 }]).pipe(service.resolveSafe([EntityType.Instance])),
            );

            expect(result).toEqual([{ instance: { instanceId: 5 } }]);
        });

        it('isolates error per entity type — other types still resolve', async () => {
            const user = { id: 2 };
            api.fetchInstances.mockReturnValue(throwError(() => new Error('forbidden')));
            api.fetchUsers.mockReturnValue(of([user]));

            const result = await firstValueFrom(
                of([{ instance_id: 1, user_ref_id: 2 }]).pipe(
                    service.resolveSafe([EntityType.Instance, EntityType.User]),
                ),
            );

            expect(result).toEqual([{ instance: { instanceId: 1 }, user }]);
        });

        it('emits empty array immediately without fetching', async () => {
            const result = await firstValueFrom(
                of([]).pipe(service.resolveSafe([EntityType.Instance])),
            );
            expect(result).toEqual([]);
            expect(api.fetchInstances).not.toHaveBeenCalled();
        });

        it('uses fallback when fetch succeeds but ID absent from response', async () => {
            api.fetchInstances.mockReturnValue(of([{ id: 999 }]));

            const result = await firstValueFrom(
                of([{ instance_id: 5 }]).pipe(service.resolveSafe([EntityType.Instance])),
            );

            expect(result).toEqual([{ instance: { instanceId: 5 } }]);
        });
    });
});
