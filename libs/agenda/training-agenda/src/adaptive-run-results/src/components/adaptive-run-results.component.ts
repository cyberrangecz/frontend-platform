import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Observable } from 'rxjs';
import { map, take } from 'rxjs/operators';
import { ADAPTIVE_RUN_DATA_ATTRIBUTE_NAME } from '../../../index';
import { SentinelControlItem } from '@sentinel/components/controls';
import { TrainingRunResultsControls } from '../model/training-run-results-controls';
import { MitreTechniquesOverviewService } from '../service/mitre-techniques.service';

@Component({
    selector: 'crczp-adaptive-run-results',
    templateUrl: './adaptive-run-results.component.html',
    styleUrls: ['./adaptive-run-results.component.css'],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
/**
 * Component displaying visualization of adaptive run results
 */
export class AdaptiveRunResultsComponent implements OnInit {
    vizSize: { width: number; height: number };

    trainingRun$: Observable<any>;
    controls: SentinelControlItem[] = [];

    constructor(
        private activatedRoute: ActivatedRoute,
        private service: MitreTechniquesOverviewService,
    ) {
    }

    /**
     * Resolves controls action and calls appropriate handler
     * @param control selected control emitted by controls component
     */
    onControlsAction(control: SentinelControlItem): void {
        control.result$.pipe(take(1)).subscribe();
    }

    ngOnInit(): void {
        this.controls = TrainingRunResultsControls.createControls(this.service);
        this.trainingRun$ = this.activatedRoute.data.pipe(map((data) => data[ADAPTIVE_RUN_DATA_ATTRIBUTE_NAME]));
    }
}
