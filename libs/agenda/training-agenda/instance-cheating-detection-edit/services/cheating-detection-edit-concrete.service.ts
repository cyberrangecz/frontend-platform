import { Injectable } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { CheatingDetectionApi } from '@crczp/training-api';
import { CheatingDetection } from '@crczp/training-model';
import { Observable } from 'rxjs';
import { switchMap, tap } from 'rxjs/operators';
import { TrainingErrorHandler, TrainingNavigator, TrainingNotificationService } from '@crczp/training-agenda';
import { CheatingDetectionEditService } from './cheating-detection-edit.service';

@Injectable()
export class CheatingDetectionEditConcreteService extends CheatingDetectionEditService {
    constructor(
        private router: Router,
        private dialog: MatDialog,
        private navigator: TrainingNavigator,
        private notificationService: TrainingNotificationService,
        private errorHandler: TrainingErrorHandler,
        private api: CheatingDetectionApi,
    ) {
        super();
    }

    /**
     * Makes an API call to create a cheating detection object in the database.
     * @param cheatingDetection the cheating detection object
     * @param trainingInstanceId training instance id
     */
    create(cheatingDetection: CheatingDetection, trainingInstanceId: number): Observable<any> {
        return this.api.createAndExecute(cheatingDetection).pipe(
            tap(
                () => this.notificationService.emit('success', 'Cheating Detection started executing'),
                (err) => this.errorHandler.emit(err, 'Creating and Executing Cheating Detection'),
            ),
            switchMap(() =>
                this.router.navigate([this.navigator.toTrainingInstanceCheatingDetection(trainingInstanceId)]),
            ),
        );
    }
}
