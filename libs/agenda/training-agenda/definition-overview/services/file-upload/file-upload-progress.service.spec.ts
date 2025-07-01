import { TestBed } from '@angular/core/testing';
import { FileUploadProgressService } from './file-upload-progress.service';

describe('FileUploadProgressService', () => {
    let service: FileUploadProgressService;

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [FileUploadProgressService],
        });
        service = TestBed.inject(FileUploadProgressService);
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
