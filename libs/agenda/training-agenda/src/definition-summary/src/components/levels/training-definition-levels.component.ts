import { ChangeDetectionStrategy, Component, DestroyRef, inject, Input, OnInit, ViewChild } from '@angular/core';
import { AbstractLevelTypeEnum, Level } from '@crczp/training-model';
import { SentinelControlItem } from '@sentinel/components/controls';
import { LevelDetailExpandControls } from '../../model/level-detail-expand-controls';
import { MatAccordion } from '@angular/material/expansion';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Component({
    selector: 'crczp-training-definition-levels',
    templateUrl: './training-definition-levels.component.html',
    styleUrls: ['./training-definition-levels.component.css'],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TrainingDefinitionLevelsDetailComponent implements OnInit {
    @Input() levels: Level[];

    @ViewChild(MatAccordion) accordion: MatAccordion;

    controls: SentinelControlItem[];
    destroyRef = inject(DestroyRef);

    ngOnInit(): void {
        this.controls = LevelDetailExpandControls.create();
    }

    onControlsAction(control: SentinelControlItem): void {
        control.result$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((res) => {
            if (res === 'expand') {
                this.accordion.openAll();
            } else {
                this.accordion.closeAll();
            }
        });
    }

    getInfoLevels(): Level[] {
        return this.levels.filter((level) => level.type === AbstractLevelTypeEnum.Info);
    }

    getAccessLevels(): Level[] {
        return this.levels.filter((level) => level.type === AbstractLevelTypeEnum.Access);
    }

    getTrainingLevels(): Level[] {
        return this.levels.filter((level) => level.type === AbstractLevelTypeEnum.Training);
    }

    getAssessmentLevels(): Level[] {
        return this.levels.filter((level) => level.type === AbstractLevelTypeEnum.Assessment);
    }
}
