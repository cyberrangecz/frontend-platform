import {
    ChangeDetectionStrategy,
    Component,
    inject,
    OnInit,
    signal,
} from '@angular/core';
import {
    AdaptiveQuestion,
    Choice,
    QuestionAnswer,
    QuestionnairePhase,
    QuestionTypeEnum,
} from '@crczp/training-model';
import {
    MatError,
    MatFormField,
    MatInput,
    MatLabel,
} from '@angular/material/input';
import { MatCheckbox } from '@angular/material/checkbox';
import { FormsModule } from '@angular/forms';
import { MatButton } from '@angular/material/button';
import { AdaptiveAssessmentLevelService } from '../../../services/training-run/level/assessment/adaptive-assessment-level.service';
import { AbstractTrainingRunService } from '../../../services/training-run/abstract-training-run.service';
import { map } from 'rxjs/operators';
import { combineLatest } from 'rxjs';
import { AsyncPipe } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';

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
    questionAnswers: QuestionAnswer[] = [];
    questionTypes = QuestionTypeEnum;
    canSubmit = signal<boolean>(false);
    protected runService = inject(AbstractTrainingRunService);
    private questionnaireService = inject(AdaptiveAssessmentLevelService);

    protected readonly isLoading = toSignal(
        combineLatest([
            this.runService.isLoading$,
            this.questionnaireService.isLoading$,
        ]).pipe(
            map(
                ([isSubmittingAnswer, isLoadingLevel]) =>
                    isSubmittingAnswer || isLoadingLevel,
            ),
        ),
    );

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

        this.checkIfCanBeSubmitted();
    }

    onMCQChecked(event, questionIndex: number, answer: string): void {
        if (event.checked) {
            this.questionAnswers[questionIndex].answers.push(answer);
        } else {
            this.questionAnswers[questionIndex].answers = this.questionAnswers[
                questionIndex
            ].answers.filter((a) => a !== answer);
        }
        this.checkIfCanBeSubmitted();
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
        this.checkIfCanBeSubmitted();
    }

    submit(): void {
        this.questionnaireService.submit(this.questionAnswers);
    }

    checkedAsAnswered(question: AdaptiveQuestion, choice: Choice): boolean {
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
