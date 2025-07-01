import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Phase } from '@crczp/training-model';
import { ADAPTIVE_DEFINITION_DATA_ATTRIBUTE_NAME } from '@crczp/training-agenda';
import { PhaseStepperAdapter } from '@crczp/training-agenda/internal';
import { AdaptivePreviewStepper } from '../model/adaptive-preview-stepper';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Component({
    selector: 'crczp-designer-preview',
    templateUrl: './adaptive-preview.component.html',
    styleUrls: ['./adaptive-preview.component.css'],
})
export class AdaptivePreviewComponent implements OnInit {
    activePhase: Phase;
    phases: Phase[];
    stepper: AdaptivePreviewStepper;
    isStepperDisplayed: boolean;

    constructor(private activeRoute: ActivatedRoute) {
        this.activeRoute.data.pipe(takeUntilDestroyed()).subscribe((data) => {
            this.phases = data[ADAPTIVE_DEFINITION_DATA_ATTRIBUTE_NAME].levels;
        });
    }

    ngOnInit(): void {
        if (this.phases?.length > 0) {
            this.init();
        }
    }

    private init() {
        const stepperAdapterPhases = this.phases.map((phase) => new PhaseStepperAdapter(phase));
        this.stepper = new AdaptivePreviewStepper(stepperAdapterPhases, 0);
        this.activePhase = this.phases[0];
    }

    /**
     * Jump to adaptive run phase.
     * @param index of desired phase
     */
    activeStepChanged(index: number): void {
        this.activePhase = this.phases[index];
    }
}
