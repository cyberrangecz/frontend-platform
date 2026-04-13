import { inject, Injectable } from '@angular/core';
import { CRCZPHttpService } from '../crczp-http.service';
import { PortalConfig } from '@crczp/utils';
import { Observable } from 'rxjs';
import { OpensearchResponseDto } from './opensearch-response-dto';

@Injectable({
    providedIn: 'root',
})
export class CrczpOpensearchApiService {
    private readonly httpService = inject(CRCZPHttpService);
    private readonly endpoint =
        inject(PortalConfig).basePaths.linearTraining + '/opensearch/sql';

    public executeQuery(query: string): Observable<OpensearchResponseDto> {
        return this.httpService
            .get<OpensearchResponseDto>(
                this.endpoint,
                'Send SQL query to OpenSearch',
            )
            .withParams({ query })
            .execute();
    }
}
