import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { MitreTechniquesApi } from '@crczp/training-api';
import { MitreTechnique } from '@crczp/training-model';
import { MitreTechniquesService } from './mitre-techniques.service';
import { ErrorHandlerService } from '@crczp/utils';

@Injectable()
export class MitreTechniquesConcreteService extends MitreTechniquesService {
    private api = inject(MitreTechniquesApi);
    private errorHandler = inject(ErrorHandlerService);

    getAll(): Observable<MitreTechnique[]> {
        return this.api.getMitreTechniquesList().pipe(
            tap(
                (res) => this.mitreTechniquesSubject$.next(res),
                (err) =>
                    this.errorHandler.emit(err, 'Loading MITRE techniques list')
            )
        );
    }
}
