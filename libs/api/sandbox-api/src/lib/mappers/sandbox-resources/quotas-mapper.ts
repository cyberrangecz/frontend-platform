import { QuotaMapper } from './quota-mapper';
import { QuotasDTO } from './../../dto/sandbox-resources/quotas-dto';
import { Quotas } from '@crczp/sandbox-model';

/**
 * @dynamic
 */
export class QuotasMapper {
    static fromDTO(dto: QuotasDTO): Quotas {
        const quotas = new Quotas();
        quotas.instances = QuotaMapper.fromDTO(dto.instances);
        quotas.port = QuotaMapper.fromDTO(dto.port);
        quotas.network = QuotaMapper.fromDTO(dto.network);
        quotas.ram = QuotaMapper.fromDTO(dto.ram);
        quotas.subnet = QuotaMapper.fromDTO(dto.subnet);
        quotas.vcpu = QuotaMapper.fromDTO(dto.vcpu);
        this.setNames(quotas);
        this.setUnits(quotas);
        return quotas;
    }

    private static setNames(quotas: Quotas) {
        quotas.instances.name = 'Instances';
        quotas.port.name = 'Ports';
        quotas.network.name = 'Networks';
        quotas.ram.name = 'RAM';
        quotas.subnet.name = 'Subnet';
        quotas.vcpu.name = 'VCPUs';
    }

    private static setUnits(quotas: Quotas) {
        quotas.ram.units = 'GB';
    }
}
