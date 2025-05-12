import {
    ChangeDetectionStrategy,
    Component,
    DestroyRef,
    EventEmitter,
    inject,
    Input,
    OnChanges,
    Output,
    SimpleChanges,
} from '@angular/core';
import { AdaptiveQuestion, QuestionnaireTypeEnum } from '@crczp/training-model';
import { QuestionFormGroup } from '../question-form-group';
import { AbstractControl, UntypedFormArray, UntypedFormControl, UntypedFormGroup, Validators } from '@angular/forms';
import { SentinelValidators } from '@sentinel/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Component({
    selector: 'crczp-adaptive-free-form-question-edit',
    templateUrl: './free-form-question-edit.component.html',
    styleUrls: ['./free-form-question-edit.component.css'],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
/**
 * Component for editing a question of type Free Form
 */
export class FreeFormQuestionEditComponent implements OnChanges {
    @Input() index: number;
    @Input() question: AdaptiveQuestion;
    @Input() required: boolean;
    @Input() questionnaireType: QuestionnaireTypeEnum;
    @Output() questionChange: EventEmitter<AdaptiveQuestion> = new EventEmitter();

    questionnaireTypes = QuestionnaireTypeEnum;
    freeFormQuestionFormGroup: QuestionFormGroup;
    destroyRef = inject(DestroyRef);

    get title(): AbstractControl {
        return this.freeFormQuestionFormGroup.questionFormGroup.get('title');
    }

    get choices(): UntypedFormArray {
        return this.freeFormQuestionFormGroup.questionFormGroup.get('choices') as UntypedFormArray;
    }

    ngOnChanges(changes: SimpleChanges): void {
        if ('question' in changes) {
            this.freeFormQuestionFormGroup = new QuestionFormGroup(this.question, this.questionnaireType);
            this.choices.markAllAsTouched();
            this.freeFormQuestionFormGroup.questionFormGroup.valueChanges
                .pipe(takeUntilDestroyed(this.destroyRef))
                .subscribe(() => this.questionChanged());
        }
    }

    addOption(): void {
        this.choices.push(
            new UntypedFormGroup({
                id: new UntypedFormControl(null),
                text: new UntypedFormControl('new Answer', [SentinelValidators.noWhitespace, Validators.required]),
                correct: new UntypedFormControl(true),
                order: new UntypedFormControl(this.choices.length),
            }),
        );
        this.questionChanged();
    }

    deleteOption(optionIndex: number): void {
        this.choices.removeAt(optionIndex);
        this.choices.controls
            .slice(optionIndex)
            .forEach((choice) => choice.get('order').setValue(choice.get('order').value - 1));
        this.questionChanged();
    }

    /**
     * Changes internal state of the component if question is changed and emits event to parent component
     */
    questionChanged(): void {
        this.freeFormQuestionFormGroup.questionFormGroup.markAsDirty();
        this.freeFormQuestionFormGroup.setToQuestion(this.question);
        this.questionChange.emit(this.question);
    }

    /**
     * Helper method to improve *ngFor performance
     * @param index
     */
    trackByFn(index: any): any {
        return index;
    }
}
