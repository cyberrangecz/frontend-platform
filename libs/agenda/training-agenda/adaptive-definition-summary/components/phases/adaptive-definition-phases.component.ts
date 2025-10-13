import {ChangeDetectionStrategy, Component, DestroyRef, inject, Input, OnInit, ViewChild} from '@angular/core';
import {AbstractPhaseTypeEnum, Phase, QuestionnairePhase, QuestionnaireTypeEnum} from '@crczp/training-model';
import {SentinelControlItem, SentinelControlItemSignal, SentinelControlsComponent} from '@sentinel/components/controls';
import {PhaseDetailExpandControls} from '../../model/phase-detail-expand-controls';
import {MatAccordion} from '@angular/material/expansion';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {AbstractPhaseDetailComponent} from "./phase/abstract-phase-detail.component";
import {MatIcon} from "@angular/material/icon";
import {MatTooltip} from "@angular/material/tooltip";
import {MatDivider} from "@angular/material/divider";

@Component({
    selector: 'crczp-adaptive-definition-phases',
    templateUrl: './adaptive-definition-phases.component.html',
    styleUrls: ['./adaptive-definition-phases.component.css'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        MatIcon,
        MatTooltip,
        SentinelControlsComponent,
        MatAccordion,
        AbstractPhaseDetailComponent,
        MatDivider
    ]
})
export class AdaptiveDefinitionPhasesDetailComponent implements OnInit {
    @Input() phases: Phase[];

    @ViewChild(MatAccordion) accordion: MatAccordion;

    controls: SentinelControlItem[];
    destroyRef = inject(DestroyRef);

    ngOnInit(): void {
        this.controls = PhaseDetailExpandControls.create();
    }

    onControlsAction(control: SentinelControlItemSignal): void {
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
