import {Component, DestroyRef, inject, OnInit} from '@angular/core';
import {TrainingInstance} from '@crczp/training-model';
import {ActivatedRoute, Router} from '@angular/router';
import {Observable} from 'rxjs';
import {TrainingNavigator} from '@crczp/training-agenda';
import {map} from 'rxjs/operators';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {AsyncPipe} from "@angular/common";
import {StatisticalVizComponent} from "@crczp/visualization-components";

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
    private navigator = inject(TrainingNavigator);

    ngOnInit(): void {
        this.trainingInstance$ = this.activeRoute.parent.data.pipe(
            takeUntilDestroyed(this.destroyRef),
            map((data) => data.trainingInstance as TrainingInstance),
        );
    }

    redirectToDetailView(instanceId: number): void {
        this.router.navigate([this.navigator.toTrainingInstanceResults(instanceId)]);
    }
}
