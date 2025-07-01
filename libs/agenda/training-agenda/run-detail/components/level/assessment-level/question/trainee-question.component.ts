import {
    ChangeDetectionStrategy,
    Component,
    EventEmitter,
    Input,
    OnChanges,
    Output,
    SimpleChanges,
    ViewChild,
} from '@angular/core';
import { ExtendedMatchingItems, FreeFormQuestion, MultipleChoiceQuestion, Question } from '@crczp/training-model';
import { ExtendedMatchingItemsTraineeComponent } from './extended-matching-items/extended-matching-items-trainee.component';
import { FreeFormQuestionTraineeComponent } from './free-form-question/free-form-question-trainee.component';
import { MultipleChoiceQuestionTraineeComponent } from './multiple-choice-question/multiple-choice-question-trainee.component';

@Component({
    selector: 'crczp-trainee-question',
    templateUrl: './trainee-question.component.html',
    styleUrls: ['./trainee-question.component.css'],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
/**
 * Wrapper component for displaying questions in training run's assessment level. It selects the correct component to
 * display based on the question type.
 */
export class TraineeQuestionComponent implements OnChanges {
    @Input() question: Question;
    @Input() index: number;
    @Input() isBacktracked: boolean;

    @Output() contentChanged: EventEmitter<number> = new EventEmitter();

    @ViewChild(FreeFormQuestionTraineeComponent) ffqChild: FreeFormQuestionTraineeComponent;
    @ViewChild(ExtendedMatchingItemsTraineeComponent) emiChild: ExtendedMatchingItemsTraineeComponent;
    @ViewChild(MultipleChoiceQuestionTraineeComponent) mcqChild: MultipleChoiceQuestionTraineeComponent;

    isEmi = false;
    isFfq = false;
    isMcq = false;

    ngOnChanges(changes: SimpleChanges): void {
        if ('question' in changes) {
            this.resolveQuestionType();
        }
    }

    /**
     * Calls child component find out if every mandatory question is answered
     */
    canBeSubmitted(): boolean {
        if (this.isEmi) {
            return this.emiChild.canBeSubmitted();
        }
        if (this.isFfq) {
            return this.ffqChild.canBeSubmitted();
        }
        return this.mcqChild.canBeSubmitted();
    }

    /**
     * Call child component to save user input to question object
     */
    saveChanges(): void {
        if (this.isEmi) {
            this.emiChild.saveChanges();
        }
        if (this.isFfq) {
            this.ffqChild.saveChanges();
        }
        if (this.isMcq) {
            this.mcqChild.saveChanges();
        }
    }

    /**
     * Emits event containing question and its index to the parent component
     * @param event index and question
     */
    onContentChanged(event: { index: number; question: Question }): void {
        this.question = event.question;
        this.contentChanged.emit(event.index);
    }

    /**
     * Resolves type of question to create appropriate child component
     */
    private resolveQuestionType() {
        this.isEmi = this.question instanceof ExtendedMatchingItems;
        this.isFfq = this.question instanceof FreeFormQuestion;
        this.isMcq = this.question instanceof MultipleChoiceQuestion;
    }
}
