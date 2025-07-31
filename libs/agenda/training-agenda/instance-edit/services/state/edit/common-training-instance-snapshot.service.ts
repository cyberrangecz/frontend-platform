import { BehaviorSubject, combineLatest, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { TrainingInstance } from '@crczp/training-model';
import { TrainingInstanceChangeEvent } from '../../../model/events/training-instance-change-event';

export class CommonTrainingInstanceSnapshotService {
    public saveDisabled$: Observable<boolean>;
    public isLoading$ = new BehaviorSubject<boolean>(false);
    protected editedSnapshot: TrainingInstance = null;
    protected trainingInstanceSubject$: BehaviorSubject<TrainingInstance> =
        new BehaviorSubject(undefined);
    private instanceValidSubject$ = new BehaviorSubject<boolean>(true);
    public instanceValid$ = this.instanceValidSubject$.asObservable();
    private saveDisabledSubject$ = new BehaviorSubject<boolean>(true);

    constructor() {
        this.saveDisabled$ = combineLatest([
            this.isLoading$,
            this.saveDisabledSubject$.asObservable(),
        ]).pipe(map(([loading, invalid]) => loading || invalid));
    }

    public setValid(valid: boolean): void {
        this.instanceValidSubject$.next(valid);
        this.checkInstanceValidity();
    }

    public checkInstanceValidity(): void {
        this.saveDisabledSubject$.next(
            !this.instanceValidSubject$.value ||
                (!this.editedSnapshot.localEnvironment &&
                    !this.editedSnapshot.poolId)
        );
    }

    public setLoading(loading: boolean): void {
        this.isLoading$.next(loading);
    }

    /**
     * Sets training instance as currently edited
     * @param trainingInstance to set as currently edited
     */
    public set(trainingInstance: TrainingInstance): void {
        let ti = trainingInstance;
        if (ti === null) {
            ti = new TrainingInstance();
            ti.showStepperBar = true;
            ti.backwardMode = true;
            this.instanceValidSubject$.next(false);
        }
        this.trainingInstanceSubject$.next(ti);
    }

    public setSandboxDefinitionId(sandboxDefinitionId: number): void {
        if (!this.editedSnapshot) {
            this.editedSnapshot = this.trainingInstanceSubject$.getValue();
            this.editedSnapshot.accessToken =
                this.editedSnapshot.accessToken.indexOf('-') !== -1
                    ? this.editedSnapshot.accessToken.substring(
                          0,
                          this.editedSnapshot.accessToken.lastIndexOf('-')
                      )
                    : this.editedSnapshot.accessToken;
        }
        this.editedSnapshot.sandboxDefinitionId = sandboxDefinitionId;
        this.editedSnapshot.poolId = null;
        this.checkInstanceValidity();
    }

    /**
     * Updated saveDisabled$ and saved snapshot of edited training instance
     * @param changeEvent training instance object and its validity
     */
    public change(changeEvent: TrainingInstanceChangeEvent): void {
        this.setValid(changeEvent.isValid);
        if (changeEvent.trainingInstance.localEnvironment)
            changeEvent.trainingInstance.poolId = null;
        this.editedSnapshot = changeEvent.trainingInstance;
    }

    /**
     * Handles change of pool selection
     * @param poolId pool ID of selected pool
     */
    public poolSelectionChange(poolId: number): void {
        this.editedSnapshot.poolId = poolId;
        this.editedSnapshot.sandboxDefinitionId = null;
        this.checkInstanceValidity();
    }
}
