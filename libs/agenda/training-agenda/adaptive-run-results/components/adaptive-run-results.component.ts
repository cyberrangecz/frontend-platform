import {ChangeDetectionStrategy, Component, inject, OnInit} from '@angular/core';
import {ActivatedRoute} from '@angular/router';
import {Observable} from 'rxjs';
import {map, take} from 'rxjs/operators';
import {SentinelControlItem, SentinelControlItemSignal} from '@sentinel/components/controls';
import {TrainingRunResultsControls} from '../model/training-run-results-controls';
import {MitreTechniquesOverviewService} from '../service/mitre-techniques.service';
import {AsyncPipe} from "@angular/common";
import {MatCard} from "@angular/material/card";
import {AdaptiveTransitionVisualizationComponent} from "@crczp/adaptive-instance-simulator";
import {MitreTechniquesOverviewConcreteService} from "../service/mitre-techniques-concrete.service";
import {TrainingRun} from "@crczp/training-model";

@Component({
    selector: 'crczp-adaptive-run-results',
    templateUrl: './adaptive-run-results.component.html',
    styleUrls: ['./adaptive-run-results.component.css'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    providers: [{provide: MitreTechniquesOverviewService, useClass: MitreTechniquesOverviewConcreteService}],

    imports: [
        AsyncPipe,
        MatCard,
        AdaptiveTransitionVisualizationComponent
    ]
})
/**
 * Component displaying visualization of adaptive run results
 */
export class AdaptiveRunResultsComponent implements OnInit {
    vizSize: { width: number; height: number };
    trainingRun$: Observable<any>;
    controls: SentinelControlItem[] = [];
    private activatedRoute = inject(ActivatedRoute);
    private service = inject(MitreTechniquesOverviewService);

    /**
     * Resolves controls action and calls appropriate handler
     * @param control selected control emitted by controls component
     */
    onControlsAction(control: SentinelControlItemSignal): void {
        control.result$.pipe(take(1)).subscribe();
    }

    ngOnInit(): void {
        this.controls = TrainingRunResultsControls.createControls(this.service);
        this.trainingRun$ = this.activatedRoute.data.pipe(map((data) => data[TrainingRun.name]));
    }

}
