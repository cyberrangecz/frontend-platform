import {Injectable} from '@angular/core';
import {SentinelFilter} from '@sentinel/common/filter';
import {OffsetPaginationEvent, PaginatedResource,} from '@sentinel/common/pagination';
import {AdaptiveDefinitionApiService} from '@crczp/training-api';
import {TrainingDefinitionInfo} from '@crczp/training-model';
import {Observable} from 'rxjs';
import {tap} from 'rxjs/operators';
import {TrainingErrorHandler} from '@crczp/training-agenda';
import {TrainingDefinitionOrganizerSelectService} from './training-definition-organizer-select.service';
import {Settings} from '@crczp/common';

/**
 * Layer between component and API service
 */
@Injectable()
export class AdaptiveDefinitionOrganizerSelectConcreteService extends TrainingDefinitionOrganizerSelectService {
    constructor(
        private api: AdaptiveDefinitionApiService,
        private errorHandler: TrainingErrorHandler,
        settings: Settings
    ) {
        super(settings.DEFAULT_PAGE_SIZE);
    }

    /**
     * Gets paginated training definitions and updates related observables or handles error
     * @param pagination requested pagination
     * @param stateFilter filter (state attribute) which should be applied to requested training definitions
     */
    getAll(
        pagination: OffsetPaginationEvent,
        stateFilter: string
    ): Observable<PaginatedResource<TrainingDefinitionInfo>> {
        this.hasErrorSubject$.next(false);
        this.isLoadingSubject$.next(true);
        return this.api
            .getAllForOrganizer(pagination, [
                new SentinelFilter('state', stateFilter),
            ])
            .pipe(
                tap(
                    (definitions) => {
                        this.resourceSubject$.next(definitions);
                        this.isLoadingSubject$.next(false);
                    },
                    (err) => {
                        this.hasErrorSubject$.next(true);
                        this.errorHandler.emit(
                            err,
                            `Fetching ${stateFilter} Training Definitions`
                        );
                        this.isLoadingSubject$.next(false);
                    }
                )
            );
    }
}
