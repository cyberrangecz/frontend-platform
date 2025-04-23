import { DetectionEventDTO } from '../detection-event-dto';

export interface LocationSimilarityDetectionEventDTO extends DetectionEventDTO {
    ip_address: string;
    dns: string;
    is_address_deploy: boolean;
}
