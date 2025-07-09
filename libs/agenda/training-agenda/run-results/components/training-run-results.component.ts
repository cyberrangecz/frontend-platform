import {ChangeDetectionStrategy, Component, DestroyRef, inject, OnInit} from '@angular/core';
import {ActivatedRoute, RouterLink, RouterLinkActive, RouterOutlet} from '@angular/router';
import {Observable} from 'rxjs';
import {take} from 'rxjs/operators';
import {TRAINING_RUN_DATA_ATTRIBUTE_NAME} from '@crczp/training-agenda';
import {TrainingDefinitionApi} from '@crczp/training-api';
import {SentinelControlItemSignal} from '@sentinel/components/controls';
import {MitreTechniquesOverviewService} from '../service/mitre-techniques.service';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {MatTabLink, MatTabNav} from "@angular/material/tabs";
import {MatIcon} from "@angular/material/icon";
import {TrainingRunResultsRoutingModule} from "./training-run-results-routing.module";
import {MitreTechniquesOverviewConcreteService} from "../service/mitre-techniques-concrete.service";
import {AsyncPipe} from "@angular/common";


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
        AsyncPipe
    ],
    providers: [{provide: MitreTechniquesOverviewService, useClass: MitreTechniquesOverviewConcreteService}],
})
/**
 * Component displaying visualization of training run results
 */
export class TrainingRunResultsComponent implements OnInit {
    hasReferenceSolution$: Observable<boolean>;
    destroyRef = inject(DestroyRef);
    private activatedRoute = inject(ActivatedRoute);
    private trainingDefinitionApi = inject(TrainingDefinitionApi);
    private service = inject(MitreTechniquesOverviewService);

    ngOnInit(): void {
        this.loadVisualizationInfo();
    }

    /**
     * Resolves controls action and calls appropriate handler
     * @param control selected control emitted by controls component
     */
    onControlsAction(control: SentinelControlItemSignal): void {
        control.result$.pipe(take(1)).subscribe();
    }

    /**
     * Gets asynchronous data for visualizations
     */
    loadVisualizationInfo(): void {
        this.activatedRoute.data
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe(
                (data) =>
                    (this.hasReferenceSolution$ = this.trainingDefinitionApi.hasReferenceSolution(
                        data[TRAINING_RUN_DATA_ATTRIBUTE_NAME].trainingDefinitionId,
                    )),
            );
    }
}
