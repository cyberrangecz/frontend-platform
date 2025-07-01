import { Injectable } from '@angular/core';
import { MitreTechniquesApi } from '@crczp/training-api';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { TrainingErrorHandler } from '@crczp/training-agenda';
import { MitreTechniquesOverviewService } from './mitre-techniques.service';

@Injectable()
export class MitreTechniquesOverviewConcreteService extends MitreTechniquesOverviewService {
    constructor(
        private mitreTechniquesApi: MitreTechniquesApi,
        private errorHandler: TrainingErrorHandler,
    ) {
        super();
    }

    getMitreTechniques(played: boolean): Observable<string> {
        return this.mitreTechniquesApi.getMitreTechniques(played).pipe(
            tap(
                (resource) => {
                    this.resourceSubject$.next(resource);
                },
                (err) => {
                    this.hasErrorSubject$.next(true);
                    this.errorHandler.emit(err, 'Fetching mitre techniques');
                },
            ),
        );
    }
}
