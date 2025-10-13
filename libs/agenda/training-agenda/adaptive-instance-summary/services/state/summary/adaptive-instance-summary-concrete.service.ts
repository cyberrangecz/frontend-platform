import { inject, Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { TrainingInstance } from '@crczp/training-model';
import { from, Observable, timer } from 'rxjs';
import { map } from 'rxjs/operators';
import { AdaptiveInstanceSummaryService } from './adaptive-instance-summary.service';
import { Routing } from '@crczp/routing-commons';

@Injectable()
export class AdaptiveInstanceSummaryConcreteService extends AdaptiveInstanceSummaryService {
    private router = inject(Router);

    init(ti: TrainingInstance): void {
        this.trainingInstance = ti;
        this.hasStarted$ = timer(0, 60000).pipe(
            map(() => this.trainingInstance.hasStarted())
        );
    }

    showProgress(): Observable<any> {
        return from(
            this.router.navigate([
                Routing.RouteBuilder.adaptive_instance
                    .instanceId(this.trainingInstance.id)
                    .progress.build(),
            ])
        );
    }

    showResults(): Observable<any> {
        return from(
            this.router.navigate([
                Routing.RouteBuilder.adaptive_instance
                    .instanceId(this.trainingInstance.id)
                    .results.build(),
            ])
        );
    }

    showToken(): Observable<any> {
        return from(
            this.router.navigate([
                Routing.RouteBuilder.adaptive_instance
                    .instanceId(this.trainingInstance.id)
                    .access_token.build(),
            ])
        );
    }
}
