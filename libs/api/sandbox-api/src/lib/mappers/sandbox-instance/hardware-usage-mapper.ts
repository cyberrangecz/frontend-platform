import { HardwareUsage } from '@crczp/sandbox-model';
import { HardwareUsageDTO } from '../../dto/sandbox-instance/hardware-usage-dto';

/**
 * @dynamic
 */
export class HardwareUsageMapper {
    static fromDTO(dto: HardwareUsageDTO): HardwareUsage {
        const request = new HardwareUsage();
        request.instances = dto.instances;
        request.network = dto.network;
        request.port = dto.port;
        request.ram = dto.ram;
        request.subnet = dto.subnet;
        request.vcpu = dto.vcpu;
        return request;
    }
}
