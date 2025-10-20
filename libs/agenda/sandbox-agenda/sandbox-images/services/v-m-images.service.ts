import { VMImagesApi, VmImageSort } from '@crczp/sandbox-api';
import { tap } from 'rxjs/operators';
import { Observable } from 'rxjs';
import { inject, Injectable } from '@angular/core';
import { VirtualImage } from '@crczp/sandbox-model';
import { OffsetPaginationEvent, PaginatedResource } from '@sentinel/common/pagination';
import { ErrorHandlerService, PortalConfig } from '@crczp/utils';
import { QueryParam } from '@crczp/api-common';
import { OffsetPaginatedElementsService } from '@sentinel/common';

@Injectable()
export class VMImagesService extends OffsetPaginatedElementsService<VirtualImage> {
    private vmImagesApi = inject(VMImagesApi);
    private errorHandler = inject(ErrorHandlerService);

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
        pagination: OffsetPaginationEvent<VmImageSort>,
        onlyCrczpImages?: boolean,
        onlyGuiAccess?: boolean,
        cached?: boolean,
        filter?: string,
    ): Observable<PaginatedResource<VirtualImage>> {
        this.isLoadingSubject$.next(true);
        const filters = filter ? [new QueryParam('name', filter)] : [];
        return this.vmImagesApi
            .getAvailableImages(
                pagination,
                onlyCrczpImages,
                onlyGuiAccess,
                cached,
                filters,
            )
            .pipe(
                tap(
                    (resource) => {
                        this.resourceSubject$.next(resource);
                        this.isLoadingSubject$.next(false);
                    },
                    (err) => {
                        this.errorHandler.emitAPIError(err, 'Fetching images');
                        this.hasErrorSubject$.next(true);
                        this.isLoadingSubject$.next(false);
                    },
                ),
            );
    }
}
