import { TestBed, waitForAsync } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { MatDialog } from '@angular/material/dialog';
import { asyncData } from '@sentinel/common/testing';
import { SandboxErrorHandler, SandboxNavigator, SandboxNotificationService } from '@crczp/sandbox-agenda';
import { PoolApi } from '@crczp/sandbox-api';
import { CreatedBy, Pool, SandboxDefinition } from '@crczp/sandbox-model';
import { PoolEditConcreteService } from './pool-edit-concrete.service';
import {
    createErrorHandlerSpy,
    createMatDialogSpy,
    createNavigatorSpy,
    createNotificationSpy,
    createPoolApiSpy,
} from '../../../internal/src/testing/testing-commons.spec';

describe('PoolEditConcreteService', () => {
    let dialogSpy: jasmine.SpyObj<MatDialog>;
    let navigatorSpy: jasmine.SpyObj<SandboxNavigator>;
    let notificationSpy: jasmine.SpyObj<SandboxNotificationService>;
    let errorHandlerSpy: jasmine.SpyObj<SandboxErrorHandler>;
    let poolApiSpy: jasmine.SpyObj<PoolApi>;
    let service: PoolEditConcreteService;

    beforeEach(waitForAsync(() => {
        dialogSpy = createMatDialogSpy();
        navigatorSpy = createNavigatorSpy();
        notificationSpy = createNotificationSpy();
        errorHandlerSpy = createErrorHandlerSpy();
        poolApiSpy = createPoolApiSpy();

        TestBed.configureTestingModule({
            imports: [RouterTestingModule],
            providers: [
                PoolEditConcreteService,
                { provide: MatDialog, useValue: dialogSpy },
                { provide: SandboxNavigator, useValue: navigatorSpy },
                { provide: SandboxNotificationService, useValue: notificationSpy },
                { provide: SandboxErrorHandler, useValue: errorHandlerSpy },
                { provide: PoolApi, useValue: poolApiSpy },
            ],
        });
        service = TestBed.inject(PoolEditConcreteService);
    }));

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    it('should create pool and try to navigate to created pool', (done) => {
        const mockData = createMock();
        poolApiSpy.createPool.and.returnValue(asyncData(mockData));
        navigatorSpy.toPoolOverview.and.returnValue('/');

        service.create().subscribe(() => done(), fail);
        expect(poolApiSpy.createPool).toHaveBeenCalledTimes(1);
    });

    function createMock() {
        const sandboxDefinition = new SandboxDefinition();
        sandboxDefinition.id = 1;
        sandboxDefinition.rev = 'master';
        sandboxDefinition.title = 'small-sandbox';
        sandboxDefinition.createdBy = new CreatedBy();
        sandboxDefinition.url = 'gitlab@gitlab.com';

        const pool = new Pool();
        pool.id = 1;
        pool.definition = sandboxDefinition;
        pool.lockId = 1;
        pool.usedSize = 10;
        pool.maxSize = 20;
        return pool;
    }
});
