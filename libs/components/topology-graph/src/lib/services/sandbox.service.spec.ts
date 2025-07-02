import {TestBed} from '@angular/core/testing';
import {SandboxService} from './sandbox.service';
import {skip, take} from 'rxjs/operators';

describe('SandboxService', () => {
    let service: SandboxService;

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [SandboxService],
        });
        service = TestBed.inject(SandboxService);
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    it('should emit nex sandbox id', (done) => {
        service.sandboxInstanceId$.pipe(skip(1), take(1)).subscribe(
            (id) => {
                expect(id).toEqual('10');
                done();
            },
            (_) => fail()
        );
        service.setSandboxInstanceId('10');
        expect(service).toBeTruthy();
    });
});
