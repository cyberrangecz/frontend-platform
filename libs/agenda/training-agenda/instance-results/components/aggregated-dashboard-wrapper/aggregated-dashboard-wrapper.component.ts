import {Component, DestroyRef, inject, OnInit} from '@angular/core';
import {TrainingInstance} from '@crczp/training-model';
import {ActivatedRoute, Router} from '@angular/router';
import {Observable} from 'rxjs';
import {map} from 'rxjs/operators';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {AsyncPipe} from "@angular/common";
import { StatisticalVizComponent } from '@crczp/components';
import { Routing } from '@crczp/routing-commons';

@Component({
    selector: 'crczp-aggregated-dashboard-wrapper',
    templateUrl: './aggregated-dashboard-wrapper.component.html',
    styleUrls: ['./aggregated-dashboard-wrapper.component.css'],
    imports: [
        AsyncPipe,
        StatisticalVizComponent
    ]
})
export class AggregatedDashboardWrapperComponent implements OnInit {
    trainingInstance$: Observable<TrainingInstance>;
    destroyRef = inject(DestroyRef);
    private activeRoute = inject(ActivatedRoute);
    private router = inject(Router);

    ngOnInit(): void {
        this.trainingInstance$ = this.activeRoute.parent.data.pipe(
            takeUntilDestroyed(this.destroyRef),
            map((data) => data[TrainingInstance.name])
        );
    }

    redirectToDetailView(instanceId: number): void {
        this.router.navigate([
            Routing.RouteBuilder.linear_instance.instanceId(instanceId).results.build()
        ]);
    }
}
