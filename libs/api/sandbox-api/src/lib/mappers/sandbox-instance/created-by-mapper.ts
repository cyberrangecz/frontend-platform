import { CreatedBy } from '@crczp/sandbox-model';
import { CreatedByDTO } from '../../DTOs/sandbox-instance/created-by-dto';

/**
 * @dynamic
 */
export class CreatedByMapper {
    static fromDTO(dto: CreatedByDTO): CreatedBy {
        const request = new CreatedBy();
        request.id = dto.id;
        request.fullName = dto.full_name;
        request.mail = dto.mail;
        request.sub = dto.sub;
        return request;
    }
}
