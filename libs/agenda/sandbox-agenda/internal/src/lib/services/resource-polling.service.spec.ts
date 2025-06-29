import { TestBed } from '@angular/core/testing';
import { ResourcePollingService } from './resource-polling.service';

describe('ResourcePollingService', () => {
    let service: ResourcePollingService;

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [ResourcePollingService],
        });
        service = TestBed.inject(ResourcePollingService);
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    /**
     * refactor these tests for newly create service
     */
    // it('should start polling', fakeAsync(() => {
    //   const observable = of(true);
    //   service.startPolling(mockServiceCall(), 5000, 3);
    //
    //   assertPoll(1, 5000, observable);
    // }));

    // it('should stop polling on error', fakeAsync(() => {
    //   const mockData = createMock();
    //   poolApiSpy.getPoolsSandboxAllocationUnits.and.returnValues(
    //     asyncData(mockData),
    //     asyncData(mockData),
    //     throwError({ status: 400 })
    //   ); // throw error on third call
    //
    //   const subscription = service.units$.subscribe();
    //   assertPoll(3);
    //   tick(5 * contextSpy.config.pollingPeriod);
    //   expect(poolApiSpy.getPoolsSandboxAllocationUnits).toHaveBeenCalledTimes(3);
    //   subscription.unsubscribe();
    // }));

    // it('should start polling again after request is successful', fakeAsync(() => {
    //   const pagination = createPagination();
    //   const mockData = createMock();
    //   poolApiSpy.getPoolsSandboxAllocationUnits.and.returnValues(
    //     asyncData(mockData),
    //     asyncData(mockData),
    //     throwError({ status: 400 }),
    //     asyncData(mockData),
    //     asyncData(mockData),
    //     asyncData(mockData)
    //   );
    //
    //   const subscription = service.units$.subscribe();
    //   expect(poolApiSpy.getPoolsSandboxAllocationUnits).toHaveBeenCalledTimes(0);
    //   assertPoll(3);
    //   tick(contextSpy.config.pollingPeriod);
    //   expect(poolApiSpy.getPoolsSandboxAllocationUnits).toHaveBeenCalledTimes(3);
    //   tick(5 * contextSpy.config.pollingPeriod);
    //   expect(poolApiSpy.getPoolsSandboxAllocationUnits).toHaveBeenCalledTimes(3);
    //   service.getAll(0, pagination).subscribe();
    //   expect(poolApiSpy.getPoolsSandboxAllocationUnits).toHaveBeenCalledTimes(4);
    //   assertPoll(3, 4);
    //   subscription.unsubscribe();
    // }));
    //
    //   function assertPoll(times: number, period: number, observable$: Observable<any>, initialHaveBeenCalledTimes = 0): void {
    //     for (let i = initialHaveBeenCalledTimes; i < times; i++) {
    //       tick(period);
    //       expect(observable$).toHaveBeenCalledTimes(i);
    //     }
    //   }
    //
    //   function mockServiceCall(): Observable<boolean> {
    //     return of(false)
    //   }
});
