import {ChangeDetectionStrategy, Component, inject, Input, OnInit, WritableSignal} from '@angular/core';
import {ExtendedMatchingItems} from '@crczp/training-model';
import {MatRadioButton, MatRadioGroup} from "@angular/material/radio";
import { MarkdownViewComponent } from '@crczp/markdown';
import {PreviewAnswerStore} from '../preview-answer-store';

@Component({
    selector: 'crczp-trainee-extended-matching-items',
    templateUrl: './extended-matching-items-trainee.component.html',
    styleUrls: ['./extended-matching-items-trainee.component.css'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        MatRadioGroup,
        MatRadioButton,
        MarkdownViewComponent
    ]
})
export class ExtendedMatchingItemsTraineeComponent implements OnInit {
    @Input() question: ExtendedMatchingItems;
    @Input() index: number;

    /** Index of the option chosen for each statement, keyed by statement index. */
    chosenOptionIndexes: WritableSignal<ReadonlyMap<number, number>>;
    private readonly answerStore = inject(PreviewAnswerStore);

    ngOnInit(): void {
        this.chosenOptionIndexes = this.answerStore.answerOf<ReadonlyMap<number, number>>(this.question, new Map());
    }

    chooseOption(statementIndex: number, optionIndex: number): void {
        this.chosenOptionIndexes.update((chosen) => new Map(chosen).set(statementIndex, optionIndex));
    }
}
