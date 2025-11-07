import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { MitreTechnique } from '@crczp/training-model';
import { Observable } from 'rxjs';
import { MitreTechniquesListDTO } from '../dto/mitre-techniques/mitre-techniques-list-dto';
import { MitreTechniquesListMapper } from '../mappers/mitre-techniques/mitre-techniques-list-mapper';
import { PortalConfig } from '@crczp/utils';
import { CRCZPHttpService } from '@crczp/api-common';
import { withCache } from '@ngneat/cashew';

/**
 * Service abstracting http communication with training definition endpoints.
 */
@Injectable()
export class MitreTechniquesApi {
    private readonly http = inject(HttpClient);
    private readonly httpService = inject(CRCZPHttpService);

    private readonly mitreTechniquesEndpointUri: string;
    private readonly mitreTechniquesListEndpointUri: string;

    constructor() {
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
            ...(played
                ? {}
                : {
                      context: withCache({
                          storage: 'localStorage',
                          ttl: 7.2e6, // 2h
                      }),
                  }),
        });
    }

    /**
     * Sends http request to retrieve all available mitre techniques for autocomple
     */
    getMitreTechniquesList(): Observable<MitreTechnique[]> {
        return this.httpService
            .get<MitreTechniquesListDTO>(
                this.mitreTechniquesListEndpointUri,
                'Fetching MITRE Techniques List',
            )
            .withCache('12h')
            .withReceiveMapper(MitreTechniquesListMapper.fromDTO)
            .execute();
    }
}
