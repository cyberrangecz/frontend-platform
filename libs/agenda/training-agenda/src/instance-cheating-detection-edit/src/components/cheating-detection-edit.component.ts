import { Component, DestroyRef, inject } from '@angular/core';
import { SentinelValidators } from '@sentinel/common';
import { AbstractControl, UntypedFormArray, UntypedFormControl, UntypedFormGroup, Validators } from '@angular/forms';
import { CheatingDetectionEditFormGroup } from './cheating-detection-edit-form-group';
import { CheatingDetectionEditService } from '../services/cheating-detection-edit.service';
import { ActivatedRoute } from '@angular/router';
import { DefaultPaginationService } from '@crczp/training-agenda/internal';
import { CheatingDetection, TrainingInstance } from '@crczp/training-model';
import { SentinelControlItem } from '@sentinel/components/controls';
import { map, take } from 'rxjs/operators';
import { defer, Observable, of } from 'rxjs';
import { TRAINING_INSTANCE_DATA_ATTRIBUTE_NAME } from '../../../index';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

/**
 * Main component of training instance cheating detection edit.
 */
@Component({
    selector: 'crczp-training-instance-cheating-detection-edit',
    templateUrl: './cheating-detection-edit.component.html',
    styleUrls: ['./cheating-detection-edit.component.css'],
})
export class CheatingDetectionEditComponent {
    trainingInstance$: Observable<TrainingInstance>;
    cheatingDetectionEditFormGroup: CheatingDetectionEditFormGroup;
    cheatingDetection: CheatingDetection;
    controls: SentinelControlItem[];
    trainingInstanceId: number;
    maximumProximityThreshold = 86400;
    isAPG = false;
    destroyRef = inject(DestroyRef);

    constructor(
        private activeRoute: ActivatedRoute,
        private paginationService: PaginationStorageService,
        private editService: CheatingDetectionEditService,
    ) {
        this.trainingInstance$ = this.activeRoute.data.pipe(
            takeUntilDestroyed(this.destroyRef),
            map((data) => data[TRAINING_INSTANCE_DATA_ATTRIBUTE_NAME]),
        );
        this.trainingInstance$.subscribe((instance) => {
            this.trainingInstanceId = instance.id;
        });
        this.cheatingDetection = new CheatingDetection();
        this.cheatingDetectionEditFormGroup = new CheatingDetectionEditFormGroup(
            this.cheatingDetection,
            this.trainingInstanceId,
        );
        this.initControls(this.editService);
        this.cheatingDetectionEditFormGroup.formGroup.valueChanges
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe(() => this.initControls(this.editService));
    }

    onControlsAction(control: SentinelControlItem): void {
        control.result$.pipe(take(1)).subscribe();
    }

    ifNotAPG() {
        return !this.isAPG;
    }

    get forbiddenCommandsMethod(): AbstractControl {
        return this.cheatingDetectionEditFormGroup.formGroup.get('forbiddenCommandsDetection');
    }

    get forbiddenCommands(): UntypedFormArray {
        return this.cheatingDetectionEditFormGroup.formGroup.get('forbiddenCommands') as UntypedFormArray;
    }

    /**
     * Deletes an choice (one of the answers)
     * @param index index of the choice which should be deleted
     */
    deleteForbiddenCommand(index: number): void {
        this.forbiddenCommands.removeAt(index);
        this.forbiddenCommands.controls
            .slice(index)
            .forEach((choice) => choice.get('order').setValue(choice.get('order').value - 1));
        this.forbiddenCommandsChanged();
    }

    get timeProximityMethod(): AbstractControl {
        return this.cheatingDetectionEditFormGroup.formGroup.get('timeProximityDetection');
    }

    addForbiddenCommand(): void {
        this.forbiddenCommands.push(
            new UntypedFormGroup({
                command: new UntypedFormControl('', [SentinelValidators.noWhitespace, Validators.required]),
                type: new UntypedFormControl('', [Validators.required]),
                cheatingDetectionId: new UntypedFormControl(this.cheatingDetection.id),
            }),
        );
        this.forbiddenCommandsChanged();
    }

    changeType(i: number, value: string): void {
        this.forbiddenCommands.controls[i].get('type').setValue(value);
        this.forbiddenCommandsChanged();
    }

    forbiddenCommandsChanged(): void {
        this.cheatingDetectionEditFormGroup.formGroup.markAsDirty();
    }

    isFormValid(): boolean {
        return !this.cheatingDetectionEditFormGroup.formGroup.valid;
    }

    initControls(editService: CheatingDetectionEditService): void {
        this.controls = [
            new SentinelControlItem(
                'create',
                'Create',
                'primary',
                of(this.isFormValid()),
                defer(() =>
                    editService.create(
                        this.cheatingDetectionEditFormGroup.createCheatingDetection(),
                        this.trainingInstanceId,
                    ),
                ),
            ),
        ];
    }
}
