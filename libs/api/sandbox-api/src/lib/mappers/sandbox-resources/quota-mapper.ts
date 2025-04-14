import { QuotaDTO } from './../../DTOs/sandbox-resources/quota-dto';
import { Quota } from '@crczp/sandbox-model';

/**
 * @dynamic
 */
export class QuotaMapper {
    static fromDTO(dto: QuotaDTO): Quota {
        const quota = new Quota();
        quota.inUse = dto.in_use;
        quota.limit = dto.limit;
        return quota;
    }
}
