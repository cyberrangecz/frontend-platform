import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { TrainingInstance } from '@crczp/training-model';
import { from, Observable, timer } from 'rxjs';
import { map } from 'rxjs/operators';
import { TrainingNavigator } from '@crczp/training-agenda';
import { AdaptiveInstanceSummaryService } from './adaptive-instance-summary.service';

@Injectable()
export class AdaptiveInstanceSummaryConcreteService extends AdaptiveInstanceSummaryService {
    constructor(
        private router: Router,
        private navigator: TrainingNavigator,
    ) {
        super();
    }

    init(ti: TrainingInstance): void {
        this.trainingInstance = ti;
        this.hasStarted$ = timer(0, 60000).pipe(map(() => this.trainingInstance.hasStarted()));
    }

    showProgress(): Observable<any> {
        return from(this.router.navigate([this.navigator.toAdaptiveInstanceProgress(this.trainingInstance.id)]));
    }

    showResults(): Observable<any> {
        return from(this.router.navigate([this.navigator.toAdaptiveInstanceResults(this.trainingInstance.id)]));
    }

    showToken(): Observable<any> {
        return from(this.router.navigate([this.navigator.toAdaptiveInstanceAccessToken(this.trainingInstance.id)]));
    }
}
