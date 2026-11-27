import {ChangeDetectionStrategy, Component, inject, Input, OnInit, WritableSignal} from '@angular/core';
import {MultipleChoiceQuestion} from '@crczp/training-model';
import { MarkdownViewComponent } from '@crczp/markdown';
import {MatCheckbox} from "@angular/material/checkbox";
import {PreviewAnswerStore} from '../preview-answer-store';

@Component({
    selector: 'crczp-trainee-multiple-choice-question',
    templateUrl: './multiple-choice-question-trainee.component.html',
    styleUrls: ['./multiple-choice-question-trainee.component.css'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        MarkdownViewComponent,
        MatCheckbox
    ]
})
/**
 * Component displaying MCQ type of question in the assessment level of a trainees training run.
 * If is assessment is a test or question is required, it needs to be filled, otherwise it is optional.
 */
export class MultipleChoiceQuestionTraineeComponent implements OnInit {
    @Input() question: MultipleChoiceQuestion;
    @Input() index: number;

    selectedChoiceIndexes: WritableSignal<ReadonlySet<number>>;
    private readonly answerStore = inject(PreviewAnswerStore);

    ngOnInit(): void {
        this.selectedChoiceIndexes = this.answerStore.answerOf<ReadonlySet<number>>(this.question, new Set());
    }

    toggleChoice(choiceIndex: number, isChecked: boolean): void {
        this.selectedChoiceIndexes.update((selected) => {
            const updated = new Set(selected);
            if (isChecked) {
                updated.add(choiceIndex);
            } else {
                updated.delete(choiceIndex);
            }
            return updated;
        });
    }
}
