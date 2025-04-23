import { VMInfo, VMStatus } from '@crczp/sandbox-model';
import { VMInfoDTO } from '../../DTOs/sandbox-instance/vm-info-dto';

export class VMInfoMapper {
    static fromDTO(dto: VMInfoDTO): VMInfo {
        const result = new VMInfo();
        result.name = dto.name;
        result.id = dto.id;
        result.status = this.statusResolver(dto.status);
        result.creationTime = new Date(dto.creation_time);
        result.updateTime = new Date(dto.update_time);
        result.imageId = dto.image_id;
        result.flavorName = dto.flavor_name;

        return result;
    }

    private static statusResolver(status: string): VMStatus {
        switch (status) {
            case 'ACTIVE':
                return VMStatus.ACTIVE;
            case 'REBOOT':
                return VMStatus.REBOOT;
            case 'SUSPENDED':
                return VMStatus.SUSPENDED;
        }
    }
}
