import { OwnerSpecifiedDTO } from './owner-specified-dto';

export class VirtualImageDTO {
    os_distro: string;
    os_type: string;
    name: string;
    disk_format: string;
    container_format: string;
    visibility: string;
    size: number;
    status: string;
    min_ram: number;
    min_disk: number;
    created_at: Date;
    updated_at: Date;
    tags: string[];
    default_user: string;
    owner_specified?: OwnerSpecifiedDTO;
}
