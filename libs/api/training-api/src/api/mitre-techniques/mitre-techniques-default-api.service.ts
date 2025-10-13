import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { MitreTechnique } from '@crczp/training-model';
import { map, Observable } from 'rxjs';
import { MitreTechniquesListDTO } from '../../dto/mitre-techniques/mitre-techniques-list-dto';
import { MitreTechniquesListMapper } from '../../mappers/mitre-techniques/mitre-techniques-list-mapper';
import { MitreTechniquesApi } from './mitre-techniques-api.service';
import { PortalConfig } from '@crczp/utils';
import { withCache } from '@ngneat/cashew';

/**
 * Service abstracting http communication with training definition endpoints.
 */
@Injectable()
export class MitreTechniquesDefaultApi extends MitreTechniquesApi {
    private readonly http = inject(HttpClient);

    private readonly mitreTechniquesEndpointUri: string;
    private readonly mitreTechniquesListEndpointUri: string;

    constructor() {
        super();

        const mitreBasePath = inject(PortalConfig).basePaths.mitre;
        this.mitreTechniquesEndpointUri =
            mitreBasePath + '/mitre-matrix-visualisation';
        this.mitreTechniquesListEndpointUri =
            mitreBasePath + '/mitre-technqiue-index';
    }

    /**
     * Sends http request to retrieve all mitre techniques for all training definitions
     * @param played get mitre techniques only for played trainings
     */
    getMitreTechniques(played: boolean): Observable<string> {
        const params = new HttpParams().append('played', played);
        return this.http.get(this.mitreTechniquesEndpointUri, {
            params: params,
            responseType: 'text',
            context: withCache({
                storage: 'localStorage',
                ttl: 7.2e6, // 2h
            }),
        });
    }

    /**
     * Sends http request to retrieve all available mitre techniques for autocomple
     */
    getMitreTechniquesList(): Observable<MitreTechnique[]> {
        return this.http
            .get<MitreTechniquesListDTO>(this.mitreTechniquesListEndpointUri, {
                context: withCache({
                    storage: 'localStorage',
                    ttl: 7.2e6, // 2h
                }),
            })
            .pipe(
                map((response) => MitreTechniquesListMapper.fromDTO(response))
            );
    }
}
