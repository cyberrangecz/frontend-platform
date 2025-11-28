import { Component, DestroyRef, inject, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { TrainingInstance } from '@crczp/training-model';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DashboardComponent,SortingService } from '@crczp/components';

@Component({
    selector: 'crczp-dashboard-wrapper',
    templateUrl: './dashboard-wrapper.component.html',
    styleUrls: ['./dashboard-wrapper.component.css'],
    imports: [DashboardComponent, ],
    providers: [SortingService]
})
export class DashboardWrapperComponent implements OnInit {
    trainingInstance: TrainingInstance;
    destroyRef = inject(DestroyRef);
    private activeRoute = inject(ActivatedRoute);

    ngOnInit(): void {
        this.activeRoute.parent.data
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe(
                (data) => (this.trainingInstance = data[TrainingInstance.name]),
            );
    }
}
