/**
 * @dynamic
 */
import { OwnerSpecifiedDTO } from '../../DTOs/vm-images/owner-specified-dto';
import { OwnerSpecified } from '@crczp/sandbox-model';

export class OwnerSpecifiedMapper {
    static fromDTO(dto: OwnerSpecifiedDTO): OwnerSpecified {
        const resource = new OwnerSpecified();
        if (dto != null) {
            resource.guiAccess = dto.gui_access;
            resource.version = dto.version;
        } else {
            resource.guiAccess = false;
            resource.version = '';
        }
        return resource;
    }
}
