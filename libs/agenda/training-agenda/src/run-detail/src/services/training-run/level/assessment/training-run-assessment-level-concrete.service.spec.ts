import { TestBed } from '@angular/core/testing';
import { asyncData } from '@sentinel/common/testing';
import { TrainingRunApi } from '@crczp/training-api';
import { Question } from '@crczp/training-model';
import { throwError } from 'rxjs';
import {
    createContext,
    createErrorHandlerSpy,
    createRunningTrainingRunServiceSpy,
    createTrainingRunApiSpy,
} from '../../../../../../internal/src/testing/testing-commons.spec';
import { TrainingErrorHandler } from '../../../../../../src/services/training-error.handler.service';
import { TrainingAgendaContext } from '../../../../../../internal/src/services/context/training-agenda-context.service';
import { RunningTrainingRunService } from '../../running/running-training-run.service';
import { TrainingRunAssessmentLevelConcreteService } from './training-run-assessment-level-concrete.service';

describe('TrainingRunAssessmentLevelConcreteService', () => {
    let errorHandlerSpy: jasmine.SpyObj<TrainingErrorHandler>;
    let apiSpy: jasmine.SpyObj<TrainingRunApi>;
    let service: TrainingRunAssessmentLevelConcreteService;
    let runningTrainingRunServiceSpy: jasmine.SpyObj<RunningTrainingRunService>;
    let context: TrainingAgendaContext;

    beforeEach(() => {
        errorHandlerSpy = createErrorHandlerSpy();
        apiSpy = createTrainingRunApiSpy();
        runningTrainingRunServiceSpy = createRunningTrainingRunServiceSpy();
        context = createContext();

        TestBed.configureTestingModule({
            providers: [
                TrainingRunAssessmentLevelConcreteService,
                { provide: TrainingRunApi, useValue: apiSpy },

                { provide: TrainingErrorHandler, useValue: errorHandlerSpy },
                { provide: RunningTrainingRunService, useValue: runningTrainingRunServiceSpy },
                { provide: TrainingAgendaContext, useValue: context },
            ],
        });
        service = TestBed.inject(TrainingRunAssessmentLevelConcreteService);
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    it('should submit answers', (done) => {
        const questions = createMock();
        runningTrainingRunServiceSpy.next.and.returnValue(asyncData(questions));
        apiSpy.submitAnswers.and.returnValue(asyncData(questions));
        service.submit(questions).subscribe(
            () => {
                expect(apiSpy.submitAnswers).toHaveBeenCalledTimes(1);
                expect(runningTrainingRunServiceSpy.next).toHaveBeenCalledTimes(1);
                done();
            },
            () => fail,
        );
    });

    it('should throw error when submit answers fails', (done) => {
        const questions = createMock();
        apiSpy.submitAnswers.and.returnValue(throwError(null));
        service.submit(questions).subscribe(
            () => fail,
            (err) => {
                expect(errorHandlerSpy.emit).toHaveBeenCalledTimes(1);
                expect(errorHandlerSpy.emit).toHaveBeenCalledWith(err, jasmine.anything());
                done();
            },
        );
    });

    function createMock() {
        const question1 = new DummyQuestion('Question 1');
        const question2 = new DummyQuestion('Question 2');
        const question3 = new DummyQuestion('Question 3');
        return [question1, question2, question3];
    }

    class DummyQuestion extends Question {
        constructor(title: string) {
            super(title);
        }
    }
});
