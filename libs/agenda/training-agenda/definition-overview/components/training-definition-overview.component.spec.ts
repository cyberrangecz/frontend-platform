import {DefaultPaginationService} from '@crczp/training-agenda/internal';
import {TrainingDefinitionOverviewComponent} from './training-definition-overview.component';
import {ComponentFixture, TestBed, waitForAsync} from '@angular/core/testing';
import {TrainingDefinitionService} from '@crczp/training-agenda/definition-overview';
import {
    createNavigatorSpy,
    createPaginationServiceSpy,
    createTrainingDefinitionServiceSpy,
} from '../../../internal/testing/testing-commons.spec';
import {AssessmentLevel, InfoLevel, Level, TrainingDefinition, TrainingLevel} from 'libs/model/training-model/src';
import {BrowserAnimationsModule} from '@angular/platform-browser/animations';
import {asyncData} from '@sentinel/common/testing';
import {OffsetPagination, OffsetPaginationEvent, PaginatedResource} from '@sentinel/common/pagination';
import {SentinelTableModule, TableLoadEvent} from '@sentinel/components/table';
import {SentinelControlsComponent} from '@sentinel/components/controls';
import {MaterialTestingModule} from '../../../internal/testing/material-testing.module';
import {TrainingNavigator} from '../../../src';

describe('TrainingDefinitionOverviewComponent', () => {
    let component: TrainingDefinitionOverviewComponent;
    let fixture: ComponentFixture<TrainingDefinitionOverviewComponent>;

    let navigatorSpy: jasmine.SpyObj<TrainingNavigator>;
    let paginationServiceSpy: jasmine.SpyObj<DefaultPaginationService>;
    let trainingDefinitionServiceSpy: jasmine.SpyObj<TrainingDefinitionService>;

    beforeEach(waitForAsync(() => {
        navigatorSpy = createNavigatorSpy();
        paginationServiceSpy = createPaginationServiceSpy();
        trainingDefinitionServiceSpy = createTrainingDefinitionServiceSpy();
        initValues();
        TestBed.configureTestingModule({
            imports: [MaterialTestingModule, SentinelTableModule, BrowserAnimationsModule, SentinelControlsComponent],
            declarations: [TrainingDefinitionOverviewComponent],
            providers: [
                {provide: TrainingNavigator, useValue: navigatorSpy},
                {provide: DefaultPaginationService, useValue: paginationServiceSpy},
                {provide: TrainingDefinitionService, useValue: trainingDefinitionServiceSpy},
            ],
        }).compileComponents();
    }));

    beforeEach(() => {
        fixture = TestBed.createComponent(TrainingDefinitionOverviewComponent);
        component = fixture.componentInstance;
        navigatorSpy.toTrainingDefinitionDetail.and.returnValue('');
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should init values', () => {
        trainingDefinitionServiceSpy.getAll.and.returnValue(asyncData(createPaginatedMock()));
        fixture.detectChanges();
        expect(component.topControls.length).toEqual(2);
        component.hasError$.subscribe((val) => expect(val).toBeFalsy());
        component.isLoading$.subscribe((val) => expect(val).toBeFalsy());
        component.trainingDefinitions$.subscribe((val) => expect(val).toBeTruthy());
    });

    it('should get data for table', () => {
        const tableEvent: TableLoadEvent = {
            pagination: new OffsetPaginationEvent(0, 1, '', 'asc'),
            filter: '',
        };

        trainingDefinitionServiceSpy.getAll.and.returnValue(asyncData(createPaginatedMock()));
        paginationServiceSpy.loadPageSize.and.returnValue(1);
        component.onLoadEvent(tableEvent);
        expect(trainingDefinitionServiceSpy.getAll).toHaveBeenCalledTimes(1);
        expect(trainingDefinitionServiceSpy.getAll).toHaveBeenCalledWith(
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
        td.lastEditBy = 'Demo Admin';
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
        trainingDefinitionServiceSpy.hasError$ = asyncData(false);
        trainingDefinitionServiceSpy.isLoading$ = asyncData(false);
        trainingDefinitionServiceSpy.resource$ = asyncData(createPaginatedMock());
    }
});
