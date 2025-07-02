import {ChangeDetectionStrategy, Component, DestroyRef, HostListener, inject, OnInit} from '@angular/core';
import {ActivatedRoute} from '@angular/router';
import {TrainingInstance} from '@crczp/training-model';
import {async, Observable} from 'rxjs';
import {map, tap} from 'rxjs/operators';
import {TRAINING_INSTANCE_DATA_ATTRIBUTE_NAME} from '@crczp/training-agenda';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';

/**
 * Component displaying adaptive instance progress visualizations
 */
@Component({
    selector: 'crczp-adaptive-instance-progress',
    templateUrl: './adaptive-instance-progress.component.html',
    styleUrls: ['./adaptive-instance-progress.component.css'],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdaptiveInstanceProgressComponent implements OnInit {
    trainingInstance$: Observable<TrainingInstance>;
    vizSize: { width: number; height: number };
    destroyRef = inject(DestroyRef);

    constructor(private activeRoute: ActivatedRoute) {
    }

    @HostListener('window:resize', ['$event'])
    onResize(event: any): void {
        this.calculateVisualizationSize(event.target.innerWidth, event.target.innerHeight);
    }

    ngOnInit(): void {
        this.trainingInstance$ = this.activeRoute.data.pipe(
            takeUntilDestroyed(this.destroyRef),
            map((data) => data[TRAINING_INSTANCE_DATA_ATTRIBUTE_NAME]),
            tap(() => this.calculateVisualizationSize(window.innerWidth, window.innerHeight)),
        );
    }

    private calculateVisualizationSize(windowWidth: number, windowHeight: number) {
        const width = windowWidth / 2;
        const height = windowHeight / 2;
        this.vizSize = { width, height };
    }

    protected readonly async = async;
}
