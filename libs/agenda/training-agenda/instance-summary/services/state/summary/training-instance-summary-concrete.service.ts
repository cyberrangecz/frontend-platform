import {inject, Injectable} from '@angular/core';
import {Router} from '@angular/router';
import {TrainingInstance} from '@crczp/training-model';
import {from, Observable, timer} from 'rxjs';
import {map} from 'rxjs/operators';
import {TrainingInstanceSummaryService} from './training-instance-summary.service';
import {Routing} from "@crczp/common";

@Injectable()
export class TrainingInstanceSummaryConcreteService extends TrainingInstanceSummaryService {
    private router = inject(Router);


    init(ti: TrainingInstance): void {
        this.trainingInstance = ti;
        this.hasStarted$ = timer(0, 60000).pipe(map(() => this.trainingInstance.hasStarted()));
    }

    showProgress(): Observable<boolean> {
        return from(this.router.navigate([Routing.RouteBuilder.linear_instance.instanceId(this.trainingInstance.id).progress]));
    }

    showResults(): Observable<any> {
        return from(this.router.navigate([Routing.RouteBuilder.linear_instance.instanceId(this.trainingInstance.id).results]));
    }

    showAggregatedResults(): Observable<any> {
        return from(
            this.router.navigate([Routing.RouteBuilder.linear_instance.instanceId(this.trainingInstance.id).aggregated_results]),
        );
    }

    showCheatingDetection(): Observable<any> {
        return from(
            this.router.navigate([Routing.RouteBuilder.linear_instance.instanceId(this.trainingInstance.id).cheating_detection]),
        );
    }
}
