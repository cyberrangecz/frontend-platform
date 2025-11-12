import { ChangeDetectionStrategy, Component, DestroyRef, inject, Input, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { TrainingInstance } from '@crczp/training-model';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AsyncPipe } from '@angular/common';
import { MatTab, MatTabContent, MatTabGroup, MatTabLabel } from '@angular/material/tabs';
import { CommandTimelineComponent, ProgressVisualizationsComponent, ViewEnum } from '@crczp/visualization-components';
import { MatIcon } from '@angular/material/icon';

/**
 * Component displaying progress visualization
 */
@Component({
    selector: 'crczp-training-instance-progress',
    templateUrl: './training-instance-progress.component.html',
    styleUrls: ['./training-instance-progress.component.css'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        AsyncPipe,
        MatTabGroup,
        MatTab,
        MatIcon,
        ProgressVisualizationsComponent,
        MatTabLabel,
        MatTabContent,
        CommandTimelineComponent,
    ],
})
export class TrainingInstanceProgressComponent implements OnInit {
    @Input() trainingInstance$: Observable<TrainingInstance>;
    destroyRef = inject(DestroyRef);
    protected readonly ViewEnum = ViewEnum;
    private activeRoute = inject(ActivatedRoute);

    ngOnInit(): void {
        this.trainingInstance$ = this.activeRoute.data.pipe(
            takeUntilDestroyed(this.destroyRef),
            filter((data) => !!data[TrainingInstance.name]),
            map((data) => data[TrainingInstance.name]),
        );
    }
}
