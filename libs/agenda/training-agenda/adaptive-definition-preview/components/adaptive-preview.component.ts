import {Component, inject, OnInit} from '@angular/core';
import {ActivatedRoute} from '@angular/router';
import {Phase} from '@crczp/training-model';
import {ADAPTIVE_DEFINITION_DATA_ATTRIBUTE_NAME} from '@crczp/training-agenda';
import {PhaseStepperAdapter} from '@crczp/training-agenda/internal';
import {AdaptivePreviewStepper} from '../model/adaptive-preview-stepper';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {AdaptiveDefinitionBreadcrumbResolver, AdaptiveDefinitionResolver} from "@crczp/training-agenda/resolvers";
import {AbstractPhaseComponent} from "./phase/abstract-phase.component";
import {SentinelStepperComponent} from "@sentinel/components/stepper";

@Component({
    selector: 'crczp-designer-preview',
    templateUrl: './adaptive-preview.component.html',
    styleUrls: ['./adaptive-preview.component.css'],
    providers: [AdaptiveDefinitionResolver, AdaptiveDefinitionBreadcrumbResolver],
    imports: [
        AbstractPhaseComponent,
        SentinelStepperComponent
    ]
})
export class AdaptivePreviewComponent implements OnInit {
    activePhase: Phase;
    phases: Phase[];
    stepper: AdaptivePreviewStepper;
    isStepperDisplayed: boolean;
    private activeRoute = inject(ActivatedRoute);

    constructor() {
        this.activeRoute.data.pipe(takeUntilDestroyed()).subscribe((data) => {
            this.phases = data[ADAPTIVE_DEFINITION_DATA_ATTRIBUTE_NAME].levels;
        });
    }

    ngOnInit(): void {
        if (this.phases?.length > 0) {
            this.init();
        }
    }

    /**
     * Jump to adaptive run phase.
     * @param index of desired phase
     */
    activeStepChanged(index: number): void {
        this.activePhase = this.phases[index];
    }

    private init() {
        const stepperAdapterPhases = this.phases.map((phase) => new PhaseStepperAdapter(phase));
        this.stepper = new AdaptivePreviewStepper(stepperAdapterPhases, 0);
        this.activePhase = this.phases[0];
    }
}
