import { TestBed } from '@angular/core/testing';
import { AdaptiveFileUploadProgressService } from './adaptive-file-upload-progress.service';

describe('FileUploadProgressService', () => {
    let service: AdaptiveFileUploadProgressService;

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [AdaptiveFileUploadProgressService],
        });
        service = TestBed.inject(AdaptiveFileUploadProgressService);
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    it('should start upload progress', () => {
        service.start();
        service.isInProgress$.subscribe((inProgress) => {
            expect(inProgress).toBeTruthy();
        });
    });

    it('should finish upload progress', () => {
        service.finish();
        service.isInProgress$.subscribe((inProgress) => {
            expect(inProgress).toBeFalsy();
        });
    });
});
