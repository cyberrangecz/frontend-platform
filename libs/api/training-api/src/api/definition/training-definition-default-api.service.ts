import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { ResponseHeaderContentDispositionReader, SentinelParamsMerger } from '@sentinel/common';
import {
    BlobFileSaver,
    handleJsonError,
    JavaPaginatedResource,
    PaginationMapper,
    ParamsBuilder,
    QueryParam
} from '@crczp/api-common';
import { OffsetPaginationEvent, PaginatedResource } from '@sentinel/common/pagination';
import {
    AccessLevel,
    AssessmentLevel,
    InfoLevel,
    Level,
    TrainingDefinition,
    TrainingDefinitionInfo,
    TrainingDefinitionStateEnum,
    TrainingLevel
} from '@crczp/training-model';
import { fromEvent, Observable } from 'rxjs';
import { map, mergeMap } from 'rxjs/operators';
import { AssessmentLevelDTO } from '../../dto/level/assessment/assessment-level-dto';
import { BasicLevelInfoDTO } from '../../dto/level/basic-level-info-dto';
import { TrainingLevelDto } from '../../dto/level/training/training-level-dto';
import { InfoLevelDTO } from '../../dto/level/info/info-level-dto';
import { TrainingDefinitionDTO } from '../../dto/training-definition/training-definition-dto';
import { LevelMapper } from '../../mappers/level/level-mapper';
import { TrainingDefinitionInfoMapper } from '../../mappers/training-definition/training-definition-info-mapper';
import { TrainingDefinitionMapper } from '../../mappers/training-definition/training-definition-mapper';
import { LinearTrainingDefinitionApi } from './training-definition-api.service';
import { TrainingDefinitionInfoDTO } from '../../dto/training-definition/training-definition-info-dto';
import { PortalConfig } from '@crczp/utils';
import { TrainingDefinitionSort } from '../sorts';

/**
 * Service abstracting http communication with training definition endpoints.
 */
@Injectable()
export class TrainingDefinitionDefaultApi extends LinearTrainingDefinitionApi {
    private readonly http = inject(HttpClient);

    private readonly trainingDefinitionUriExtension = 'training-definitions';
    private readonly levelsUriExtension = 'levels';
    private readonly sandboxDefUriExtension = 'sandbox-definitions';
    private readonly trainingDefsEndpointUri: string;
    private readonly trainingExportEndpointUri: string;
    private readonly trainingImportEndpointUri: string;

    constructor() {
        super();

        const basePath = inject(PortalConfig).basePaths.linearTraining;
        this.trainingDefsEndpointUri =
            basePath + '/' + this.trainingDefinitionUriExtension;
        this.trainingExportEndpointUri = basePath + '/exports';
        this.trainingImportEndpointUri = basePath + '/imports';
    }

    /**
     * Sends http request to retrieve all training definitions on specified page of a pagination
     * @param pagination requested pagination
     * @param filters filters to be applied on result
     */
    getAll(
        pagination: OffsetPaginationEvent<TrainingDefinitionSort>,
        filters: QueryParam[] = [],
    ): Observable<PaginatedResource<TrainingDefinition>> {
        const params = SentinelParamsMerger.merge([
            ParamsBuilder.javaPaginationParams(pagination),
            ParamsBuilder.queryParams(filters),
        ]);
        return this.http
            .get<
                JavaPaginatedResource<TrainingDefinitionDTO>
            >(this.trainingDefsEndpointUri, { params })
            .pipe(
                map(
                    (response) =>
                        new PaginatedResource(
                            TrainingDefinitionMapper.fromDTOs(
                                response.content,
                                false,
                            ),
                            PaginationMapper.fromJavaDTO(response.pagination),
                        ),
                ),
            );
    }

    /**
     * Sends http request to retrieve all training instances on specified page of a pagination for organizer (different access rights)
     * @param pagination requested pagination
     * @param filters filters to be applied on result
     */
    getAllForOrganizer(
        pagination: OffsetPaginationEvent<TrainingDefinitionSort>,
        filters: QueryParam[] = [],
    ): Observable<PaginatedResource<TrainingDefinitionInfo>> {
        const params = SentinelParamsMerger.merge([
            ParamsBuilder.javaPaginationParams(pagination),
            ParamsBuilder.queryParams(filters),
        ]);
        return this.http
            .get<
                JavaPaginatedResource<TrainingDefinitionInfoDTO>
            >(`${this.trainingDefsEndpointUri}/for-organizers`, { params })
            .pipe(
                map(
                    (response) =>
                        new PaginatedResource(
                            TrainingDefinitionInfoMapper.fromDTOs(
                                response.content,
                            ),
                            PaginationMapper.fromJavaDTO(response.pagination),
                        ),
                ),
            );
    }

    /**
     * Sends http request to retrieve training definition by its id
     * @param id id of training definition
     * @param withLevels true if training definition should be mapped with levels, false otherwise
     */
    get(id: number, withLevels = false): Observable<TrainingDefinition> {
        return this.http
            .get<TrainingDefinitionDTO>(`${this.trainingDefsEndpointUri}/${id}`)
            .pipe(
                map((response) =>
                    TrainingDefinitionMapper.fromDTO(response, withLevels),
                ),
            );
    }

    /**
     * Sends http request to change state of a training definition
     * @param trainingDefinitionId id of a training definition which state should be changed
     * @param newState new state to be set
     */
    changeState(
        trainingDefinitionId: number,
        newState: TrainingDefinitionStateEnum,
    ): Observable<any> {
        return this.http.put(
            `${
                this.trainingDefsEndpointUri
            }/${trainingDefinitionId}/states/${TrainingDefinitionMapper.stateToDTO(
                newState,
            )}`,
            {},
        );
    }

    /**
     * Sends http request to retrieve level by id
     * @param levelId id of level which should be retrieved
     */
    getLevel(levelId: number): Observable<Level> {
        return this.http
            .get<
                TrainingLevelDto | InfoLevelDTO | AssessmentLevelDTO
            >(`${this.trainingDefsEndpointUri}/${this.levelsUriExtension}/${levelId}`)
            .pipe(map((response) => LevelMapper.fromDTO(response)));
    }

    /**
     * Sends request to download training definition json file.
     * @param id id of training definition which should be downloaded
     */
    download(id: number): Observable<boolean> {
        const headers = new HttpHeaders();
        headers.set('Accept', ['application/octet-stream']);

        return this.http
            .get(
                `${this.trainingExportEndpointUri}/${this.trainingDefinitionUriExtension}/${id}`,
                {
                    responseType: 'blob',
                    observe: 'response',
                    headers,
                },
            )
            .pipe(
                handleJsonError(),
                map((resp) => {
                    BlobFileSaver.saveBlob(
                        resp.body,
                        ResponseHeaderContentDispositionReader.getFilenameFromResponse(
                            resp,
                            'training-definition.json',
                        ),
                    );
                    return true;
                }),
            );
    }

    /**
     * Sends http request to upload training definition json file,
     * Converts training definition file to a JSON object and sends it to provided url.
     * @param file json file to be uploaded
     */
    upload(file: File): Observable<TrainingDefinition> {
        const fileReader = new FileReader();
        const fileRead$ = fromEvent(fileReader, 'load').pipe(
            mergeMap(() => {
                const jsonBody = JSON.parse(fileReader.result as string);
                return this.http.post<TrainingDefinitionDTO>(
                    `${this.trainingImportEndpointUri}/${this.trainingDefinitionUriExtension}`,
                    jsonBody,
                );
            }),
        );
        fileReader.readAsText(file);
        return fileRead$.pipe(
            map((resp) => TrainingDefinitionMapper.fromDTO(resp, false)),
        );
    }

    /**
     * Sends http request to delete training definition
     * @param id id of training definition which should be deleted
     */
    delete(id: number): Observable<any> {
        return this.http.delete(`${this.trainingDefsEndpointUri}/${id}`, {
            headers: this.createDefaultHeaders(),
        });
    }

    /**
     * Sends http request to clone training definition
     * @param id id of training definition which should be cloned.
     * @param title title of new cloned training definition
     */
    clone(id: number, title: string): Observable<number> {
        let params = new HttpParams();
        params = params.append('title', title);
        return this.http.post<number>(
            `${this.trainingDefsEndpointUri}/${id}`,
            {},
            {
                params,
                headers: this.createDefaultHeaders(),
            },
        );
    }

    /**
     * Sends http request to update training definition
     * @param trainingDefinition training definition to update
     */
    update(trainingDefinition: TrainingDefinition): Observable<number> {
        return this.http.put<number>(
            this.trainingDefsEndpointUri,
            TrainingDefinitionMapper.toUpdateDTO(trainingDefinition),
            { headers: this.createDefaultHeaders() },
        );
    }

    /**
     * Sends http request to create new training definition
     * @param trainingDefinition training definition which should be created
     */
    create(
        trainingDefinition: TrainingDefinition,
    ): Observable<TrainingDefinition> {
        return this.http
            .post<TrainingDefinitionDTO>(
                this.trainingDefsEndpointUri,
                TrainingDefinitionMapper.toCreateDTO(trainingDefinition),
                { headers: this.createDefaultHeaders() },
            )
            .pipe(map((resp) => TrainingDefinitionMapper.fromDTO(resp, false)));
    }

    /**
     * Sends http request to create new assessment level associated with training definition
     * @param trainingDefinitionId id of training definition which should be associated with the new level
     */
    createAssessmentLevel(
        trainingDefinitionId: number,
    ): Observable<AssessmentLevel> {
        return this.http
            .post<BasicLevelInfoDTO>(
                `${this.trainingDefsEndpointUri}/${trainingDefinitionId}/${this.levelsUriExtension}/ASSESSMENT`,
                {},
                { headers: this.createDefaultHeaders() },
            )
            .pipe(
                map(
                    (resp) => LevelMapper.fromBasicDTO(resp) as AssessmentLevel,
                ),
            );
    }

    /**
     * Sends http request to create new training level associated with training definition
     * @param trainingDefinitionId id of training definition which should be associated with the new level
     */
    createTrainingLevel(
        trainingDefinitionId: number,
    ): Observable<TrainingLevel> {
        return this.http
            .post<BasicLevelInfoDTO>(
                `${this.trainingDefsEndpointUri}/${trainingDefinitionId}/${this.levelsUriExtension}/TRAINING`,
                {},
                { headers: this.createDefaultHeaders() },
            )
            .pipe(
                map((resp) => LevelMapper.fromBasicDTO(resp) as TrainingLevel),
            );
    }

    /**
     * Sends http request to create new access level associated with training definition
     * @param trainingDefinitionId id of training definition which should be associated with the new level
     */
    createAccessLevel(trainingDefinitionId: number): Observable<AccessLevel> {
        return this.http
            .post<BasicLevelInfoDTO>(
                `${this.trainingDefsEndpointUri}/${trainingDefinitionId}/${this.levelsUriExtension}/ACCESS`,
                {},
                { headers: this.createDefaultHeaders() },
            )
            .pipe(map((resp) => LevelMapper.fromBasicDTO(resp) as AccessLevel));
    }

    /**
     * Sends http request to create new info level associated with training definition
     * @param trainingDefId id of training definition which should be associated with the new level
     */
    createInfoLevel(trainingDefId: number): Observable<InfoLevel> {
        return this.http
            .post<BasicLevelInfoDTO>(
                `${this.trainingDefsEndpointUri}/${trainingDefId}/${this.levelsUriExtension}/INFO`,
                {},
                { headers: this.createDefaultHeaders() },
            )
            .pipe(map((resp) => LevelMapper.fromBasicDTO(resp) as InfoLevel));
    }

    /**
     * Sends http request to delete level
     * @param trainingDefinitionId id of training definition associated with the level which should be deleted
     * @param levelId id of level which should be deleted
     */
    deleteLevel(
        trainingDefinitionId: number,
        levelId: number,
    ): Observable<Level[]> {
        // prettier-ignore
        return this.http
            .delete<BasicLevelInfoDTO[]>(
                `${this.trainingDefsEndpointUri}/${trainingDefinitionId}/` +
                `${this.levelsUriExtension}/${levelId}`,
                { headers: this.createDefaultHeaders() }
            )
            .pipe(map((resp) => LevelMapper.fromBasicDTOs(resp)));
    }

    /**
     * Sends http request to update training levels
     * @param trainingDefinitionId id of training definition associated with the levels
     * @param levels training levels which should be updated
     */
    updateTrainingDefinitionLevels(
        trainingDefinitionId: number,
        levels: Level[],
    ): Observable<any> {
        return this.http.put(
            `${this.trainingDefsEndpointUri}/${trainingDefinitionId}/levels`,
            LevelMapper.toUpdateDTOs(levels),
            { headers: this.createDefaultHeaders() },
        );
    }

    /**
     * Sends http request to move level to new position (change order)
     * @param trainingDefinitionId id of training definition associated with the level
     * @param levelId id of a level which should be moved
     * @param toPosition index of new position of a level
     */
    moveLevelTo(
        trainingDefinitionId: number,
        levelId: number,
        toPosition: number,
    ): Observable<Level[]> {
        // prettier-ignore
        return this.http
            .put<BasicLevelInfoDTO[]>(
                `${this.trainingDefsEndpointUri}/${trainingDefinitionId}/` +
                `${this.levelsUriExtension}/${levelId}/move-to/${toPosition}`,
                {},
                { headers: this.createDefaultHeaders() }
            )
            .pipe(map((resp) => LevelMapper.fromBasicDTOs(resp)));
    }

    /**
     * Sends http request to swap level with another level
     * @param trainingDefinitionId id of training definition associated with the level
     * @param levelIdFrom id of a first level which should be swaped
     * @param levelIdTo id of a second level which should be swaped
     */
    swapLevelWith(
        trainingDefinitionId: number,
        levelIdFrom: number,
        levelIdTo: number,
    ): Observable<Level[]> {
        // prettier-ignore
        return this.http
            .put<BasicLevelInfoDTO[]>(
                `${this.trainingDefsEndpointUri}/${trainingDefinitionId}/` +
                `${this.levelsUriExtension}/${levelIdFrom}/swap-with/${levelIdTo}`,
                {},
                { headers: this.createDefaultHeaders() }
            )
            .pipe(map((resp) => LevelMapper.fromBasicDTOs(resp)));
    }

    /**
     * Sends http request to determine whether given training definition has reference solution
     * @param trainingDefinitionId training definition id
     */
    hasReferenceSolution(trainingDefinitionId: number): Observable<boolean> {
        return this.http.get<boolean>(
            `${this.trainingDefsEndpointUri}/${trainingDefinitionId}/has-reference-solution`,
        );
    }

    /**
     * Sends http request to retrieve all training definitions with given sandbox definition id
     * @param sandboxDefId id of sandbox definition
     * @param pagination requested pagination
     * @param filters filters to be applied on result
     */
    geTrainingDefinition(
        sandboxDefId: number,
        pagination: OffsetPaginationEvent<TrainingDefinitionSort>,
        filters: QueryParam[] = [],
    ): Observable<PaginatedResource<TrainingDefinition>> {
        const params = SentinelParamsMerger.merge([
            ParamsBuilder.javaPaginationParams(pagination),
            ParamsBuilder.queryParams(filters),
        ]);
        return this.http
            .get<
                JavaPaginatedResource<TrainingDefinitionDTO>
            >(`${this.trainingDefsEndpointUri}/${this.sandboxDefUriExtension}/${sandboxDefId}`, { params })
            .pipe(
                map(
                    (response) =>
                        new PaginatedResource(
                            TrainingDefinitionMapper.fromDTOs(
                                response.content,
                                false,
                            ),
                            PaginationMapper.fromJavaDTO(response.pagination),
                        ),
                ),
            );
    }

    private createDefaultHeaders() {
        const httpHeaderAccepts: string[] = ['*/*', 'application/json'];
        const headers = new HttpHeaders();
        headers.set('Accept', httpHeaderAccepts);
        return headers;
    }
}
