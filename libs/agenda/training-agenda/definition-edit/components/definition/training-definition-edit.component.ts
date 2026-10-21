import {Component, DestroyRef, EventEmitter, inject, Input, OnChanges, Output, SimpleChanges, ChangeDetectionStrategy} from '@angular/core';
import {
    AbstractControl,
    ReactiveFormsModule,
    UntypedFormArray,
    UntypedFormControl,
    UntypedFormGroup
} from '@angular/forms';
import {TrainingDefinitionWithLevels} from '@crczp/training-model';
import {TrainingDefinitionChangeEvent} from '../../model/events/training-definition-change-event';
import {MINIMUM_LIST_ITEM_LENGTH, TrainingDefinitionEditFormGroup} from './training-definition-edit-form-group';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {MatError, MatFormField, MatInput, MatLabel, MatSuffix} from "@angular/material/input";
import {MatCheckbox} from "@angular/material/checkbox";
import {MatTooltip} from "@angular/material/tooltip";

import {SentinelFreeFormComponent} from "@sentinel/components/free-form";
import { ClearInputSuffixComponent } from '@crczp/utils';
import { CdkTextareaAutosize } from '@angular/cdk/text-field';

/**
 * Component for creating new or editing already existing training definition
 */
@Component({
    selector: 'crczp-training-definition-edit',
    templateUrl: './training-definition-edit.component.html',
    styleUrls: ['./training-definition-edit.component.css'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        CdkTextareaAutosize,
        ClearInputSuffixComponent,
    ReactiveFormsModule,
    MatFormField,
    MatLabel,
    MatInput,
    MatSuffix,
    MatError,
    MatCheckbox,
    MatTooltip,
    SentinelFreeFormComponent
]
})
export class TrainingDefinitionEditComponent implements OnChanges {
    @Input() trainingDefinition: TrainingDefinitionWithLevels;
    @Input() disabled = false;
    @Output() edited: EventEmitter<TrainingDefinitionChangeEvent> = new EventEmitter();

    trainingDefinitionEditFormGroup: TrainingDefinitionEditFormGroup;
    readonly minimumListItemLength = MINIMUM_LIST_ITEM_LENGTH;
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
            this.trainingDefinitionEditFormGroup = new TrainingDefinitionEditFormGroup(this.trainingDefinition);
            this.setupOnFormChangedEvent();
        }
        if ('trainingDefinition' in changes || 'disabled' in changes) {
            const formGroup = this.trainingDefinitionEditFormGroup.formGroup;
            if (this.disabled) {
                formGroup.disable({emitEvent: false});
            } else {
                formGroup.enable({emitEvent: false});
            }
        }
    }

    /**
     * Replaces the prerequisites with the trimmed items emitted from child component
     * @param event form state change event emitted from child component
     */
    prerequisitesChange(event: UntypedFormGroup): void {
        this.replaceItems(this.prerequisites, event.value['items']);
    }

    /**
     * Replaces the outcomes with the trimmed items emitted from child component
     * @param event form state change event emitted from child component
     */
    outcomesChange(event: UntypedFormGroup): void {
        this.replaceItems(this.outcomes, event.value['items']);
    }

    checkboxTouched(): void {
        this.title.markAsTouched();
    }

    private replaceItems(list: UntypedFormArray, items: string[]): void {
        list.clear();
        items.forEach((item) => list.push(new UntypedFormControl(item.trim())));
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
                this.trainingDefinitionEditFormGroup.formGroup.valid,
            ),
        );
    }
}
