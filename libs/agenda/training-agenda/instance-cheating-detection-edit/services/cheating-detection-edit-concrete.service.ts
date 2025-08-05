import { inject, Injectable } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { CheatingDetectionApi } from '@crczp/training-api';
import { CheatingDetection } from '@crczp/training-model';
import { Observable } from 'rxjs';
import { switchMap, tap } from 'rxjs/operators';
import { CheatingDetectionEditService } from './cheating-detection-edit.service';
import { ErrorHandlerService, NotificationService } from '@crczp/utils';
import { Routing } from '@crczp/routing-commons';

@Injectable()
export class CheatingDetectionEditConcreteService extends CheatingDetectionEditService {
    private router = inject(Router);
    private dialog = inject(MatDialog);
    private notificationService = inject(NotificationService);
    private errorHandler = inject(ErrorHandlerService);
    private api = inject(CheatingDetectionApi);

    /**
     * Makes an API call to create a cheating detection object in the database.
     * @param cheatingDetection the cheating detection object
     * @param trainingInstanceId training instance id
     */
    create(
        cheatingDetection: CheatingDetection,
        trainingInstanceId: number
    ): Observable<any> {
        return this.api.createAndExecute(cheatingDetection).pipe(
            tap(
                () =>
                    this.notificationService.emit(
                        'success',
                        'Cheating Detection started executing'
                    ),
                (err) =>
                    this.errorHandler.emitAPIError(
                        err,
                        'Creating and Executing Cheating Detection'
                    )
            ),
            switchMap(() =>
                this.router.navigate([
                    Routing.RouteBuilder.linear_instance
                        .instanceId(trainingInstanceId)
                        .cheating_detection.build(),
                ])
            )
        );
    }
}
