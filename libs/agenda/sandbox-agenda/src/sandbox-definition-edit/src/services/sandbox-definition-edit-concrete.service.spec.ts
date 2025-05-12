import { TestBed, waitForAsync } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { asyncData } from '@sentinel/common/testing';
import { throwError } from 'rxjs';
import { SandboxErrorHandler, SandboxNavigator, SandboxNotificationService } from '@crczp/sandbox-agenda';
import { SandboxDefinitionApi } from '@crczp/sandbox-api';
import { SandboxDefinition } from '@crczp/sandbox-model';
import { SandboxDefinitionEditConcreteService } from './sandbox-definition-edit-concrete.service';
import {
    createDefinitionApiSpy,
    createErrorHandlerSpy,
    createNavigatorSpy,
    createNotificationSpy,
} from '../../../internal/src/testing/testing-commons.spec';

describe('SandboxDefinitionEditConcreteService', () => {
    let sandboxDefinitionApiSpy: jasmine.SpyObj<SandboxDefinitionApi>;
    let navigatorSpy: jasmine.SpyObj<SandboxNavigator>;
    let notificationSpy: jasmine.SpyObj<SandboxNotificationService>;
    let errorHandlerSpy: jasmine.SpyObj<SandboxErrorHandler>;
    let service: SandboxDefinitionEditConcreteService;

    beforeEach(waitForAsync(() => {
        navigatorSpy = createNavigatorSpy();
        notificationSpy = createNotificationSpy();
        errorHandlerSpy = createErrorHandlerSpy();
        sandboxDefinitionApiSpy = createDefinitionApiSpy();

        TestBed.configureTestingModule({
            imports: [RouterTestingModule],
            providers: [
                SandboxDefinitionEditConcreteService,
                { provide: SandboxDefinitionApi, useValue: sandboxDefinitionApiSpy },
                { provide: SandboxNavigator, useValue: navigatorSpy },
                { provide: SandboxNotificationService, useValue: notificationSpy },
                { provide: SandboxErrorHandler, useValue: errorHandlerSpy },
            ],
        });
        service = TestBed.inject(SandboxDefinitionEditConcreteService);
    }));

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    it('should create a sandbox definition', (done) => {
        const mockData = createMock();
        sandboxDefinitionApiSpy.create.and.returnValue(asyncData(null));
        navigatorSpy.toSandboxDefinitionOverview.and.returnValue('/');

        service.create(mockData).subscribe(() => done(), fail);
        expect(sandboxDefinitionApiSpy.create).toHaveBeenCalledTimes(1);
    });

    it('should emit error on error state', (done) => {
        const mockData = createMock();
        sandboxDefinitionApiSpy.create.and.returnValue(throwError(null));

        service.create(mockData).subscribe(
            () => fail,
            () => {
                expect(errorHandlerSpy.emit).toHaveBeenCalledTimes(1);
                done();
            },
        );
    });

    function createMock() {
        const sandboxDefinition: SandboxDefinition = new SandboxDefinition();
        sandboxDefinition.id = 0;
        sandboxDefinition.title = 'Title';
        return sandboxDefinition;
    }
});
