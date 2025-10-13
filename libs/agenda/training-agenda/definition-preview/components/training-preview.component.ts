import {Component, inject, OnInit} from '@angular/core';
import {Level, TrainingDefinition} from '@crczp/training-model';
import {LevelStepperAdapter} from '@crczp/training-agenda/internal';
import {ActivatedRoute} from '@angular/router';
import {TrainingPreviewStepper} from '../model/training-preview-stepper';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {SentinelStepperComponent} from "@sentinel/components/stepper";
import {AbstractLevelComponent} from "./level/abstract-level.component";

/**
 * Main component of training run preview.
 */
@Component({
    selector: 'crczp-designer-preview',
    templateUrl: './training-preview.component.html',
    styleUrls: ['./training-preview.component.css'],
    imports: [
        SentinelStepperComponent,
        AbstractLevelComponent
    ]
})
export class TrainingPreviewComponent implements OnInit {
    activeLevel: Level;
    levels: Level[];
    stepper: TrainingPreviewStepper;
    private activeRoute = inject(ActivatedRoute);

    constructor() {
        this.activeRoute.data.pipe(takeUntilDestroyed()).subscribe((data) => {
            this.levels = data[TrainingDefinition.name].levels;
        });
    }

    ngOnInit(): void {
        if (this.levels?.length > 0) {
            this.init();
        }
    }

    /**
     * Jump to training run level.
     * @param index of desired level
     */
    activeStepChanged(index: number): void {
        this.activeLevel = this.levels[index];
    }

    private init() {
        const stepperAdapterLevels = this.levels.map((level) => new LevelStepperAdapter(level));
        this.stepper = new TrainingPreviewStepper(stepperAdapterLevels, 0);
        this.activeLevel = this.levels[0];
    }
}
