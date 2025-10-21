import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { SentinelParamsMerger } from '@sentinel/common';
import { OffsetPaginationEvent } from '@sentinel/common/pagination';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { DetectionEventMapper } from '../mappers/detection-event/detection-event-mapper';
import { DetectionEventDTO } from '../dto/detection-event/detection-event-dto';
import {
    AbstractDetectionEvent,
    AnswerSimilarityDetectionEvent,
    DetectedForbiddenCommand,
    DetectionEventParticipant,
    ForbiddenCommandsDetectionEvent,
    LocationSimilarityDetectionEvent,
    MinimalSolveTimeDetectionEvent,
    NoCommandsDetectionEvent,
    TimeProximityDetectionEvent,
} from '@crczp/training-model';
import { DetectionEventRestResource } from '../dto/detection-event/detection-event-rest-resource';
import { DetectionEventParticipantMapper } from '../mappers/detection-event/detection-event-participant-mapper';
import { AnswerSimilarityDetectionEventDTO } from '../dto/detection-event/answer-similarity/answer-similarity-detection-event-dto';
import { AnswerSimilarityDetectionEventMapper } from '../mappers/detection-event/answer-similarity-detection-event-mapper';
import { LocationSimilarityDetectionEventDTO } from '../dto/detection-event/location-similarity/location_similarity-detection-event-dto';
import { LocationSimilarityDetectionEventMapper } from '../mappers/detection-event/location-similarity-detection-event-mapper';
import { NoCommandsDetectionEventDTO } from '../dto/detection-event/no-commands/no-commands-detection-event-dto';
import { NoCommandsDetectionEventMapper } from '../mappers/detection-event/no-commands-detection-event-mapper';
import { MinimalSolveTimeDetectionEventMapper } from '../mappers/detection-event/minimal-solve-time-detection-event-mapper';
import { MinimalSolveTimeDetectionEventDTO } from '../dto/detection-event/minimal-solve-time/minimal-solve-time-detection-event-dto';
import { TimeProximityDetectionEventDTO } from '../dto/detection-event/time-proximity/time_proximity-detection-event-dto';
import { TimeProximityDetectionEventMapper } from '../mappers/detection-event/time-proximity-detection-event-mapper';
import { ForbiddenCommandsDetectionEventDTO } from '../dto/detection-event/forbidden-commands/forbidden-commands-detection-event-dto';
import { ForbiddenCommandsDetectionEventMapper } from '../mappers/detection-event/forbidden-commands-detection-event-mapper';
import { DetectedForbiddenCommandMapper } from '../mappers/detection-event/detected-forbidden-command-mapper';
import {
    JavaPaginatedResource,
    OffsetPaginatedResource,
    PaginationMapper,
    ParamsBuilder,
    QueryParam,
} from '@crczp/api-common';
import { DetectedForbiddenCommandDTO } from '../dto/detection-event/detected-forbidden-command-dto';
import { DetectionEventParticipantDTO } from '../dto/detection-event/detection-event-participant-dto';
import { PortalConfig } from '@crczp/utils';
import {
    AbstractDetectionEventSort,
    DetectedForbiddenCommandSort,
    DetectionEventParticipantSort,
} from './sorts';

@Injectable()
export class DetectionEventApi {
    private readonly http = inject(HttpClient);

    private readonly apiUrl =
        inject(PortalConfig).basePaths.linearTraining + '/cheating-detections';

    /**
     * Sends http request to retrieve all detection events from cheating detection
     * on specified page of a pagination
     * @param cheatingDetectionId id of the cheating detection
     * @param trainingInstanceId id of the training instance
     * @param pagination requested pagination
     * @param filters filters to be applied on result
     */
    getAll(
        pagination: OffsetPaginationEvent<AbstractDetectionEventSort>,
        cheatingDetectionId: number,
        trainingInstanceId: number,
        filters: QueryParam[] = [],
    ): Observable<OffsetPaginatedResource<AbstractDetectionEvent>> {
        const params = SentinelParamsMerger.merge([
            new HttpParams().append(
                'trainingInstanceId',
                trainingInstanceId.toString(),
            ),
            ParamsBuilder.javaPaginationParams(pagination),
            ParamsBuilder.queryParams(filters),
        ]);
        return this.http
            .get<DetectionEventRestResource>(
                `${this.apiUrl}/${cheatingDetectionId}/events`,
                {
                    params,
                },
            )
            .pipe(
                map(
                    (response) =>
                        new OffsetPaginatedResource<AbstractDetectionEvent>(
                            DetectionEventMapper.fromDTOs(response.content),
                            PaginationMapper.fromDjangoDTO(response.pagination),
                        ),
                ),
            );
    }

    /**
     * Sends http request to find all forbidden commands of a detection event
     * @param pagination requested pagination
     * @param eventId the id of the detection event
     */
    getAllForbiddenCommandsOfEvent(
        pagination: OffsetPaginationEvent<DetectedForbiddenCommandSort>,
        eventId: number,
    ): Observable<OffsetPaginatedResource<DetectedForbiddenCommand>> {
        const params = SentinelParamsMerger.merge([
            new HttpParams().append('eventId', eventId.toString()),
            ParamsBuilder.javaPaginationParams(pagination),
        ]);
        return this.http
            .get<JavaPaginatedResource<DetectedForbiddenCommandDTO>>(
                `${this.apiUrl}/forbidden-commands`,
                {
                    params,
                },
            )
            .pipe(
                map(
                    (response) =>
                        new OffsetPaginatedResource<DetectedForbiddenCommand>(
                            DetectedForbiddenCommandMapper.fromDTOs(
                                response.content,
                            ),
                            PaginationMapper.fromJavaDTO(response.pagination),
                        ),
                ),
            );
    }

    /**
     * Sends http request to find all participants of a detection event
     * @param pagination requested pagination
     * @param eventId the id of the detection event
     */
    getAllParticipants(
        pagination: OffsetPaginationEvent<DetectionEventParticipantSort>,
        eventId: number,
    ): Observable<OffsetPaginatedResource<DetectionEventParticipant>> {
        const params = SentinelParamsMerger.merge([
            new HttpParams().append('eventId', eventId.toString()),
            ParamsBuilder.javaPaginationParams(pagination),
        ]);
        return this.http
            .get<JavaPaginatedResource<DetectionEventParticipantDTO>>(
                `${this.apiUrl}/participants`,
                {
                    params,
                },
            )
            .pipe(
                map(
                    (response) =>
                        new OffsetPaginatedResource<DetectionEventParticipant>(
                            DetectionEventParticipantMapper.fromDTOs(
                                response.content,
                            ),
                            PaginationMapper.fromJavaDTO(response.pagination),
                        ),
                ),
            );
    }

    /**
     * Sends http request to retrieve detection event by its ID
     * @param eventId id of the detection event
     */
    getEventById(eventId: number): Observable<AbstractDetectionEvent> {
        const params = new HttpParams().append('eventId', eventId.toString());
        return this.http
            .get<DetectionEventDTO>(`${this.apiUrl}/event`, { params })
            .pipe(map((response) => DetectionEventMapper.fromDTO(response)));
    }

    /**
     * Sends http request to find detection event of type answer similarity by its id
     * @param eventId the event id
     */
    getAnswerSimilarityEventById(
        eventId: number,
    ): Observable<AnswerSimilarityDetectionEvent> {
        const params = new HttpParams().append('eventId', eventId.toString());
        return this.http
            .get<AnswerSimilarityDetectionEventDTO>(
                `${this.apiUrl}/answer-similarity`,
                { params },
            )
            .pipe(
                map((response) =>
                    AnswerSimilarityDetectionEventMapper.fromDTO(response),
                ),
            );
    }

    /**
     * Sends http request to find detection event of type location similarity by its id
     * @param eventId the event id
     */
    getLocationSimilarityEventById(
        eventId: number,
    ): Observable<LocationSimilarityDetectionEvent> {
        const params = new HttpParams().append('eventId', eventId.toString());
        return this.http
            .get<LocationSimilarityDetectionEventDTO>(
                `${this.apiUrl}/location-similarity`,
                {
                    params,
                },
            )
            .pipe(
                map((response) =>
                    LocationSimilarityDetectionEventMapper.fromDTO(response),
                ),
            );
    }

    /**
     * Sends http request to find detection event of type time proximity by its id
     * @param eventId the event id
     */
    getTimeProximityEventById(
        eventId: number,
    ): Observable<TimeProximityDetectionEvent> {
        const params = new HttpParams().append('eventId', eventId.toString());
        return this.http
            .get<TimeProximityDetectionEventDTO>(
                `${this.apiUrl}/time-proximity`,
                { params },
            )
            .pipe(
                map((response) =>
                    TimeProximityDetectionEventMapper.fromDTO(response),
                ),
            );
    }

    /**
     * Sends http request to find detection event of type minimal solve time by its id
     * @param eventId the event id
     */
    getMinimalSolveTimeEventById(
        eventId: number,
    ): Observable<MinimalSolveTimeDetectionEvent> {
        const params = new HttpParams().append('eventId', eventId.toString());
        return this.http
            .get<MinimalSolveTimeDetectionEventDTO>(
                `${this.apiUrl}/minimal-solve-time`,
                { params },
            )
            .pipe(
                map((response) =>
                    MinimalSolveTimeDetectionEventMapper.fromDTO(response),
                ),
            );
    }

    /**
     * Sends http request to find detection event of type no commands by its id
     * @param eventId the event id
     */
    getNoCommandsEventById(
        eventId: number,
    ): Observable<NoCommandsDetectionEvent> {
        const params = new HttpParams().append('eventId', eventId.toString());
        return this.http
            .get<NoCommandsDetectionEventDTO>(`${this.apiUrl}/no-commands`, {
                params,
            })
            .pipe(
                map((response) =>
                    NoCommandsDetectionEventMapper.fromDTO(response),
                ),
            );
    }

    /**
     * Sends http request to find detection event of type forbidden commands by its id
     * @param eventId the event id
     */
    getForbiddenCommandsEventById(
        eventId: number,
    ): Observable<ForbiddenCommandsDetectionEvent> {
        const params = new HttpParams().append('eventId', eventId.toString());
        return this.http
            .get<ForbiddenCommandsDetectionEventDTO>(
                `${this.apiUrl}/forbidden-commands`,
                {
                    params,
                },
            )
            .pipe(
                map((response) =>
                    ForbiddenCommandsDetectionEventMapper.fromDTO(response),
                ),
            );
    }

    /**
     * Sends http request to delete all detection events by cheating detection id
     * @param cheatingDetectionId id of cheating detection
     * @param force true if delete should be forced, false otherwise
     */
    deleteAllByCheatingDetectionId(
        cheatingDetectionId: number,
    ): Observable<any> {
        return this.http.delete<any>(
            `${this.apiUrl}/${cheatingDetectionId}/delete`,
            {},
        );
    }

    /**
     * Sends http request to delete all detection events by training instance id
     * @param trainingInstanceId id of training instance
     */
    deleteAllByTrainingInstanceId(trainingInstanceId: number): Observable<any> {
        return this.http.delete<any>(
            `${this.apiUrl}/${trainingInstanceId}/instance`,
            {},
        );
    }
}
