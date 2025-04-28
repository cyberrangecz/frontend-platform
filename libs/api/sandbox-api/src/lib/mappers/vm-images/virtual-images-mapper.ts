/**
 * @dynamic
 */
import { VirtualImage } from '@crczp/sandbox-model';
import { VirtualImagesDTO } from '../../dto/vm-images/virtual-images-dto';
import { OwnerSpecifiedMapper } from './owner-specified-mapper';

export class VirtualImagesMapper {
    static fromDTOs(dtos: VirtualImagesDTO[]): VirtualImage[] {
        const result = dtos.map((dto) => VirtualImagesMapper.fromDTO(dto));
        return result;
    }

    static fromDTO(dto: VirtualImagesDTO): VirtualImage {
        const resources = new VirtualImage();
        resources.osDistro = dto.os_distro;
        resources.osType = dto.os_type;
        resources.name = dto.name;
        resources.diskFormat = dto.disk_format;
        resources.containerFormat = dto.container_format;
        resources.visibility = dto.visibility;
        resources.size = dto.size;
        resources.status = dto.status;
        resources.minRam = dto.min_ram;
        resources.minDisk = dto.min_disk;
        resources.createdAt = dto.created_at;
        resources.updatedAt = dto.updated_at;
        resources.tags = dto.tags;
        resources.defaultUser = dto.default_user;
        resources.ownerSpecified = OwnerSpecifiedMapper.fromDTO(dto.owner_specified);
        return resources;
    }
}
