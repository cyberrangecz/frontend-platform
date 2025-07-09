import {SandboxErrorHandler} from '@crczp/sandbox-agenda';
import {VMImagesApi} from '@crczp/sandbox-api';
import {tap} from 'rxjs/operators';
import {Observable} from 'rxjs';
import {inject, Injectable} from '@angular/core';
import {VirtualImage} from '@crczp/sandbox-model';
import {SentinelFilter} from '@sentinel/common/filter';
import {OffsetPaginationEvent, PaginatedResource,} from '@sentinel/common/pagination';
import {VMImagesService} from './vm-images.service';
import {PortalConfig} from '@crczp/common';

@Injectable()
export class VMImagesConcreteService extends VMImagesService {
    private vmImagesApi = inject(VMImagesApi);
    private errorHandler = inject(SandboxErrorHandler);

    constructor() {
        super(inject(PortalConfig).defaultPageSize);
    }

    /**
     * Retrieves paginated available virtual machine images
     * @param pagination requested pagination
     * @param onlyCrczpImages filters images belonging to CyberRangeᶜᶻ Platform
     * @param onlyGuiAccess filters images with GUI access
     * @param cached Performs the faster version of this endpoint but does not retrieve a fresh list of images
     * @param filter list of sentinel filters to filter results
     *
     */
    getAvailableImages(
        pagination: OffsetPaginationEvent,
        onlyCrczpImages?: boolean,
        onlyGuiAccess?: boolean,
        cached?: boolean,
        filter?: string
    ): Observable<PaginatedResource<VirtualImage>> {
        this.isLoadingSubject$.next(true);
        const filters = filter ? [new SentinelFilter('name', filter)] : [];
        return this.vmImagesApi
            .getAvailableImages(
                pagination,
                onlyCrczpImages,
                onlyGuiAccess,
                cached,
                filters
            )
            .pipe(
                tap(
                    (resource) => {
                        this.resourceSubject$.next(resource);
                        this.isLoadingSubject$.next(false);
                    },
                    (err) => {
                        this.errorHandler.emit(err, 'Fetching images');
                        this.hasErrorSubject$.next(true);
                        this.isLoadingSubject$.next(false);
                    }
                )
            );
    }
}
