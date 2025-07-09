import {Observable} from 'rxjs';
import {VirtualImage} from '@crczp/sandbox-model';
import {OffsetPaginatedElementsService} from '@sentinel/common';
import {PaginatedResource, PaginationBaseEvent} from '@sentinel/common/pagination';

/**
 * A layer between a component and an API service. Implement a concrete service by extending this class.
 * Provide a concrete class in Angular Module. For more info see https://angular.io/guide/dependency-injection-providers.
 */
export abstract class VMImagesService extends OffsetPaginatedElementsService<VirtualImage> {
    protected constructor(pageSize: number) {
        super(pageSize);
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
    abstract getAvailableImages(
        pagination: PaginationBaseEvent,
        onlyCrczpImages?: boolean,
        onlyGuiAccess?: boolean,
        cached?: boolean,
        filter?: string,
    ): Observable<PaginatedResource<VirtualImage>>;
}
