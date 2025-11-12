import { ChangeDetectionStrategy, Component, DestroyRef, HostListener, inject, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { TrainingInstance } from '@crczp/training-model';
import { Observable } from 'rxjs';
import { filter, map, tap } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatTab, MatTabContent, MatTabGroup, MatTabLabel } from '@angular/material/tabs';
import { CommandTimelineComponent } from '@crczp/visualization-components';
import { MatIcon } from '@angular/material/icon';
import { SankeyVisualizationComponent } from '@crczp/adaptive-instance-simulator';
import { AsyncPipe } from '@angular/common';

/**
 * Component displaying adaptive instance progress visualizations
 */
@Component({
    selector: 'crczp-adaptive-instance-progress',
    templateUrl: './adaptive-instance-progress.component.html',
    styleUrls: ['./adaptive-instance-progress.component.css'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        MatTabGroup,
        MatTab,
        MatIcon,
        CommandTimelineComponent,
        MatTabLabel,
        MatTabContent,
        SankeyVisualizationComponent,
        AsyncPipe,
    ],
})
export class AdaptiveInstanceProgressComponent implements OnInit {
    trainingInstance$: Observable<TrainingInstance>;
    vizSize: { width: number; height: number };
    destroyRef = inject(DestroyRef);
    private activeRoute = inject(ActivatedRoute);

    @HostListener('window:resize', ['$event'])
    onResize(event: any): void {
        this.calculateVisualizationSize(
            event.target.innerWidth,
            event.target.innerHeight,
        );
    }

    ngOnInit(): void {
        this.trainingInstance$ = this.activeRoute.data.pipe(
            takeUntilDestroyed(this.destroyRef),
            filter((data) => !!data[TrainingInstance.name]),
            map((data) => data[TrainingInstance.name]),
            tap(() =>
                this.calculateVisualizationSize(
                    window.innerWidth,
                    window.innerHeight,
                ),
            ),
        );
    }

    private calculateVisualizationSize(
        windowWidth: number,
        windowHeight: number,
    ) {
        const width = windowWidth / 2;
        const height = windowHeight / 2;
        this.vizSize = { width, height };
    }
}
