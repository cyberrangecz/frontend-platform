import { TrainingInstance } from '@crczp/training-model';
import { Observable } from 'rxjs';

export abstract class AdaptiveInstanceSummaryService {
    hasStarted$: Observable<boolean>;
    protected trainingInstance: TrainingInstance;

    abstract init(ti: TrainingInstance): void;

    abstract showProgress(): Observable<any>;

    abstract showResults(): Observable<any>;

    abstract showToken(): Observable<any>;
}
