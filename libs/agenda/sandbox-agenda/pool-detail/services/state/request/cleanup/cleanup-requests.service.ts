import {RequestsService} from '../requests.service';

export abstract class CleanupRequestsService extends RequestsService {
    protected constructor(pageSize: number, pollPeriod: number) {
        super(pageSize, pollPeriod);
    }
}
