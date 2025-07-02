import {HttpClient, HttpParams} from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import {MitreTechnique} from '@crczp/training-model';
import {map, Observable} from 'rxjs';
import {MitreTechniquesListDTO} from '../../dto/mitre-techniques/mitre-techniques-list-dto';
import {MitreTechniquesListMapper} from '../../mappers/mitre-techniques/mitre-techniques-list-mapper';
import {TrainingApiContext} from '../../other/training-api-context';
import {MitreTechniquesApi} from './mitre-techniques-api.service';

/**
 * Service abstracting http communication with training definition endpoints.
 */
@Injectable()
export class MitreTechniquesDefaultApi extends MitreTechniquesApi {
    private http = inject(HttpClient);
    private context = inject(TrainingApiContext);

    readonly mitreTechniquesUriExtension = 'mitre-matrix-visualisation';
    readonly mitreTechniquesListUriExtension = 'mitre-technqiue-index';

    readonly mitreTechniquesEndpointUri: string;
    readonly mitreTechniquesListEndpointUri: string;

    constructor() {
        super();
        this.mitreTechniquesEndpointUri = this.context.config.mitreTechniqueBasePath + this.mitreTechniquesUriExtension;
        this.mitreTechniquesListEndpointUri =
            this.context.config.mitreTechniqueBasePath + this.mitreTechniquesListUriExtension;
    }

    /**
     * Sends http request to retrieve all mitre techniques for all training definitions
     * @param played get mitre techniques only for played trainings
     */
    getMitreTechniques(played: boolean): Observable<string> {
        const params = new HttpParams().append('played', played);
        return this.http.get(this.mitreTechniquesEndpointUri, { params: params, responseType: 'text' });
    }

    /**
     * Sends http request to retrieve all available mitre techniques for autocomple
     */
    getMitreTechniquesList(): Observable<MitreTechnique[]> {
        return this.http

            .get<MitreTechniquesListDTO>(this.mitreTechniquesListEndpointUri)
            .pipe(map((response) => MitreTechniquesListMapper.fromDTO(response)));
    }
}
