import { AttachmentList, AttachmentSummary, TrainingMaterial } from '@crczp/training-model';
import {
    AttachmentListDTO,
    AttachmentSummaryDTO,
    TrainingMaterialDTO,
} from '../../dto/training-definition/training-material-dto';

export class TrainingMaterialMapper {
    static toDTOs(materials: readonly TrainingMaterial[]): TrainingMaterialDTO[] {
        return materials.map(({ hash, fileName }) => ({ hash, file_name: fileName }));
    }

    static listFromDTO(dto: AttachmentListDTO): AttachmentList {
        return {
            materials: dto.materials.map((summary) => TrainingMaterialMapper.summaryFromDTO(summary)),
            budgetBytes: dto.budget_bytes,
            usedBytes: dto.used_bytes,
        };
    }

    static summaryFromDTO(dto: AttachmentSummaryDTO): AttachmentSummary {
        return {
            hash: dto.hash,
            fileName: dto.file_name,
            mediaType: dto.media_type,
            sizeBytes: dto.size_bytes,
            ...(dto.duration_seconds != null && { durationSeconds: dto.duration_seconds }),
            ...(dto.width != null && { width: dto.width }),
            ...(dto.height != null && { height: dto.height }),
            hasPoster: dto.has_poster,
        };
    }
}
