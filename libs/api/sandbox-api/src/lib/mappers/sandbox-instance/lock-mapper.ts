import { Lock } from '@crczp/sandbox-model';
import { LockDTO } from '../../dto/sandbox-instance/lock-dto';

/**
 * @dynamic
 */
export class LockMapper {
    static fromDTOs(dtos: LockDTO[]): Lock[] {
        return dtos.map((dto) => LockMapper.fromDTO(dto));
    }

    static fromDTO(dto: LockDTO): Lock {
        const request = new Lock();
        request.id = dto.id;
        request.poolId = dto.pool_id;
        return request;
    }
}
