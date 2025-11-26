import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import {
    QuestionnairePhase,
    QuestionnaireTypeEnum,
    QuestionTypeEnum,
    TrainingPhase,
} from '@crczp/training-model';
import { MatFormField, MatInput, MatLabel } from '@angular/material/input';

import { MatDivider } from '@angular/material/divider';
import {
    MatExpansionPanel,
    MatExpansionPanelContent,
    MatExpansionPanelHeader,
    MatExpansionPanelTitle,
} from '@angular/material/expansion';
import { MatIcon } from '@angular/material/icon';
import { QuestionsOverviewVsualizationComponent } from './question/overview/questions-overview-vsualization.component';

@Component({
    selector: 'crczp-questionnaire-phase-configuration',
    templateUrl: './questionnaire-phase-edit.component.html',
    styleUrls: ['./questionnaire-phase-edit.component.css'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        MatFormField,
        MatLabel,
        MatInput,
        MatDivider,
        MatExpansionPanel,
        MatExpansionPanelHeader,
        MatExpansionPanelTitle,
        MatExpansionPanelContent,
        MatIcon,
        QuestionsOverviewVsualizationComponent,
    ],
})
export class QuestionnairePhaseEditComponent {
    @Input() phase: QuestionnairePhase;
    @Input() updateQuestionsFlag: boolean;
    @Input() presentTrainingPhases: TrainingPhase[];

    questionnaireTypes = QuestionnaireTypeEnum;

    getQuestionTitleById(qId: number): string {
        return this.phase.questions.find((question) => question.id === qId)
            .text;
    }

    getQuestionIconById(qId: number): string {
        switch (
            this.phase.questions.find((question) => question.id === qId)
                .questionType
        ) {
            case QuestionTypeEnum.RFQ:
                return 'star_half';
            case QuestionTypeEnum.MCQ:
                return 'check_circle_outline';
            case QuestionTypeEnum.FFQ:
                return 'edit';
        }
    }
}
