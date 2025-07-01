/**
 * Service handling editing of training-training-phase definition's levels and related operations.
 * Serves as a layer between component and API service
 * Subscribe to levels$, activeStep$ and activeLevelCanBeSaved$ to receive latest data updates.
 */
import { BehaviorSubject, Observable } from 'rxjs';
import { MitreTechnique } from '@crczp/training-model';

export abstract class MitreTechniquesService {
    protected mitreTechniquesSubject$: BehaviorSubject<MitreTechnique[]> = new BehaviorSubject([]);
    mitreTechniques$ = this.mitreTechniquesSubject$.asObservable();

    abstract getAll(): Observable<any>;
}
