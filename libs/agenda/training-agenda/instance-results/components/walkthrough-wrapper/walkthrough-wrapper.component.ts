import { Component, DestroyRef, inject, OnInit } from '@angular/core';
import { Level, TrainingInstance } from '@crczp/training-model';
import { ActivatedRoute } from '@angular/router';
import { exhaustMap, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { WalkthroughService } from './services/walkthrough.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Component({
    selector: 'crczp-walkthrough-wrapper',
    templateUrl: './walkthrough-wrapper.component.html',
    styleUrls: ['./walkthrough-wrapper.component.css'],
})
export class WalkthroughWrapperComponent implements OnInit {
    trainingInstance$: Observable<TrainingInstance>;
    levels$: Observable<Level[]>;
    destroyRef = inject(DestroyRef);

    constructor(
        private activeRoute: ActivatedRoute,
        private walkthroughService: WalkthroughService,
    ) {}

    ngOnInit(): void {
        this.trainingInstance$ = this.activeRoute.parent.data.pipe(
            map((data) => data.trainingInstance),
            takeUntilDestroyed(this.destroyRef),
        );
        this.levels$ = this.trainingInstance$.pipe(
            exhaustMap((trainingInstance) => this.walkthroughService.get(trainingInstance.trainingDefinition.id)),
            map((trainingDefinition) => trainingDefinition.levels),
        ) as Observable<Level[]>;
    }
}
