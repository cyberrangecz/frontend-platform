import {QuotaDTO} from './quota-dto';

export class QuotasDTO {
    vcpu: QuotaDTO;
    ram: QuotaDTO;
    instances: QuotaDTO;
    network: QuotaDTO;
    subnet: QuotaDTO;
    port: QuotaDTO;
}
