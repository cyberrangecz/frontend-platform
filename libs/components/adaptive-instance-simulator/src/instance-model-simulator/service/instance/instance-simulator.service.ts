import { Injectable, inject } from '@angular/core';

import {BehaviorSubject, Observable, of, switchMap, take, tap} from 'rxjs';
import {MatDialog} from '@angular/material/dialog';
import {InstanceSimulatorApiService} from './instance-simulator-api.service';
import {InstanceUploadDialogComponent} from '../../components/instance-upload-dialog/instance-upload-dialog.component';
import {Phase, TrainingPhase} from '@crczp/training-model';
import {InstanceModelSimulator} from '../../model/instance/instance-model-simulator';
import {saveAs} from 'file-saver';
import {SankeyData} from '../../model/sankey/sankey-data';
import {FileUploadProgressService} from './file-upload-progress.service';
import {SimulatorState, SimulatorStateEventTypeEnum} from "../../model/instance/simulator-state";


@Injectable()
export class InstanceSimulatorService {
    private dialog = inject(MatDialog);
    private fileUploadProgressService = inject(FileUploadProgressService);
    private api = inject(InstanceSimulatorApiService);

    private readonly EXPORT_FILE_NAME = 'adaptive-training-definition.json';

    private uploadedInstanceDataSubject$: BehaviorSubject<InstanceModelSimulator> = new BehaviorSubject(null);
    uploadedInstanceData$: Observable<InstanceModelSimulator> = this.uploadedInstanceDataSubject$.asObservable();

    private actionsDisabledSubject$: BehaviorSubject<boolean> = new BehaviorSubject(true);
    actionsDisabled$: Observable<boolean> = this.actionsDisabledSubject$.asObservable();

    private stateSubject$: BehaviorSubject<SimulatorState> = new BehaviorSubject(null);
    state$: Observable<SimulatorState> = this.stateSubject$.asObservable();

    /**
     * Handles upload dialog for upload of exported training instance
     */
    upload(): Observable<InstanceModelSimulator> {
        const dialogRef = this.dialog.open(InstanceUploadDialogComponent);
        return dialogRef.componentInstance.onUpload$.pipe(
            take(1),
            tap(() => this.fileUploadProgressService.start()),
            switchMap((file) => this.api.upload(file)),
            tap(
                (data) => {
                    this.stateSubject$.next(
                        new SimulatorState(
                            'Training instance data were uploaded',
                            SimulatorStateEventTypeEnum.NOTIFICATION_EVENT,
                        ),
                    );
                    this.fileUploadProgressService.finish();
                    this.uploadedInstanceDataSubject$.next(data);
                    this.actionsDisabledSubject$.next(false);
                    dialogRef.close();
                },
                (err) => {
                    this.fileUploadProgressService.finish();
                    dialogRef.close();
                    this.stateSubject$.next(
                        new SimulatorState('Uploading training instance data', SimulatorStateEventTypeEnum.ERROR_EVENT, err),
                    );
                },
            ),
        );
    }

    /**
     * Exports edited training definition as JSON file to local files
     */
    export(): Observable<boolean> {
        const blob = new Blob([JSON.stringify(this.uploadedInstanceDataSubject$.getValue().trainingDefinition)], {
            type: 'application/json',
        });
        saveAs(blob, this.EXPORT_FILE_NAME);
        return of(true);
    }

    /**
     * Generates sankey diagram from previously uploaded instance data stored in cache on
     * backend side. This data are identified by combination of definition id, instance id and access token.
     * @return data for sankey diagram visualization
     */
    generate(): Observable<SankeyData> {
        return this.api.generate(this.uploadedInstanceDataSubject$.getValue()).pipe(
            take(1),
            tap(
                (data) => {
                    const value = this.uploadedInstanceDataSubject$.getValue();
                    value.sankeyData = data;
                    this.uploadedInstanceDataSubject$.next(value);
                },
                (err) => {
                    this.stateSubject$.next(
                        new SimulatorState('Generating training visualization', SimulatorStateEventTypeEnum.ERROR_EVENT, err),
                    );
                },
            ),
        );
    }

    /**
     * Updates appropriate phase in current training definition phases
     * @param updatedPhase
     */
    updatePhase(updatedPhase: TrainingPhase): void {
        const phases = this.uploadedInstanceDataSubject$.getValue().trainingDefinition.levels as Phase[];
        const instanceData = this.uploadedInstanceDataSubject$.getValue();
        instanceData.trainingDefinition.levels[phases.indexOf(updatedPhase)] = updatedPhase;
        this.uploadedInstanceDataSubject$.next(instanceData);
    }

    /**
     * Clears data store in services' subjects
     */
    clearInstance(): void {
        this.actionsDisabledSubject$.next(true);
        this.uploadedInstanceDataSubject$.next(null);
    }
}
