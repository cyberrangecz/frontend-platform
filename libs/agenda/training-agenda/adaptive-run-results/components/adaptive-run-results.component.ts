import {
    ChangeDetectionStrategy,
    Component,
    inject,
    OnInit,
} from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { AsyncPipe } from '@angular/common';
import { MatCard } from '@angular/material/card';
import { AdaptiveTransitionVisualizationComponent } from '@crczp/adaptive-instance-simulator';
import { TrainingRun } from '@crczp/training-model';

@Component({
    selector: 'crczp-adaptive-run-results',
    templateUrl: './adaptive-run-results.component.html',
    styleUrls: ['./adaptive-run-results.component.css'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [AsyncPipe, MatCard, AdaptiveTransitionVisualizationComponent],
})
/**
 * Component displaying visualization of adaptive run results
 */
export class AdaptiveRunResultsComponent implements OnInit {
    trainingRun$: Observable<any>;
    private activatedRoute = inject(ActivatedRoute);

    ngOnInit(): void {
        this.trainingRun$ = this.activatedRoute.data.pipe(
            map((data) => data[TrainingRun.name])
        );
    }
}
