import {
    ChangeDetectionStrategy,
    Component,
    DestroyRef,
    EventEmitter,
    inject,
    Input,
    OnChanges,
    OnInit,
    Output,
    SimpleChanges,
} from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import {
    SentinelConfirmationDialogComponent,
    SentinelConfirmationDialogConfig,
    SentinelDialogResultEnum,
} from '@sentinel/components/dialogs';
import {
    SentinelControlItem,
    SentinelControlMenuItem,
    SentinelExpandableControlItem,
} from '@sentinel/components/controls';
import { ExtendedMatchingItems, FreeFormQuestion, MultipleChoiceQuestion, Question } from '@crczp/training-model';
import { defer, EMPTY, Observable, of } from 'rxjs';
import { QuestionChangeEvent } from '../../../../../../model/events/question-change-event';
import { SentinelStepper, StepStateEnum } from '@sentinel/components/stepper';
import { QuestionStepperAdapter } from '@crczp/training-agenda/internal';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

/**
 * Wrapper component for questions inside the assessment level
 */
@Component({
    selector: 'crczp-question-overview',
    templateUrl: './questions-overview.component.html',
    styleUrls: ['./questions-overview.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QuestionsOverviewComponent implements OnInit, OnChanges {
    @Input() questions: Question[];
    @Input() isTest: boolean;
    @Input() disabled: boolean;
    @Input() assessmentOrder: number;
    @Output() questionsChange: EventEmitter<Question[]> = new EventEmitter();

    questionsHasError: boolean;
    stepperQuestions: SentinelStepper<QuestionStepperAdapter> = { items: [] };
    selectedStep: number;
    controls: SentinelControlItem[];
    questionChanged: boolean;
    destroyRef = inject(DestroyRef);

    constructor(public dialog: MatDialog) {}

    ngOnInit(): void {
        this.selectedStep = 0;
        this.initControls();
    }

    ngOnChanges(changes: SimpleChanges): void {
        if (
            changes['assessmentOrder'] &&
            changes['assessmentOrder'].previousValue !== changes['assessmentOrder'].currentValue
        ) {
            this.selectedStep = 0;
        }
        if ('questions' in changes && changes['questions'].isFirstChange()) {
            this.selectedStep = 0;
        }
        if ('questions' in changes && this.questions) {
            this.stepperQuestions.items = this.questions.map((question) => new QuestionStepperAdapter(question));
            this.calculateHasError();
        }
        if ('isTest' in changes) {
            if (this.isTest && this.questions) {
                this.questionChanged = false;
                for (const question of this.stepperQuestions.items) {
                    if (!question.required) {
                        question.requiredState = true;
                        this.questionChanged = true;
                    }
                }
                if (this.questionChanged) {
                    this.onQuestionChanged();
                }
            }
        }
        if (this.stepperQuestions.items.length > 0) {
            this.stepperQuestions.items[this.selectedStep].state = StepStateEnum.ACTIVE;
        }
    }

    onControlAction(control: SentinelControlItem): void {
        control.result$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe();
    }

    /**
     * Updates order of stepper items to match order of the questions
     */
    onOrderUpdate(): void {
        this.stepperQuestions.items.forEach((question, index) => {
            this.stepperQuestions.items[index].question.order = index;
        });
        this.onQuestionChanged();
    }

    /**
     * Triggered after selection of active question is changed in the stepper
     * @param index index of active question
     */
    onActiveQuestionChanged(index: number): void {
        if (index !== this.selectedStep && this.stepperQuestions.items.length > 0) {
            this.stepperQuestions.items[this.selectedStep].state = StepStateEnum.SELECTABLE;
            this.selectedStep = index;
        }
    }

    /**
     * Creates new free form question
     */
    addFFQ(): Observable<void> {
        if (this.stepperQuestions.items.length >= 1) {
            this.stepperQuestions.items[this.selectedStep].state = StepStateEnum.SELECTABLE;
        }
        const newFfq = new FreeFormQuestion('New Free Form Question');
        newFfq.required = this.isTest;
        newFfq.choices.push({
            id: null,
            correct: true,
            text: 'Answer 1',
            order: 0,
        });
        const questionStepperAdapter = new QuestionStepperAdapter(newFfq);
        questionStepperAdapter.state = StepStateEnum.ACTIVE;
        this.stepperQuestions.items.push(questionStepperAdapter);
        this.selectedStep = this.stepperQuestions.items.length - 1;
        this.onQuestionChanged();
        return EMPTY;
    }

    /**
     * Creates new multiple choice question
     */
    addMCQ(): Observable<void> {
        if (this.stepperQuestions.items.length >= 1) {
            this.stepperQuestions.items[this.selectedStep].state = StepStateEnum.SELECTABLE;
        }
        const newMcq = new MultipleChoiceQuestion('New Multiple Choice Question');
        newMcq.choices.push({
            id: null,
            correct: false,
            text: 'Choice 1',
            order: 0,
        });
        newMcq.choices.push({
            id: null,
            correct: false,
            text: 'Choice 2',
            order: 1,
        });
        newMcq.required = this.isTest;
        const questionStepperAdapter = new QuestionStepperAdapter(newMcq);
        questionStepperAdapter.state = StepStateEnum.ACTIVE;
        this.stepperQuestions.items.push(questionStepperAdapter);
        this.selectedStep = this.stepperQuestions.items.length - 1;
        this.onQuestionChanged();
        return EMPTY;
    }

    /**
     * Creates new extended matching items question
     */
    addEMI(): Observable<void> {
        if (this.stepperQuestions.items.length >= 1) {
            this.stepperQuestions.items[this.selectedStep].state = StepStateEnum.SELECTABLE;
        }
        const newEmi = new ExtendedMatchingItems('New Extended Matching Items');
        newEmi.required = this.isTest;
        newEmi.extendedMatchingStatements.push({
            id: null,
            text: 'Statement 1',
            order: 0,
            correctOptionOrder: null,
        });
        newEmi.extendedMatchingStatements.push({
            id: null,
            text: 'Statement 2',
            order: 1,
            correctOptionOrder: null,
        });
        newEmi.extendedMatchingOptions.push({
            id: null,
            text: 'Option 1',
            order: 0,
        });
        newEmi.extendedMatchingOptions.push({
            id: null,
            text: 'Option 2',
            order: 1,
        });
        const questionStepperAdapter = new QuestionStepperAdapter(newEmi);
        questionStepperAdapter.state = StepStateEnum.ACTIVE;
        this.stepperQuestions.items.push(questionStepperAdapter);
        this.selectedStep = this.stepperQuestions.items.length - 1;
        this.onQuestionChanged();
        return EMPTY;
    }

    /**
     * Changes internal state of the component and emits event to parent component
     * @param event question change state event
     */
    onQuestionChanged(event: QuestionChangeEvent = null): void {
        this.calculateHasError();
        if (event && event.question) {
            this.stepperQuestions.items[this.selectedStep].question = event.question;
        }
        this.questionsChange.emit(this.stepperQuestions.items.map((item) => item.question));
    }

    /**
     * Displays confirmation dialog, on confirmation, deletes question on given index
     */
    onDelete(): void {
        const dialogRef = this.dialog.open(SentinelConfirmationDialogComponent, {
            data: new SentinelConfirmationDialogConfig(
                'Delete question',
                `Do you want to delete question "${this.stepperQuestions.items[this.selectedStep].title}"?`,
                'Cancel',
                'Delete',
            ),
        });

        dialogRef
            .afterClosed()
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe((result) => {
                if (result === SentinelDialogResultEnum.CONFIRMED) {
                    this.stepperQuestions.items.splice(this.selectedStep, 1);
                    this.changeSelectedStepAfterRemoving(this.selectedStep);
                    this.onQuestionChanged();
                }
            });
    }

    /**
     * Changes selected step to the one before removed or to first one if the first step is removed
     * @param {number} index index of the removed step
     */
    private changeSelectedStepAfterRemoving(index: number) {
        if (index === 0) {
            this.selectedStep = 0;
        } else {
            this.selectedStep--;
        }
        this.onActiveQuestionChanged(this.stepperQuestions.items.length - 1);
        if (this.stepperQuestions.items.length > 0) {
            this.stepperQuestions.items[this.stepperQuestions.items.length - 1].state = StepStateEnum.ACTIVE;
        }
    }

    private calculateHasError() {
        this.questionsHasError = this.stepperQuestions.items.some((question) => !question.valid);
    }

    private initControls() {
        this.controls = [
            new SentinelExpandableControlItem('add', 'Add', 'primary', of(false), [
                new SentinelControlMenuItem(
                    'ffq',
                    'Free Form Question',
                    'primary',
                    of(false),
                    defer(() => this.addFFQ()),
                    'help_outline',
                ),
                new SentinelControlMenuItem(
                    'mcq',
                    'Multiple Choice Question',
                    'primary',
                    of(false),
                    defer(() => this.addMCQ()),
                    'check_circle',
                ),
                new SentinelControlMenuItem(
                    'emi',
                    'Extended Matching Items Questions',
                    'primary',
                    of(false),
                    defer(() => this.addEMI()),
                    'list_alt',
                ),
            ]),
        ];
    }
}
