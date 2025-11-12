import { Component, DestroyRef, inject } from '@angular/core';
import { SentinelValidators } from '@sentinel/common';
import {
    AbstractControl,
    ReactiveFormsModule,
    UntypedFormArray,
    UntypedFormControl,
    UntypedFormGroup,
    Validators
} from '@angular/forms';
import { CheatingDetectionEditFormGroup } from './cheating-detection-edit-form-group';
import { CheatingDetectionEditService } from '../services/cheating-detection-edit.service';
import { ActivatedRoute } from '@angular/router';
import { CheatingDetection, TrainingInstance } from '@crczp/training-model';
import { SentinelControlItem, SentinelControlsComponent } from '@sentinel/components/controls';
import { filter, map } from 'rxjs/operators';
import { defer, Observable, of } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatExpansionPanel, MatExpansionPanelHeader, MatExpansionPanelTitle } from '@angular/material/expansion';
import { MatSlideToggle } from '@angular/material/slide-toggle';
import { MatDivider } from '@angular/material/divider';
import { MatError, MatFormField, MatInput, MatLabel, MatSuffix } from '@angular/material/input';
import { MatTooltip } from '@angular/material/tooltip';

import { MatRadioButton, MatRadioGroup } from '@angular/material/radio';
import { MatButton, MatIconButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { CheatingDetectionEditConcreteService } from '../services/cheating-detection-edit-concrete.service';

/**
 * Main component of training instance cheating detection edit.
 */
@Component({
    selector: 'crczp-training-instance-cheating-detection-edit',
    templateUrl: './cheating-detection-edit.component.html',
    styleUrls: ['./cheating-detection-edit.component.css'],
    imports: [
        ReactiveFormsModule,
        SentinelControlsComponent,
        MatExpansionPanel,
        MatExpansionPanelHeader,
        MatExpansionPanelTitle,
        MatSlideToggle,
        MatDivider,
        MatFormField,
        MatLabel,
        MatInput,
        MatTooltip,
        MatRadioGroup,
        MatRadioButton,
        MatButton,
        MatError,
        MatIconButton,
        MatSuffix,
        MatIcon,
    ],
    providers: [
        {
            provide: CheatingDetectionEditService,
            useClass: CheatingDetectionEditConcreteService,
        },
    ],
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
    private activeRoute = inject(ActivatedRoute);
    private editService = inject(CheatingDetectionEditService);

    constructor() {
        this.trainingInstance$ = this.activeRoute.data.pipe(
            takeUntilDestroyed(this.destroyRef),
            filter((data) => !!data[TrainingInstance.name]),
            map((data) => data[TrainingInstance.name]),
        );
        this.trainingInstance$.subscribe((instance) => {
            this.trainingInstanceId = instance.id;
        });
        this.cheatingDetection = new CheatingDetection();
        this.cheatingDetectionEditFormGroup =
            new CheatingDetectionEditFormGroup(
                this.cheatingDetection,
                this.trainingInstanceId,
            );
        this.initControls(this.editService);
        this.cheatingDetectionEditFormGroup.formGroup.valueChanges
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe(() => this.initControls(this.editService));
    }

    get forbiddenCommandsMethod(): AbstractControl {
        return this.cheatingDetectionEditFormGroup.formGroup.get(
            'forbiddenCommandsDetection',
        );
    }

    get forbiddenCommands(): UntypedFormArray {
        return this.cheatingDetectionEditFormGroup.formGroup.get(
            'forbiddenCommands',
        ) as UntypedFormArray;
    }

    get timeProximityMethod(): AbstractControl {
        return this.cheatingDetectionEditFormGroup.formGroup.get(
            'timeProximityDetection',
        );
    }

    ifNotAPG() {
        return !this.isAPG;
    }

    /**
     * Deletes an choice (one of the answers)
     * @param index index of the choice which should be deleted
     */
    deleteForbiddenCommand(index: number): void {
        this.forbiddenCommands.removeAt(index);
        this.forbiddenCommands.controls
            .slice(index)
            .forEach((choice) =>
                choice.get('order').setValue(choice.get('order').value - 1),
            );
        this.forbiddenCommandsChanged();
    }

    addForbiddenCommand(): void {
        this.forbiddenCommands.push(
            new UntypedFormGroup({
                command: new UntypedFormControl('', [
                    SentinelValidators.noWhitespace,
                    Validators.required,
                ]),
                type: new UntypedFormControl('', [Validators.required]),
                cheatingDetectionId: new UntypedFormControl(
                    this.cheatingDetection.id,
                ),
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
