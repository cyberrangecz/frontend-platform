import { TrainingInstance } from '@crczp/training-model';
import { Observable } from 'rxjs';

export abstract class TrainingInstanceSummaryService {
    hasStarted$: Observable<boolean>;
    protected trainingInstance: TrainingInstance;

    abstract init(ti: TrainingInstance): void;

    abstract showProgress(): Observable<any>;

    abstract showResults(): Observable<any>;

    abstract showAggregatedResults(): Observable<any>;

    abstract showCheatingDetection(): Observable<any>;
}
