import { asyncData } from '@sentinel/common/testing';
import { TrainingDefinitionEditOverviewMaterialModule } from '../../../definition-edit/src/components/training-definition-edit-overview-material.module';
import { AdaptivePreviewComponent } from './adaptive-preview.component';
import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import {
    AccessPhase,
    InfoPhase,
    Phase,
    QuestionnairePhase,
    TrainingDefinition,
    TrainingPhase,
} from '@crczp/training-model';
import { ActivatedRoute } from '@angular/router';
import { createActivatedRouteSpy } from '../../../internal/src/testing/testing-commons.spec';
import { AdaptiveDefinitionApiService } from '@crczp/training-api';

describe('TrainingPreviewComponent', () => {
    let component: AdaptivePreviewComponent;
    let fixture: ComponentFixture<AdaptivePreviewComponent>;

    let activeRouteSpy: jasmine.SpyObj<ActivatedRoute>;

    beforeEach(waitForAsync(() => {
        activeRouteSpy = createActivatedRouteSpy();
        activeRouteSpy.data = asyncData({ adaptiveDefinition: createMock() });
        TestBed.configureTestingModule({
            imports: [TrainingDefinitionEditOverviewMaterialModule],
            declarations: [AdaptivePreviewComponent],
            providers: [{ provide: ActivatedRoute, useValue: activeRouteSpy }, AdaptiveDefinitionApiService],
        }).compileComponents();
    }));

    beforeEach(() => {
        fixture = TestBed.createComponent(AdaptivePreviewComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    function createMock(): TrainingDefinition {
        const td = new TrainingDefinition();
        td.id = 2;
        td.title = 'TD 2';
        td.levels = createLevelsMock();
        td.description = '';
        td.prerequisites = [];
        return td;
    }

    function createLevelsMock(): Phase[] {
        const level1 = new TrainingPhase();
        const level2 = new QuestionnairePhase();
        const level3 = new InfoPhase();
        const level4 = new AccessPhase();
        return [level1, level2, level3, level4];
    }
});
