import { Component, DestroyRef, inject, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { TrainingInstance } from '@crczp/training-model';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AssessmentResultsVisualizationComponent } from '@crczp/components';

@Component({
    selector: 'crczp-assessment-wrapper',
    templateUrl: './assessment-wrapper.component.html',
    styleUrls: ['./assessment-wrapper.component.css'],
    imports: [AssessmentResultsVisualizationComponent],
})
export class AssessmentWrapperComponent implements OnInit {
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
