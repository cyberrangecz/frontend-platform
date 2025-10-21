import {
    ChangeDetectionStrategy,
    Component,
    DestroyRef,
    inject,
    OnInit,
} from '@angular/core';
import {
    ActivatedRoute,
    RouterLink,
    RouterLinkActive,
    RouterOutlet,
} from '@angular/router';
import { Observable } from 'rxjs';
import { LinearTrainingDefinitionApi } from '@crczp/training-api';
import { MitreTechniquesOverviewService } from '../service/mitre-techniques.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatTabLink, MatTabNav } from '@angular/material/tabs';
import { MatIcon } from '@angular/material/icon';
import { TrainingRunResultsRoutingModule } from './training-run-results-routing.module';
import { AsyncPipe } from '@angular/common';
import { TrainingRun } from '@crczp/training-model';

@Component({
    selector: 'crczp-training-run-results',
    templateUrl: './training-run-results.component.html',
    styleUrls: ['./training-run-results.component.css'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        RouterLinkActive,
        RouterLink,
        MatTabLink,
        MatTabNav,
        MatIcon,
        MatIcon,
        RouterOutlet,
        TrainingRunResultsRoutingModule,
        AsyncPipe,
    ],
    providers: [MitreTechniquesOverviewService],
})
/**
 * Component displaying visualization of training run results
 */
export class TrainingRunResultsComponent implements OnInit {
    hasReferenceSolution$: Observable<boolean>;
    destroyRef = inject(DestroyRef);
    private activatedRoute = inject(ActivatedRoute);
    private trainingDefinitionApi = inject(LinearTrainingDefinitionApi);

    ngOnInit(): void {
        this.loadVisualizationInfo();
    }

    /**
     * Gets asynchronous data for visualizations
     */
    loadVisualizationInfo(): void {
        this.activatedRoute.data
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe(
                (data) =>
                    (this.hasReferenceSolution$ =
                        this.trainingDefinitionApi.hasReferenceSolution(
                            data[TrainingRun.name].trainingDefinitionId,
                        )),
            );
    }
}
