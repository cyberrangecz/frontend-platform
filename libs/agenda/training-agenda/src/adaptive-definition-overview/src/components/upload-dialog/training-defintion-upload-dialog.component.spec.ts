import { ngfModule } from 'angular-file';
import { TrainingDefinitionUploadDialogComponent } from './training-definition-upload-dialog.component';
import { MatDialogRef } from '@angular/material/dialog';
import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { asyncData } from '@sentinel/common/testing';
import { SentinelPipesModule } from '@sentinel/common/pipes';
import {
    createAdaptiveFileUploadProgressServiceSpy,
    createDialogRefSpy,
} from '../../../../internal/src/testing/testing-commons.spec';
import { AdaptiveFileUploadProgressService } from '../../services/file-upload/adaptive-file-upload-progress.service';
import { MaterialTestingModule } from '../../../../internal/src/testing/material-testing.module';

describe('TrainingDefinitionUploadDialogComponent', () => {
    let component: TrainingDefinitionUploadDialogComponent;
    let fixture: ComponentFixture<TrainingDefinitionUploadDialogComponent>;

    let matDialogRefSpy: jasmine.SpyObj<MatDialogRef<TrainingDefinitionUploadDialogComponent>>;
    let uploadProgressService: jasmine.SpyObj<AdaptiveFileUploadProgressService>;

    beforeEach(waitForAsync(() => {
        matDialogRefSpy = createDialogRefSpy();
        uploadProgressService = createAdaptiveFileUploadProgressServiceSpy();
        uploadProgressService.isInProgress$ = asyncData(false);
        TestBed.configureTestingModule({
            imports: [MaterialTestingModule, SentinelPipesModule, BrowserAnimationsModule, ngfModule],
            declarations: [TrainingDefinitionUploadDialogComponent],
            providers: [
                { provide: MatDialogRef, useValue: matDialogRefSpy },
                { provide: AdaptiveFileUploadProgressService, useValue: uploadProgressService },
            ],
        }).compileComponents();
    }));

    beforeEach(() => {
        fixture = TestBed.createComponent(TrainingDefinitionUploadDialogComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should close dialog with no result', () => {
        component.cancel();
        expect(matDialogRefSpy.close).toHaveBeenCalledTimes(1);
    });

    it('should emit upload event', () => {
        spyOn(component.onUpload$, 'emit');
        component.upload();
        expect(component.onUpload$.emit).toHaveBeenCalledTimes(1);
    });

    it('should clear file', () => {
        component.selectedFile = new File([], '');
        component.clearFile();
        expect(component.selectedFile).toBeFalsy();
    });
});
