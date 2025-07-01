import { BehaviorSubject, Observable } from 'rxjs';
import { skipWhile } from 'rxjs/operators';
import { AccessTrainingRunInfo, Phase, QuestionAnswer } from '@crczp/training-model';
import { ConsoleUrl } from '@crczp/topology-graph';

export abstract class RunningAdaptiveRunService {
    sandboxInstanceId: string;
    sandboxDefinitionId: number;
    localEnvironment: boolean;
    trainingRunId: number;

    protected activePhaseSubject$: BehaviorSubject<Phase> = new BehaviorSubject<Phase>(undefined);
    activePhase$: Observable<Phase> = this.activePhaseSubject$
        .asObservable()
        .pipe(skipWhile((phase) => phase === undefined || phase === null));

    protected backtrackedPhaseSubject$: BehaviorSubject<Phase> = new BehaviorSubject<Phase>(undefined);
    backtrackedPhase$: Observable<Phase> = this.backtrackedPhaseSubject$
        .asObservable()
        .pipe(skipWhile((phase) => phase === undefined || phase === null));

    protected isCurrentPhaseAnsweredSubject$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);
    isCurrentPhaseAnswered$: Observable<boolean> = this.isCurrentPhaseAnsweredSubject$.asObservable();

    abstract init(adaptiveRunInfo: AccessTrainingRunInfo): void;

    abstract getPhases(): Phase[];

    abstract getActivePhase(): Phase;

    abstract getActivePhasePosition(): number;

    abstract getBacktrackedPhase(): Phase;

    abstract getBacktrackedPhasePosition(): number;

    abstract getStartTime(): Date;

    abstract getIsStepperDisplayed(): boolean;

    abstract getBackwardMode(): boolean;

    abstract next(): Observable<any>;

    abstract moveToPhase(phaseId: number): Observable<Phase>;

    abstract isLast(): boolean;

    abstract clear(): void;

    abstract submitQuestionnaire(answers: QuestionAnswer[]): Observable<any>;

    abstract loadConsoles(sandboxId: string): Observable<ConsoleUrl[]>;
}
