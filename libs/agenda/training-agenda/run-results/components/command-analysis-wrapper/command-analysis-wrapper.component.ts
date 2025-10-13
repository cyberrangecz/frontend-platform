import {Component, DestroyRef, inject, OnInit} from '@angular/core';
import {ActivatedRoute} from '@angular/router';
import {TrainingInstance} from '@crczp/training-model';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {MistakeComponent} from "@crczp/visualization-components";

@Component({
    selector: 'crczp-command-analysis-wrapper',
    templateUrl: './command-analysis-wrapper.component.html',
    styleUrls: ['./command-analysis-wrapper.component.css'],
    imports: [
        MistakeComponent
    ]
})
export class CommandAnalysisWrapperComponent implements OnInit {
    trainingRun: TrainingInstance;
    destroyRef = inject(DestroyRef);
    private activeRoute = inject(ActivatedRoute);

    ngOnInit(): void {
        this.activeRoute.parent.data
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe((data) => (this.trainingRun = data.trainingRun));
    }
}
