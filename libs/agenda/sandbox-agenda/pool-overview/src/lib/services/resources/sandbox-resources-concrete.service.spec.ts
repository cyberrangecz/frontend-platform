import {TestBed, waitForAsync} from '@angular/core/testing';
import {asyncData} from '@sentinel/common/testing';
import {take} from 'rxjs/operators';
import {throwError} from 'rxjs';
import {SandboxErrorHandler} from '@crczp/sandbox-agenda';
import {ResourcesApi} from '@crczp/sandbox-api';
import {Resources} from '@crczp/sandbox-model';
import {SandboxResourcesConcreteService} from './sandbox-resources-concrete.service';
import {
    createErrorHandlerSpy,
    createResourcesApiSpy
} from '../../../../../../internal/src/lib/testing/testing-commons.spec';
import {fail} from "node:assert";

describe('SandboxResourcesConcreteService', () => {
    let errorHandlerSpy: jasmine.SpyObj<SandboxErrorHandler>;
    let resourcesApiSpy: jasmine.SpyObj<ResourcesApi>;
    let service: SandboxResourcesConcreteService;

    beforeEach(waitForAsync(() => {
        errorHandlerSpy = createErrorHandlerSpy();
        resourcesApiSpy = createResourcesApiSpy();

        TestBed.configureTestingModule({
            providers: [
                SandboxResourcesConcreteService,
                {provide: SandboxErrorHandler, useValue: errorHandlerSpy},
                {provide: ResourcesApi, useValue: resourcesApiSpy},
            ],
        });
        service = TestBed.inject(SandboxResourcesConcreteService);
    }));

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    it('should call api to get available resources', (done) => {
        resourcesApiSpy.getResources.and.returnValue(asyncData(null));
        service.getResources().subscribe(
            () => {
                expect(resourcesApiSpy.getResources).toHaveBeenCalledTimes(1);
                done();
            },
            () => fail,
        );
    });

    it('should emit next value when data received from api', (done) => {
        const mockData = createMock();
        resourcesApiSpy.getResources.and.returnValue(asyncData(mockData));
        service.resources$.pipe(take(1)).subscribe(
            (emitted) => {
                expect(emitted).toBe(mockData);
                done();
            },
            () => fail(),
        );
        service.getResources().subscribe();
    });

    it('should emit error on error state', (done) => {
        resourcesApiSpy.getResources.and.returnValue(throwError(null));
        service.getResources().subscribe(
            () => fail,
            () => {
                expect(errorHandlerSpy.emit).toHaveBeenCalledTimes(1);
                done();
            },
        );
    });

    function createMock() {
        const resources: Resources = new Resources();
        resources.projectName = 'Name';
        resources.quotas = null;
        return resources;
    }
});
