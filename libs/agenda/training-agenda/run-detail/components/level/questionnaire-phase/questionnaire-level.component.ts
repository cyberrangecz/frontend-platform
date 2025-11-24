import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { AdaptiveQuestion, Choice, QuestionAnswer, QuestionnairePhase, QuestionTypeEnum } from '@crczp/training-model';
import { MatError, MatFormField, MatInput, MatLabel } from '@angular/material/input';
import { MatCheckbox } from '@angular/material/checkbox';
import { FormsModule } from '@angular/forms';
import { MatButton } from '@angular/material/button';
import {
    AdaptiveAssessmentLevelService
} from '../../../services/training-run/level/assessment/adaptive-assessment-level.service';
import { AbstractTrainingRunService } from '../../../services/training-run/abstract-training-run.service';
import { map } from 'rxjs/operators';
import { async } from 'rxjs';
import { AsyncPipe } from '@angular/common';

@Component({
    selector: 'crczp-questionnaire-level',
    templateUrl: './questionnaire-level.component.html',
    styleUrls: ['./questionnaire-level.component.css'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        MatFormField,
        MatLabel,
        MatError,
        MatCheckbox,
        FormsModule,
        MatButton,
        MatInput,
        AsyncPipe,
    ],
    providers: [AdaptiveAssessmentLevelService],
})
export class QuestionnaireLevelComponent implements OnInit {
    isLoading = false;
    questionAnswers: QuestionAnswer[] = [];
    questionTypes = QuestionTypeEnum;
    canSubmit = signal<boolean>(false);
    protected readonly async = async;
    protected runService = inject(AbstractTrainingRunService);
    private questionnaireService = inject(AdaptiveAssessmentLevelService);

    protected get phase$() {
        return this.runService.runInfo$.pipe(
            map((runInfo) => runInfo.displayedLevel as QuestionnairePhase),
        );
    }

    private get questions(): AdaptiveQuestion[] {
        if (
            !(
                this.runService.runInfo.displayedLevel instanceof
                QuestionnairePhase
            )
        ) {
            throw new Error('Displayed level is not a QuestionnairePhase');
        }
        return (this.runService.runInfo.displayedLevel as QuestionnairePhase)
            .questions;
    }

    ngOnInit(): void {
        this.initEmptyAnswers();
    }

    onMCQChecked(event, questionIndex: number, answer: string): void {
        if (event.checked) {
            this.questionAnswers[questionIndex].answers.push(answer);
        } else {
            this.questionAnswers[questionIndex].answers = this.questionAnswers[
                questionIndex
            ].answers.filter((a) => a !== answer);
        }
    }

    checkIfCanBeSubmitted(): void {
        this.canSubmit.set(
            this.questions.every((question) => {
                if (!question.answerRequired) {
                    return true;
                } else {
                    const answers = this.questionAnswers.find(
                        (answer) => answer.questionId === question.id,
                    )?.answers;
                    return answers && answers.length > 0;
                }
            }),
        );
    }

    onRFQChecked(event, questionIndex: number, answer: string): void {
        if (event.checked) {
            this.questionAnswers[questionIndex].answers[0] = answer;
        } else {
            this.questionAnswers[questionIndex].answers = [];
        }
    }

    submit(): void {
        this.questionnaireService.submit(this.questionAnswers);
    }

    checkedAsAnswered(question: AdaptiveQuestion, choice: Choice): boolean {
        this.checkIfCanBeSubmitted();
        return question.userAnswers?.some(
            (answer: string) => answer === choice.text,
        );
    }

    protected onNext() {
        this.runService.nextLevel();
    }

    private initEmptyAnswers() {
        this.questionAnswers = [];
        this.questions.forEach((question) => {
            const answers = new QuestionAnswer();
            answers.questionId = question.id;
            answers.answers = question.userAnswers ? question.userAnswers : [];
            this.questionAnswers.push(answers);
        });
    }
}
