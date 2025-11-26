import { Component, DestroyRef, inject, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { TrainingInstance } from '@crczp/training-model';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommandTimelineComponent } from '@crczp/components';

@Component({
    selector: 'crczp-command-timeline-wrapper',
    templateUrl: './command-timeline-wrapper.component.html',
    styleUrls: ['./command-timeline-wrapper.component.css'],
    imports: [CommandTimelineComponent],
})
export class CommandTimelineWrapperComponent implements OnInit {
    trainingInstance: TrainingInstance;
    destroyRef = inject(DestroyRef);
    private activeRoute = inject(ActivatedRoute);

    ngOnInit(): void {
        this.activeRoute.parent.data
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe(
                (data) => (this.trainingInstance = data.trainingInstance),
            );
    }
}
