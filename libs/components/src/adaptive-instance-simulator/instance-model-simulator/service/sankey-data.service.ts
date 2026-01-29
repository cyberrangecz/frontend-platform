import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError, map, Observable, throwError } from 'rxjs';
import { SankeyDataMapper } from '../model/sankey/mapper/sankey-data-mapper';
import { SankeyDataDTO } from '../model/sankey/dto/sankey-data-dto';
import { SankeyData } from '../model/sankey/sankey-data';
import { PortalConfig } from '@crczp/utils';

@Injectable()
/**
 * Fetches the data from the REST API.
 */
export class SankeyDataService {
    private readonly http = inject(HttpClient);
    private settings = inject(PortalConfig);

    public getAllData(instanceId: number): Observable<SankeyData> {
        return this.http
            .get<SankeyDataDTO>(
                this.settings.basePaths.adaptiveTraining +
                    'visualizations/training-instances/' +
                    instanceId +
                    '/sankey',
            )
            .pipe(
                map((data) => SankeyDataMapper.fromDTOs(data)),
                catchError((error) => {
                    return throwError(
                        'Could not connect to API to obtain data: ' +
                            error.message,
                    );
                }),
            );
    }
}
