import {ChangeDetectionStrategy, Component, Input} from '@angular/core';
import {QuestionnairePhase, QuestionnaireTypeEnum, QuestionTypeEnum, TrainingPhase} from '@crczp/training-model';
import {MatFormField, MatInput, MatLabel} from "@angular/material/input";
import {QuestionsOverviewComponent} from "./question/overview/questions-overview.component";
import {NgForOf, NgIf} from "@angular/common";
import {MatDivider} from "@angular/material/divider";
import {
    MatExpansionPanel,
    MatExpansionPanelContent,
    MatExpansionPanelHeader,
    MatExpansionPanelTitle
} from "@angular/material/expansion";
import {MatIcon} from "@angular/material/icon";

@Component({
    selector: 'crczp-questionnaire-phase-configuration',
    templateUrl: './questionnaire-phase-edit.component.html',
    styleUrls: ['./questionnaire-phase-edit.component.css'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        MatFormField,
        MatLabel,
        MatInput,
        QuestionsOverviewComponent,
        NgIf,
        MatDivider,
        MatExpansionPanel,
        MatExpansionPanelHeader,
        MatExpansionPanelTitle,
        MatExpansionPanelContent,
        NgForOf,
        MatIcon
    ]
})
export class QuestionnairePhaseEditComponent {
    @Input() phase: QuestionnairePhase;
    @Input() updateQuestionsFlag: boolean;
    @Input() presentTrainingPhases: TrainingPhase[];

    questionnaireTypes = QuestionnaireTypeEnum;

    getTrainingPhaseTitle(id: number): string {
        let result = '';
        result = this.presentTrainingPhases.find((phase) => phase.id === id).title;
        return result;
    }

    getQuestionTitleById(qId: number): string {
        return this.phase.questions.find((question) => question.id === qId).text;
    }

    getQuestionIconById(qId: number): string {
        switch (this.phase.questions.find((question) => question.id === qId).questionType) {
            case QuestionTypeEnum.RFQ:
                return 'star_half';
            case QuestionTypeEnum.MCQ:
                return 'check_circle_outline';
            case QuestionTypeEnum.FFQ:
                return 'edit';
        }
    }
}
