import {AbstractDetectionEventTypeEnum, LocationSimilarityDetectionEvent} from '@crczp/training-model';
import {
    LocationSimilarityDetectionEventDTO
} from '../../dto/detection-event/location-similarity/location_similarity-detection-event-dto';

export class LocationSimilarityDetectionEventMapper {
    static fromDTO(dto: LocationSimilarityDetectionEventDTO): LocationSimilarityDetectionEvent {
        const result = new LocationSimilarityDetectionEvent();
        result.ipAddress = dto.ip_address;
        result.dns = dto.dns;
        result.isAddressDeploy = dto.is_address_deploy;
        result.detectionEventType = AbstractDetectionEventTypeEnum.Location_similarity;
        return result;
    }
}
