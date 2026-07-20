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

describe('EntityResolverServiceImpl.resolveMap()', () => {
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

    it('emits an empty Map and does not call the fetch API when ids is empty', async () => {
        const result = await firstValueFrom(service.resolveMap(EntityType.Instance, []));

        expect(result).toBeInstanceOf(Map);
        expect(result.size).toBe(0);
        expect(api.fetchInstances).not.toHaveBeenCalled();
    });

    it('deduplicates ids before calling the fetch API and returns one entry per distinct id', async () => {
        const instance = { id: 7, title: 'Dedup Instance' };
        api.fetchInstances.mockReturnValue(of([instance]));

        const result = await firstValueFrom(
            service.resolveMap(EntityType.Instance, [7, 7, 7]),
        );

        expect(api.fetchInstances).toHaveBeenCalledTimes(1);
        expect(api.fetchInstances).toHaveBeenCalledWith([7]);
        expect(result.size).toBe(1);
        expect(result.get(7)).toBe(instance);
    });

    it('keys each entity by its numeric id and maps all returned entities', async () => {
        const i1 = { id: 1, title: 'Instance One' };
        const i2 = { id: 2, title: 'Instance Two' };
        const i3 = { id: 3, title: 'Instance Three' };
        api.fetchInstances.mockReturnValue(of([i1, i2, i3]));

        const result = await firstValueFrom(
            service.resolveMap(EntityType.Instance, [1, 2, 3]),
        );

        expect(result.size).toBe(3);
        expect(result.get(1)).toBe(i1);
        expect(result.get(2)).toBe(i2);
        expect(result.get(3)).toBe(i3);
    });

    it('propagates a fetch error to the subscriber without swallowing it', async () => {
        api.fetchInstances.mockReturnValue(throwError(() => new Error('fetch failed')));

        await expect(
            firstValueFrom(service.resolveMap(EntityType.Instance, [42])),
        ).rejects.toThrow('fetch failed');
    });
});
