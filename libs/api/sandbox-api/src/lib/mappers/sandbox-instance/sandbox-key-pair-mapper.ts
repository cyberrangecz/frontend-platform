import { SandboxKeyPair } from '@crczp/sandbox-model';
import { SandboxKeyPairDTO } from '../../dto/sandbox-instance/sandbox-key-pair-dto';

export class SandboxKeyPairMapper {
    static fromDTO(dto: SandboxKeyPairDTO): SandboxKeyPair {
        const request = new SandboxKeyPair();
        request.private = dto.private;
        request.public = dto.public;
        return request;
    }
}
