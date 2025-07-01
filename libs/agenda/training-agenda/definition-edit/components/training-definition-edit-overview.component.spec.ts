// import { DefaultPaginationService, TrainingAgendaContext } from '@crczp/training-agenda/internal';
// import { ActivatedRoute } from '@angular/router';
// import { TrainingDefinitionEditOverviewComponent } from '@crczp/training-agenda/definition-edit';
// import { ComponentFixture, TestBed, waitForAsync, fakewaitForAsync } from '@angular/core/testing';
// import {
//   createActivatedRouteSpy,
//   createTrainingDefinitionEditServiceSpy,
//   createPaginationServiceSpy,
//   createContext,
// } from '../../../internal/src/testing/testing-commons.spec';
// import { TrainingDefinitionEditService } from '@crczp/training-agenda/definition-edit';
// import { TrainingDefinition, Level, AssessmentLevel, InfoLevel, TrainingLevel } from '@crczp/training-model';
// import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
// import { asyncData } from '@sentinel/common';
// import { MaterialTestingModule } from '../../../internal/src/testing/material-testing.module';

// describe('TrainingDefinitionEditOverviewComponent', () => {
//   let component: TrainingDefinitionEditOverviewComponent;
//   let fixture: ComponentFixture<TrainingDefinitionEditOverviewComponent>;

//   let context: TrainingAgendaContext;
//   let activatedRouteSpy: jasmine.SpyObj<ActivatedRoute>;
//   let editServiceSpy: jasmine.SpyObj<TrainingDefinitionEditService>;
//   let paginationServiceSpy: jasmine.SpyObj<DefaultPaginationService>;

//   beforeEach(waitForAsync(() => {
//     activatedRouteSpy = createActivatedRouteSpy();
//     editServiceSpy = createTrainingDefinitionEditServiceSpy();
//     context = createContext();
//     paginationServiceSpy = createPaginationServiceSpy();
//     initComponentData();
//     TestBed.configureTestingModule({
//       imports: [MaterialTestingModule, BrowserAnimationsModule],
//       declarations: [TrainingDefinitionEditOverviewComponent],
//       providers: [
//         { provide: ActivatedRoute, useValue: activatedRouteSpy },
//         { provide: TrainingDefinitionEditService, useValue: editServiceSpy },
//         { provide: DefaultPaginationService, useValue: paginationServiceSpy },
//       ],
//     }).compileComponents();
//   }));

//   beforeEach(() => {
//     fixture = TestBed.createComponent(TrainingDefinitionEditOverviewComponent);
//     component = fixture.componentInstance;
//   });

//   /**
//    * TODO repair tests for this component - currently failing because edit service is now provided by component
//    */
//   // it('should create', () => {
//   //   expect(component).toBeTruthy();
//   // });
//   //
//   // it('should set correct values', () => {
//   //   component.trainingDefinition$.subscribe((val) => expect(val).toEqual(createMock()));
//   //   component.tdTitle$.subscribe((val) => expect(val).toEqual(createMock().title));
//   //   component.saveDisabled$.subscribe((val) => expect(val).toEqual(false));
//   //   component.editMode$.subscribe((val) => expect(val).toEqual(false));
//   // });
//   //
//   // it('should deactivate', () => {
//   //   expect(component.canDeactivate()).toBeTrue();
//   // });
//   //
//   // it('should change state of component', () => {
//   //   component.onTrainingDefinitionChanged(new TrainingDefinitionChangeEvent(createMock(), true));
//   //   expect(editServiceSpy.change).toHaveBeenCalledTimes(1);
//   //   expect(component.canDeactivateTDEdit).toBeFalse();
//   // });
//   //
//   // it('should enable deactivation on controls action', fakeAsync(() => {
//   //   component.canDeactivateTDEdit = false;
//   //   component.onControlsAction(new SentinelControlItemSignal('1', '1', 'accent', asyncData(false), asyncData(true)));
//   //   jasmine.clock().tick(1000);
//   //   expect(component.canDeactivate()).toBeTrue();
//   // }));
//   //
//   // it('should change satate of component when level is saved', () => {
//   //   component.unsavedLevels = createLevelsMock();
//   //   const reducedLevels = createLevelsMock().slice(1, 2);
//   //   component.onUnsavedLevelsChanged(reducedLevels);
//   //   expect(component.unsavedLevels).toEqual(reducedLevels);
//   // });
//   //
//   // it('should change state of component when number of levels change', () => {
//   //   component.onLevelsCountChanged(3);
//   //   expect(component.levelsCount).toEqual(3);
//   // });
//   //
//   // it('should change state of component when authors of TD change', () => {
//   //   component.onAuthorsChanged(true);
//   //   expect(component.canDeactivateAuthors).toEqual(false);
//   // });

//   function initComponentData() {
//     editServiceSpy.trainingDefinition$ = asyncData(createMock());
//     editServiceSpy.editMode$ = asyncData(false);
//     editServiceSpy.saveDisabled$ = asyncData(false);
//     activatedRouteSpy.data = asyncData(asyncData([createMock()]));
//   }

//   function createMock(): TrainingDefinition {
//     const td = new TrainingDefinition();
//     td.id = 2;
//     td.title = 'TD 2';
//     td.levels = createLevelsMock();
//     return td;
//   }

//   function createLevelsMock(): Level[] {
//     const level1 = new TrainingLevel();
//     const level2 = new AssessmentLevel();
//     const level3 = new InfoLevel();
//     return [level1, level2, level3];
//   }
// });
