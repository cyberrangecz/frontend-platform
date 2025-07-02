import {Component, DestroyRef, inject, OnInit} from '@angular/core';
import {ActivatedRoute} from '@angular/router';
import {TrainingInstance} from '@crczp/training-model';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';

@Component({
    selector: 'crczp-command-analysis-wrapper',
    templateUrl: './command-analysis-wrapper.component.html',
    styleUrls: ['./command-analysis-wrapper.component.css'],
})
export class CommandAnalysisWrapperComponent implements OnInit {
    private activeRoute = inject(ActivatedRoute);

    trainingInstance: TrainingInstance;
    destroyRef = inject(DestroyRef);

    ngOnInit(): void {
        this.activeRoute.parent.data
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe((data) => (this.trainingInstance = data.trainingInstance));
    }
}
