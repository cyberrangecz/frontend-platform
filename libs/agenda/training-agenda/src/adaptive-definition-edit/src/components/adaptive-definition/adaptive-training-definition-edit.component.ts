import { Component, DestroyRef, EventEmitter, inject, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { AbstractControl, UntypedFormArray, UntypedFormControl, UntypedFormGroup } from '@angular/forms';
import { TrainingDefinition } from '@crczp/training-model';
import { TrainingDefinitionChangeEvent } from '../../model/events/training-definition-change-event';
import { AdaptiveTrainingDefinitionEditFormGroup } from './adaptive-training-definition-edit-form-group';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

/**
 * Component for creating new or editing already existing training definition
 */
@Component({
    selector: 'crczp-adaptive-definition-edit',
    templateUrl: './adaptive-training-definition-edit.component.html',
    styleUrls: ['./adaptive-training-definition-edit.component.css'],
})
export class AdaptiveTrainingDefinitionEditComponent implements OnChanges {
    @Input() trainingDefinition: TrainingDefinition;
    @Output() edited: EventEmitter<TrainingDefinitionChangeEvent> = new EventEmitter();

    trainingDefinitionEditFormGroup: AdaptiveTrainingDefinitionEditFormGroup;
    freeFormValid = true;
    destroyRef = inject(DestroyRef);

    get title(): AbstractControl {
        return this.trainingDefinitionEditFormGroup.formGroup.get('title');
    }

    get description(): AbstractControl {
        return this.trainingDefinitionEditFormGroup.formGroup.get('description');
    }

    get outcomes(): UntypedFormArray {
        return this.trainingDefinitionEditFormGroup.formGroup.get('outcomes') as UntypedFormArray;
    }

    get prerequisites(): UntypedFormArray {
        return this.trainingDefinitionEditFormGroup.formGroup.get('prerequisites') as UntypedFormArray;
    }

    ngOnChanges(changes: SimpleChanges): void {
        if ('trainingDefinition' in changes) {
            this.trainingDefinitionEditFormGroup = new AdaptiveTrainingDefinitionEditFormGroup(this.trainingDefinition);
            this.setupOnFormChangedEvent();
        }
    }

    /**
     * Changes form state if change of prerequisites event is emitted from child component
     * @param event form state change event emitted from child component
     */
    prerequisitesChange(event: UntypedFormGroup): void {
        this.freeFormValid = event.valid;
        this.prerequisites.clear();
        event.value['items'].forEach((item) => {
            item = item.trim();
            (this.prerequisites as UntypedFormArray).push(
                new UntypedFormControl(item.toString().length == 1 ? item + ' ' : item),
            );
        });
    }

    /**
     * Changes form state if change of outcomes event is emitted from child component
     * @param event form state change event emitted from child component
     */
    outcomesChange(event: UntypedFormGroup): void {
        this.freeFormValid = event.valid;
        this.outcomes.clear();
        event.value['items'].forEach((item) => {
            item = item.trim();
            (this.outcomes as UntypedFormArray).push(
                new UntypedFormControl(item.toString().length == 1 ? item + ' ' : item),
            );
        });
    }

    private setupOnFormChangedEvent() {
        this.trainingDefinitionEditFormGroup.formGroup.valueChanges
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe(() => this.onChanged());
    }

    private onChanged() {
        this.trainingDefinitionEditFormGroup.setValuesToTrainingDefinition(this.trainingDefinition);
        this.edited.emit(
            new TrainingDefinitionChangeEvent(
                this.trainingDefinition,
                this.trainingDefinitionEditFormGroup.formGroup.valid && this.freeFormValid,
            ),
        );
    }

    checkboxTouched(): void {
        this.title.markAsTouched();
    }
}
