import {CreatedBy} from '@crczp/sandbox-model';
import {CreatedByDTO} from '../../dto/sandbox-instance/created-by-dto';

/**
 * @dynamic
 */
export class CreatedByMapper {
    static fromDTO(dto: CreatedByDTO | null | undefined): CreatedBy {
        const request = new CreatedBy();
        if (dto == null) {
            request.id = 0;
            request.fullName = '—';
            request.mail = '';
            request.sub = '';
            return request;
        }
        request.id = dto.id;
        request.fullName = dto.full_name ?? '—';
        request.mail = dto.mail ?? '';
        request.sub = dto.sub ?? '';
        return request;
    }
}
