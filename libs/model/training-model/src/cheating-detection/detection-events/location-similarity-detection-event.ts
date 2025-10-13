import {AbstractDetectionEvent} from './detection-event';

/**
 * Class representing detection event of type Location Similarity
 */
export class LocationSimilarityDetectionEvent extends AbstractDetectionEvent {
    ipAddress!: string;
    dns!: string;
    isAddressDeploy!: boolean;
}
