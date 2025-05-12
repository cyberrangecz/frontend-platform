import { DefaultPaginationService } from '@crczp/training-agenda/internal';
import { AdaptiveDefinitionOverviewComponent } from './adaptive-definition-overview.component';
import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { TrainingDefinitionService } from '@crczp/training-agenda/definition-overview';
import {
    createNavigatorSpy,
    createPaginationServiceSpy,
    createTrainingDefinitionServiceSpy,
} from '../../../internal/src/testing/testing-commons.spec';
import { AssessmentLevel, InfoLevel, Level, TrainingDefinition, TrainingLevel } from '@crczp/training-model';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { asyncData } from '@sentinel/common/testing';
import { OffsetPagination, OffsetPaginationEvent, PaginatedResource } from '@sentinel/common/pagination';
import { SentinelTableModule, TableLoadEvent } from '@sentinel/components/table';
import { SentinelControlsComponent } from '@sentinel/components/controls';
import { MaterialTestingModule } from '../../../internal/src/testing/material-testing.module';
import { AdaptiveDefinitionService } from '../services/state/adaptive-definition.service';
import { TrainingNavigator } from '../../../index';

describe('AdaptiveDefinitionOverviewComponent', () => {
    let component: AdaptiveDefinitionOverviewComponent;
    let fixture: ComponentFixture<AdaptiveDefinitionOverviewComponent>;

    let navigatorSpy: jasmine.SpyObj<TrainingNavigator>;
    let paginationServiceSpy: jasmine.SpyObj<DefaultPaginationService>;
    let adaptiveDefinitionServiceSpy: jasmine.SpyObj<TrainingDefinitionService>;

    beforeEach(waitForAsync(() => {
        navigatorSpy = createNavigatorSpy();
        paginationServiceSpy = createPaginationServiceSpy();
        adaptiveDefinitionServiceSpy = createTrainingDefinitionServiceSpy();
        initValues();
        TestBed.configureTestingModule({
            imports: [MaterialTestingModule, SentinelTableModule, BrowserAnimationsModule, SentinelControlsComponent],
            declarations: [AdaptiveDefinitionOverviewComponent],
            providers: [
                { provide: TrainingNavigator, useValue: navigatorSpy },
                { provide: DefaultPaginationService, useValue: paginationServiceSpy },
                { provide: AdaptiveDefinitionService, useValue: adaptiveDefinitionServiceSpy },
            ],
        }).compileComponents();
    }));

    beforeEach(() => {
        fixture = TestBed.createComponent(AdaptiveDefinitionOverviewComponent);
        component = fixture.componentInstance;
        navigatorSpy.toAdaptiveDefinitionDetail.and.returnValue('');
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should init values', () => {
        adaptiveDefinitionServiceSpy.getAll.and.returnValue(asyncData(createPaginatedMock()));
        fixture.detectChanges();
        expect(component.topControls.length).toEqual(2);
        component.hasError$.subscribe((val) => expect(val).toBeFalse());
        component.isLoading$.subscribe((val) => expect(val).toBeFalse());
        component.trainingDefinitions$.subscribe((val) => expect(val).toBeTruthy());
    });

    it('should get data for table', () => {
        const tableEvent: TableLoadEvent = {
            pagination: new OffsetPaginationEvent(0, 1, '', 'asc'),
            filter: '',
        };

        adaptiveDefinitionServiceSpy.getAll.and.returnValue(asyncData(createPaginatedMock()));
        paginationServiceSpy.getPagination.and.returnValue(1);
        component.onLoadEvent(tableEvent);
        expect(adaptiveDefinitionServiceSpy.getAll).toHaveBeenCalledTimes(1);
        expect(adaptiveDefinitionServiceSpy.getAll).toHaveBeenCalledWith(
            new OffsetPaginationEvent(0, 1, '', 'asc'),
            '',
        );
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

    function createPaginatedMock(): PaginatedResource<TrainingDefinition> {
        return new PaginatedResource([createMock()], new OffsetPagination(1, 1, 1, 1, 1));
    }

    function createLevelsMock(): Level[] {
        const level1 = new TrainingLevel();
        const level2 = new AssessmentLevel();
        const level3 = new InfoLevel();
        return [level1, level2, level3];
    }

    function initValues() {
        adaptiveDefinitionServiceSpy.hasError$ = asyncData(false);
        adaptiveDefinitionServiceSpy.isLoading$ = asyncData(false);
        adaptiveDefinitionServiceSpy.resource$ = asyncData(createPaginatedMock());
    }
});
