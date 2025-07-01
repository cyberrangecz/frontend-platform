import { BehaviorSubject, Observable } from 'rxjs';

export abstract class MitreTechniquesOverviewService {
    protected hasErrorSubject$: BehaviorSubject<boolean> = new BehaviorSubject(false);
    hasError$: Observable<boolean> = this.hasErrorSubject$.asObservable();

    protected isLoadingSubject$: BehaviorSubject<boolean> = new BehaviorSubject(false);
    isLoading$: Observable<boolean> = this.isLoadingSubject$.asObservable();

    protected resourceSubject$: BehaviorSubject<string> = new BehaviorSubject('');
    resource$: Observable<string> = this.resourceSubject$.asObservable();

    abstract getMitreTechniques(played: boolean): Observable<string>;
}
