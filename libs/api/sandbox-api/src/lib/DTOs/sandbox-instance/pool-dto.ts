import { CreatedByDTO } from './created-by-dto';
import { HardwareUsageDTO } from './hardware-usage-dto';
import { SandboxDefinitionDTO } from '../sandbox-definition/sandbox-definition-dto';

export class PoolDTO {
    id!: number;
    comment?: string;
    definition!: SandboxDefinitionDTO;
    lock_id!: number;
    size!: number;
    max_size!: number;
    created_by!: CreatedByDTO;
    hardware_usage!: HardwareUsageDTO;
    visible!: boolean;
    send_emails!: boolean;
}
