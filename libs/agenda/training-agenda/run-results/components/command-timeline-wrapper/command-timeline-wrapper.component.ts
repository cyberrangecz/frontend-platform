import { Component, DestroyRef, inject, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { TrainingRun } from '@crczp/training-model';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Component({
    selector: 'crczp-command-timeline-wrapper',
    templateUrl: './command-timeline-wrapper.component.html',
    styleUrls: ['./command-timeline-wrapper.component.css'],
})
export class CommandTimelineWrapperComponent implements OnInit {
    trainingRun: TrainingRun;
    destroyRef = inject(DestroyRef);

    constructor(private activeRoute: ActivatedRoute) {}

    ngOnInit(): void {
        this.activeRoute.parent.data
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe((data) => (this.trainingRun = data.trainingRun));
    }
}
