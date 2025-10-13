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
import {Hint, MitreTechnique, TrainingLevel} from '@crczp/training-model';
import {TrainingLevelEditFormGroup} from './training-level-edit-form-group';
import {AbstractControl, ReactiveFormsModule} from '@angular/forms';
import {SentinelControlItemSignal} from '@sentinel/components/controls';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {ExpectedCommandsSelectComponent} from "./expected-commands/expected-commands-select.component";
import {MitreTechniqueSelectComponent} from "./mitre-technique/mitre-technique-select.component";
import {HintsOverviewComponent} from "./hint/overview/hints-overview.component";
import {MatCheckbox} from "@angular/material/checkbox";
import {MatTooltip} from "@angular/material/tooltip";
import {MatIconButton} from "@angular/material/button";
import {MatError, MatFormField, MatHint, MatInput, MatLabel, MatSuffix} from "@angular/material/input";
import {SentinelMarkdownEditorComponent} from "@sentinel/components/markdown-editor";
import {MatIcon} from "@angular/material/icon";

/**
 * Component for editing new or existing training level
 */
@Component({
    selector: 'crczp-training-level-edit',
    templateUrl: './training-level-edit.component.html',
    styleUrls: ['./training-level-edit.component.css'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        ExpectedCommandsSelectComponent,
        MitreTechniqueSelectComponent,
        HintsOverviewComponent,
        MatCheckbox,
        MatTooltip,
        MatIconButton,
        MatSuffix,
        ReactiveFormsModule,
        MatFormField,
        MatLabel,
        MatError,
        MatIcon,
        SentinelMarkdownEditorComponent,
        MatInput,
        MatHint
    ]
})
export class TrainingLevelEditComponent implements OnChanges {
    @Input() level: TrainingLevel;
    @Input() mitreTechniquesList: MitreTechnique[];
    @Output() levelChange: EventEmitter<TrainingLevel> = new EventEmitter();
    trainingLevelConfigFormGroup: TrainingLevelEditFormGroup;
    controls: SentinelControlItemSignal[];
    destroyRef = inject(DestroyRef);

    get title(): AbstractControl {
        return this.trainingLevelConfigFormGroup.formGroup.get('title');
    }

    get content(): AbstractControl {
        return this.trainingLevelConfigFormGroup.formGroup.get('content');
    }

    get solution(): AbstractControl {
        return this.trainingLevelConfigFormGroup.formGroup.get('solution');
    }

    get maxScore(): AbstractControl {
        return this.trainingLevelConfigFormGroup.formGroup.get('maxScore');
    }

    get solutionPenalized(): AbstractControl {
        return this.trainingLevelConfigFormGroup.formGroup.get('solutionPenalized');
    }

    get incorrectAnswerLimit(): AbstractControl {
        return this.trainingLevelConfigFormGroup.formGroup.get('incorrectAnswerLimit');
    }

    get variantAnswers(): AbstractControl {
        return this.trainingLevelConfigFormGroup.formGroup.get('variantAnswers');
    }

    get answer(): AbstractControl {
        return this.trainingLevelConfigFormGroup.formGroup.get('answer');
    }

    get answerVariableName(): AbstractControl {
        return this.trainingLevelConfigFormGroup.formGroup.get('answerVariableName');
    }

    get estimatedDuration(): AbstractControl {
        return this.trainingLevelConfigFormGroup.formGroup.get('estimatedDuration');
    }

    get minimalPossibleSolveTime(): AbstractControl {
        return this.trainingLevelConfigFormGroup.formGroup.get('minimalPossibleSolveTime');
    }

    get referenceSolution(): AbstractControl {
        return this.trainingLevelConfigFormGroup.formGroup.get('referenceSolution');
    }

    get hints(): AbstractControl {
        return this.trainingLevelConfigFormGroup.formGroup.get('hints');
    }

    get commandsRequired(): AbstractControl {
        return this.trainingLevelConfigFormGroup.formGroup.get('commandsRequired');
    }

    ngOnChanges(changes: SimpleChanges): void {
        if ('level' in changes) {
            this.trainingLevelConfigFormGroup = new TrainingLevelEditFormGroup(this.level);
            this.setFormsAsTouched();
            this.trainingLevelConfigFormGroup.formGroup.valueChanges
                .pipe(takeUntilDestroyed(this.destroyRef))
                .subscribe(() => {
                    if (this.variantAnswers.value) {
                        this.enableVariableName();
                    } else {
                        this.enableAnswer();
                    }
                    this.trainingLevelConfigFormGroup.setToLevel(this.level);
                    this.levelChange.emit(this.level);
                });
        }
    }

    /**
     * Sets changed hints to the current level and emits level change event
     * @param hints new state of hints associated with current level
     */
    hintsChanged(hints: Hint[]): void {
        this.level.hints = hints;
        this.trainingLevelConfigFormGroup.setToLevel(this.level);
        this.levelChange.emit(this.level);
    }

    /**
     * Sets changed mitre techniques to the current level and emits level change event
     * @param mitreTechniques new state of mitre techniques associated with current level
     */
    mitreTechniquesChanged(mitreTechniques: MitreTechnique[]): void {
        this.level.mitreTechniques = mitreTechniques;
        this.trainingLevelConfigFormGroup.setToLevel(this.level);
        this.levelChange.emit(this.level);
    }

    /**
     * Sets changed expected commands to the current level and emits level change event
     * @param expectedCommands new state of expected commands associated with current level
     */
    expectedCommandsChanged(expectedCommands: string[]): void {
        this.level.expectedCommands = expectedCommands;
        this.trainingLevelConfigFormGroup.setToLevel(this.level);
        this.levelChange.emit(this.level);
    }

    /**
     * Sets state of selected forms to touched. This is done due to proper error rendering when component is reloaded.
     */
    private setFormsAsTouched(): void {
        this.title.markAsTouched();
        this.referenceSolution.markAllAsTouched();
        this.estimatedDuration.markAsTouched();
        this.minimalPossibleSolveTime.markAsTouched();
        this.maxScore.markAsTouched();
        this.incorrectAnswerLimit.markAsTouched();
        this.answer.markAsTouched();
        this.answerVariableName.markAsTouched();
    }

    private enableVariableName() {
        this.answerVariableName.enable({emitEvent: false});
        this.answer.setValue(null, {emitEvent: false});
        this.answer.disable({emitEvent: false});
    }

    private enableAnswer() {
        this.answer.enable({emitEvent: false});
        this.answerVariableName.setValue(null, {emitEvent: false});
        this.answerVariableName.disable({emitEvent: false});
    }
}
