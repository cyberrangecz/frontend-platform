import { Component, DestroyRef, inject, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { TrainingInstance } from '@crczp/training-model';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Component({
    selector: 'crczp-dashboard-wrapper',
    templateUrl: './dashboard-wrapper.component.html',
    styleUrls: ['./dashboard-wrapper.component.css'],
})
export class DashboardWrapperComponent implements OnInit {
    trainingInstance: TrainingInstance;
    destroyRef = inject(DestroyRef);

    constructor(private activeRoute: ActivatedRoute) {}

    ngOnInit(): void {
        this.activeRoute.parent.data
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe((data) => (this.trainingInstance = data.trainingInstance));
    }
}
