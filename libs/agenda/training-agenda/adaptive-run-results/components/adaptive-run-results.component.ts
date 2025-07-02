import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import {ActivatedRoute} from '@angular/router';
import {async, Observable} from 'rxjs';
import {map, take} from 'rxjs/operators';
import {ADAPTIVE_RUN_DATA_ATTRIBUTE_NAME} from '@crczp/training-agenda';
import {SentinelControlItem, SentinelControlItemSignal} from '@sentinel/components/controls';
import {TrainingRunResultsControls} from '../model/training-run-results-controls';
import {MitreTechniquesOverviewService} from '../service/mitre-techniques.service';

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
    private activatedRoute = inject(ActivatedRoute);
    private service = inject(MitreTechniquesOverviewService);

    vizSize: { width: number; height: number };

    trainingRun$: Observable<any>;
    controls: SentinelControlItem[] = [];

    /**
     * Resolves controls action and calls appropriate handler
     * @param control selected control emitted by controls component
     */
    onControlsAction(control: SentinelControlItemSignal): void {
        control.result$.pipe(take(1)).subscribe();
    }

    ngOnInit(): void {
        this.controls = TrainingRunResultsControls.createControls(this.service);
        this.trainingRun$ = this.activatedRoute.data.pipe(map((data) => data[ADAPTIVE_RUN_DATA_ATTRIBUTE_NAME]));
    }

    protected readonly async = async;
}
