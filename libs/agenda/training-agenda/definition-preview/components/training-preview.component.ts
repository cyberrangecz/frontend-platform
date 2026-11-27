import { Component, inject, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { Level, TrainingDefinitionWithLevels } from '@crczp/training-model';
import { ActivatedRoute } from '@angular/router';
import { TrainingPreviewStepper } from '../model/training-preview-stepper';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { SentinelStepperComponent } from '@sentinel/components/stepper';
import { AbstractLevelComponent } from './level/abstract-level.component';
import { LevelStepperAdapter } from '@crczp/components';
import {
    SHOWN_DEFINITION_ATTACHMENTS,
    ShownDefinitionAttachmentSource,
} from '@crczp/training-agenda/internal';

/**
 * Main component of training run preview.
 */
@Component({
    selector: 'crczp-designer-preview',
    templateUrl: './training-preview.component.html',
    styleUrls: ['./training-preview.component.css'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [SentinelStepperComponent, AbstractLevelComponent],
    providers: SHOWN_DEFINITION_ATTACHMENTS,
})
export class TrainingPreviewComponent implements OnInit {
    activeLevel: Level;
    levels: Level[];
    stepper: TrainingPreviewStepper;
    private activeRoute = inject(ActivatedRoute);
    private readonly attachments = inject(ShownDefinitionAttachmentSource);

    constructor() {
        this.activeRoute.data.pipe(takeUntilDestroyed()).subscribe((data) => {
            const definition: TrainingDefinitionWithLevels = data[TrainingDefinitionWithLevels.name];
            this.levels = definition.levels;
            this.attachments.show(definition.id);
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
        const stepperAdapterLevels = this.levels.map(
            (level) => new LevelStepperAdapter(level),
        );
        this.stepper = new TrainingPreviewStepper(stepperAdapterLevels, 0);
        this.activeLevel = this.levels[0];
    }
}
