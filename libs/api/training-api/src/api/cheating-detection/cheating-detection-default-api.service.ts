import {HttpClient, HttpHeaders, HttpParams} from '@angular/common/http';
import {inject, Injectable} from '@angular/core';
import {ResponseHeaderContentDispositionReader} from '@sentinel/common';
import {OffsetPaginationEvent, PaginatedResource} from '@sentinel/common/pagination';
import {CheatingDetection} from '@crczp/training-model';
import {Observable} from 'rxjs';
import {map} from 'rxjs/operators';
import {CheatingDetectionApi} from './cheating-detection-api.service';
import {CheatingDetectionDTO} from '../../dto/cheating-detection/cheating-detection-dto';
import {CheatingDetectionMapper} from '../../mappers/cheating-detection/cheating-detection-mapper';
import {
    BlobFileSaver,
    handleJsonError,
    JavaPaginatedResource,
    PaginationMapper,
    ParamsBuilder
} from '@crczp/api-common';
import {PortalConfig} from "@crczp/common";

/**
 * Default implementation of service abstracting http communication with training event endpoints.
 */
@Injectable()
export class CheatingDetectionDefaultApi extends CheatingDetectionApi {
    private readonly http = inject(HttpClient);

    private readonly apiUrl = inject(PortalConfig).basePaths.linearTraining + 'cheating-detections';

    constructor() {
        super();
    }

    /**
     * Sends http request to retrieve all cheating detections on specified page of a pagination
     * @param pagination requested pagination
     * @param trainingInstanceId the training instance id
     */
    getAll(
        pagination: OffsetPaginationEvent,
        trainingInstanceId: number,
    ): Observable<PaginatedResource<CheatingDetection>> {
        const params = ParamsBuilder.javaPaginationParams(pagination);
        return this.http
            .get<JavaPaginatedResource<CheatingDetectionDTO>>(
                `${this.apiUrl}/${trainingInstanceId}/detections`,
                {
                    params,
                },
            )
            .pipe(
                map(
                    (response) =>
                        new PaginatedResource<CheatingDetection>(
                            CheatingDetectionMapper.fromDTOs(response.content),
                            PaginationMapper.fromJavaDTO(response.pagination),
                        ),
                ),
            );
    }

    /**
     * Sends http request to create and execute new cheating detection
     * @param cheatingDetection cheatingDetection
     */
    createAndExecute(cheatingDetection: CheatingDetection): Observable<any> {
        return this.http.post<CheatingDetectionDTO>(
            `${this.apiUrl}/detection`,
            CheatingDetectionMapper.toDTO(cheatingDetection),
        );
    }

    /**
     * Sends http request to rerun cheating detection
     * @param cheatingDetectionId id of cheating detection to run
     * @param trainingInstanceId id of training instance
     */
    rerun(cheatingDetectionId: number, trainingInstanceId: number): Observable<any> {
        return this.http.patch(
            `${this.apiUrl}/${cheatingDetectionId}/rerun/${trainingInstanceId}`,
            {},
        );
    }

    /**
     * Sends http request to delete cheating detection and its associated detection events
     * @param cheatingDetectionId id of cheating detection which cheats should be deleted
     * @param trainingInstanceId id of training instance
     */
    delete(cheatingDetectionId: number, trainingInstanceId: number): Observable<any> {
        let params = new HttpParams();
        params = params.append('trainingInstanceId', trainingInstanceId);
        return this.http.delete<any>(`${this.apiUrl}/${cheatingDetectionId}/delete`, {params});
    }

    /**
     * Sends http request to archive (download) cheating detection
     * @param cheatingDetectionId id of cheating detection which should be archived
     */
    archive(cheatingDetectionId: number): Observable<any> {
        const filename = `cheating-detection-${cheatingDetectionId}.zip`;
        const headers = new HttpHeaders();
        headers.set('Accept', ['application/octet-stream']);
        return this.http
            .get(`${this.apiUrl}/exports/${cheatingDetectionId}`, {
                responseType: 'blob',
                observe: 'response',
                headers,
            })
            .pipe(
                handleJsonError(),
                map((resp) => {
                    BlobFileSaver.saveBlob(
                        resp.body,
                        ResponseHeaderContentDispositionReader.getFilenameFromResponse(resp, filename),
                    )
                    BlobFileSaver.saveBlob(
                        resp.body,
                        ResponseHeaderContentDispositionReader.getFilenameFromResponse(resp, filename),
                    );
                    return true;
                }),
            );
    }
}
