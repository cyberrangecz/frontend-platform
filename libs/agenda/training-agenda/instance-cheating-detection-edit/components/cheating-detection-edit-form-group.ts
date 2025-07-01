import { UntypedFormArray, UntypedFormControl, UntypedFormGroup, Validators } from '@angular/forms';
import { CheatingDetection, CheatingDetectionStateEnum } from '@crczp/training-model';
import { SentinelValidators } from '@sentinel/common';

/**
 * Form control class of cheating detection edit form
 */
export class CheatingDetectionEditFormGroup {
    formGroup: UntypedFormGroup;
    trainingInstanceId: number;

    constructor(cheatingDetection: CheatingDetection, trainingInstanceId: number) {
        cheatingDetection.forbiddenCommands = [];
        this.formGroup = new UntypedFormGroup({
            answerSimilarityDetection: new UntypedFormControl(cheatingDetection.answerSimilarityState),
            locationSimilarityDetection: new UntypedFormControl(cheatingDetection.locationSimilarityState),
            timeProximityDetection: new UntypedFormControl(cheatingDetection.timeProximityState),
            minimalSolveTimeDetection: new UntypedFormControl(cheatingDetection.minimalSolveTimeState),
            noCommandsDetection: new UntypedFormControl(cheatingDetection.noCommandsState),
            forbiddenCommandsDetection: new UntypedFormControl(cheatingDetection.forbiddenCommandsState),
            timeThreshold: new UntypedFormControl(cheatingDetection.proximityThreshold, [
                SentinelValidators.pattern('^[0-9]*$'),
            ]),
            forbiddenCommands: new UntypedFormArray(
                cheatingDetection.forbiddenCommands.map(
                    (forbiddenCommand) =>
                        new UntypedFormGroup(
                            {
                                command: new UntypedFormControl(forbiddenCommand.command, [Validators.required]),
                                type: new UntypedFormControl(forbiddenCommand.type, [Validators.required]),
                                id: new UntypedFormControl(cheatingDetection.id),
                            },
                            [Validators.required],
                        ),
                ),
            ),
        });
        this.trainingInstanceId = trainingInstanceId;
    }

    /**
     * Sets values from form to training definition object
     */
    createCheatingDetection(): CheatingDetection {
        const cheatingDetection = new CheatingDetection();
        cheatingDetection.answerSimilarityState = this.formGroup.get('answerSimilarityDetection').value
            ? CheatingDetectionStateEnum.Queued
            : CheatingDetectionStateEnum.Disabled;
        cheatingDetection.locationSimilarityState = this.formGroup.get('locationSimilarityDetection').value
            ? CheatingDetectionStateEnum.Queued
            : CheatingDetectionStateEnum.Disabled;
        cheatingDetection.timeProximityState = this.formGroup.get('timeProximityDetection').value
            ? CheatingDetectionStateEnum.Queued
            : CheatingDetectionStateEnum.Disabled;
        cheatingDetection.minimalSolveTimeState = this.formGroup.get('minimalSolveTimeDetection').value
            ? CheatingDetectionStateEnum.Queued
            : CheatingDetectionStateEnum.Disabled;
        cheatingDetection.noCommandsState = this.formGroup.get('noCommandsDetection').value
            ? CheatingDetectionStateEnum.Queued
            : CheatingDetectionStateEnum.Disabled;
        cheatingDetection.forbiddenCommandsState = this.formGroup.get('forbiddenCommandsDetection').value
            ? CheatingDetectionStateEnum.Queued
            : CheatingDetectionStateEnum.Disabled;
        cheatingDetection.proximityThreshold = this.formGroup.get('timeThreshold').value;
        cheatingDetection.results = 0;
        cheatingDetection.currentState = CheatingDetectionStateEnum.Running;
        cheatingDetection.executedBy = '';
        cheatingDetection.trainingInstanceId = this.trainingInstanceId;
        cheatingDetection.forbiddenCommands = this.formGroup.get('forbiddenCommands').value;
        return cheatingDetection;
    }
}
