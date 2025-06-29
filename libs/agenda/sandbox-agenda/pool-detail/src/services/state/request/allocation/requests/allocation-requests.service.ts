import { RequestsService } from 'libs/agenda/sandbox-agenda/pool-detail/src/services/state/request/requests.service';

export abstract class AllocationRequestsService extends RequestsService {
    protected constructor(pageSize: number, pollPeriod: number) {
        super(pageSize, pollPeriod);
    }
}
