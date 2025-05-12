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
import { TrainingPhaseEditFormGroup } from './training-phase-edit-form-group';
import { AbstractControl, UntypedFormArray } from '@angular/forms';
import { AdaptiveQuestion, MitreTechnique, TrainingPhase } from '@crczp/training-model';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Component({
    selector: 'crczp-training-phase-configuration',
    templateUrl: './training-phase-edit.component.html',
    styleUrls: ['./training-phase-edit.component.css'],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TrainingPhaseEditComponent implements OnChanges {
    @Input() phase: TrainingPhase;
    @Input() updateMatrixFlag: boolean;
    @Input() presentTrainingPhases: TrainingPhase[];
    @Input() relatedQuestions: AdaptiveQuestion[];
    @Input() mitreTechniquesList: MitreTechnique[];
    @Output() phaseChange: EventEmitter<TrainingPhase> = new EventEmitter();

    phaseConfigFormGroup: TrainingPhaseEditFormGroup;
    destroyRef = inject(DestroyRef);

    get title(): AbstractControl {
        return this.phaseConfigFormGroup.formGroup.get('title');
    }

    get decisionMatrixRows(): UntypedFormArray {
        return this.phaseConfigFormGroup.formGroup.get('decisionMatrix') as UntypedFormArray;
    }

    get allowedWrongAnswers(): AbstractControl {
        return this.phaseConfigFormGroup.formGroup.get('allowedWrongAnswers');
    }

    get allowedCommands(): AbstractControl {
        return this.phaseConfigFormGroup.formGroup.get('allowedCommands');
    }

    get estimatedDuration(): AbstractControl {
        return this.phaseConfigFormGroup.formGroup.get('estimatedDuration');
    }

    ngOnChanges(changes: SimpleChanges): void {
        if ('phase' in changes || 'updateMatrixFlag' in changes) {
            this.phaseConfigFormGroup = new TrainingPhaseEditFormGroup(this.phase);
            this.setFormsAsTouched();
            this.phaseConfigFormGroup.formGroup.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
                this.phaseConfigFormGroup.setToPhase(this.phase);
                this.phaseChange.emit(this.phase);
            });
        }
    }

    /**
     * Sets changed mitre techniques to the current level and emits level change event
     * @param mitreTechniques new state of mitre techniques associated with current level
     */
    mitreTechniquesChanged(mitreTechniques: MitreTechnique[]): void {
        this.phase.mitreTechniques = mitreTechniques;
        this.phaseConfigFormGroup.setToPhase(this.phase);
        this.phaseChange.emit(this.phase);
    }

    /**
     * Sets changed expected commands to the current level and emits level change event
     * @param expectedCommands new state of expected commands associated with current level
     */
    expectedCommandsChanged(expectedCommands: string[]): void {
        this.phase.expectedCommands = expectedCommands;
        this.phaseConfigFormGroup.setToPhase(this.phase);
        this.phaseChange.emit(this.phase);
    }

    private setFormsAsTouched(): void {
        this.title.markAsTouched();
        this.allowedWrongAnswers.markAsTouched();
        this.allowedCommands.markAsTouched();
        this.estimatedDuration.markAsTouched();
        this.decisionMatrixRows.markAllAsTouched();
    }
}
