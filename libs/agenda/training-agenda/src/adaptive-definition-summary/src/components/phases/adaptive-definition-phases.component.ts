import { ChangeDetectionStrategy, Component, DestroyRef, inject, Input, OnInit, ViewChild } from '@angular/core';
import { AbstractPhaseTypeEnum, Phase, QuestionnairePhase, QuestionnaireTypeEnum } from '@crczp/training-model';
import { SentinelControlItem } from '@sentinel/components/controls';
import { PhaseDetailExpandControls } from '../../model/phase-detail-expand-controls';
import { MatAccordion } from '@angular/material/expansion';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Component({
    selector: 'crczp-adaptive-definition-phases',
    templateUrl: './adaptive-definition-phases.component.html',
    styleUrls: ['./adaptive-definition-phases.component.css'],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdaptiveDefinitionPhasesDetailComponent implements OnInit {
    @Input() phases: Phase[];

    @ViewChild(MatAccordion) accordion: MatAccordion;

    controls: SentinelControlItem[];
    destroyRef = inject(DestroyRef);

    ngOnInit(): void {
        this.controls = PhaseDetailExpandControls.create();
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

    getInfoPhases(): Phase[] {
        return this.phases.filter((phase: Phase) => phase.type === AbstractPhaseTypeEnum.Info);
    }

    getAccessPhases(): Phase[] {
        return this.phases.filter((phase: Phase) => phase.type === AbstractPhaseTypeEnum.Access);
    }

    getTrainingPhases(): Phase[] {
        return this.phases.filter((phase) => phase.type === AbstractPhaseTypeEnum.Training);
    }

    getAdaptiveQuestionnaires(): Phase[] {
        return this.phases.filter(
            (phase: QuestionnairePhase) =>
                phase.type === AbstractPhaseTypeEnum.Questionnaire &&
                phase.questionnaireType === QuestionnaireTypeEnum.Adaptive,
        );
    }

    getGeneralQuestionnaires(): Phase[] {
        return this.phases.filter(
            (phase: QuestionnairePhase) =>
                phase.type === AbstractPhaseTypeEnum.Questionnaire &&
                phase.questionnaireType === QuestionnaireTypeEnum.General,
        );
    }
}
