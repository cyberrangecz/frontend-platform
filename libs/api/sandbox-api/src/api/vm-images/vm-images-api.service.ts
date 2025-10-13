import { Observable } from 'rxjs';
import { VirtualImage } from '@crczp/sandbox-model';
import { SentinelFilter } from '@sentinel/common/filter';
import { OffsetPaginationEvent, PaginatedResource } from '@sentinel/common/pagination';
import { DjangoResourceDTO, PaginationMapper, ParamsBuilder } from '@crczp/api-common';
import { map } from 'rxjs/operators';
import { VirtualImagesMapper } from '../../mappers/vm-images/virtual-images-mapper';
import { VirtualImagesDTO } from '../../dto/vm-images/virtual-images-dto';
import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { PortalConfig } from '@crczp/utils';
import { SentinelParamsMerger } from '@sentinel/common';

/**
 * Service abstracting http communication with vm images endpoints.
 */
@Injectable()
export class VMImagesApi {
    private readonly http = inject(HttpClient);

    private readonly apiUrl =
        inject(PortalConfig).basePaths.sandbox + '/images';

    /**
     * Sends http request to retrieve all available virtual machine images
     * @param pagination requested pagination
     * @param onlyCrczpImages filters images belonging to CyberRangeᶜᶻ Platform
     * @param onlyGuiAccess filters images with GUI access
     * @param cached Performs the faster version of this endpoint but does not retrieve a fresh list of images
     * @param filters list of sentinel filters to filter results
     */
    getAvailableImages(
        pagination: OffsetPaginationEvent,
        onlyCrczpImages = false,
        onlyGuiAccess = false,
        cached = false,
        filters?: SentinelFilter[]
    ): Observable<PaginatedResource<VirtualImage>> {
        const params = SentinelParamsMerger.merge([
            ParamsBuilder.djangoPaginationParams(pagination),
            ParamsBuilder.filterParams(filters),
        ])
            .append('onlyCustom', onlyCrczpImages)
            .append('GUI', onlyGuiAccess)
            .append('cached', cached);

        return this.http
            .get<DjangoResourceDTO<VirtualImagesDTO>>(this.apiUrl, {
                params: params,
            })
            .pipe(
                map(
                    (response) =>
                        new PaginatedResource<VirtualImage>(
                            VirtualImagesMapper.fromDTOs(response.results),
                            PaginationMapper.fromDjangoDTO(response)
                        )
                )
            );
    }
}
