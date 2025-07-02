import { ChangeDetectionStrategy, Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges, inject } from '@angular/core';
import {take} from 'rxjs/operators';
import {AdaptiveQuestion, Choice, QuestionAnswer, QuestionnairePhase, QuestionTypeEnum} from '@crczp/training-model';
import {RunningAdaptiveRunService} from '../../../services/adaptive-run/running/running-adaptive-run.service';

@Component({
    selector: 'crczp-questionnaire-phase',
    templateUrl: './questionnaire-phase.component.html',
    styleUrls: ['./questionnaire-phase.component.css'],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QuestionnairePhaseComponent implements OnChanges, OnInit {
    private runningAdaptiveRunService = inject(RunningAdaptiveRunService);

    @Input() phase: QuestionnairePhase;
    @Input() isLast: boolean;
    @Input() isPhaseAnswered: boolean;
    @Input() isBacktracked: boolean;
    @Output() next: EventEmitter<void> = new EventEmitter();

    isLoading = false;
    questionAnswers: QuestionAnswer[] = [];
    questionTypes = QuestionTypeEnum;
    canSubmit = false;

    ngOnChanges(changes: SimpleChanges): void {
        if ('phase' in changes) {
            this.initEmptyAnswers();
        }
    }

    ngOnInit(): void {
        this.initEmptyAnswers();
    }

    private initEmptyAnswers() {
        this.questionAnswers = [];
        this.phase.questions.forEach((question) => {
            const answers = new QuestionAnswer();
            answers.questionId = question.id;
            answers.answers = question.userAnswers ? question.userAnswers : [];
            this.questionAnswers.push(answers);
        });
    }

    onNext(): void {
        this.next.emit();
    }

    onMCQChecked(event, questionIndex: number, answer: string): void {
        if (event.checked) {
            this.questionAnswers[questionIndex].answers.push(answer);
        } else {
            this.questionAnswers[questionIndex].answers = this.questionAnswers[questionIndex].answers.filter(
                (a) => a !== answer,
            );
        }
    }

    checkIfCanBeSubmitted(): void {
        this.canSubmit = this.phase.questions.every((question) => {
            if (!question.answerRequired) {
                return true;
            } else {
                const answers = this.questionAnswers.find((answer) => answer.questionId === question.id)?.answers;
                return answers && answers.length > 0;
            }
        });
    }

    onRFQChecked(event, questionIndex: number, answer: string): void {
        if (event.checked) {
            this.questionAnswers[questionIndex].answers[0] = answer;
        } else {
            this.questionAnswers[questionIndex].answers = [];
        }
    }

    submit(): void {
        this.isLoading = true;
        this.runningAdaptiveRunService
            .submitQuestionnaire(this.questionAnswers)
            .pipe(take(1))
            .subscribe(() => {
                this.isLoading = false;
            });
    }

    checkedAsAnswered(question: AdaptiveQuestion, choice: Choice): boolean {
        this.checkIfCanBeSubmitted();
        return question.userAnswers?.some((answer: string) => answer === choice.text);
    }
}
