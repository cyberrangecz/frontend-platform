import { AbstractDetectionEvent } from './detection-event';

/**
 * Class representing detection event of type Time Proximity
 */
export class TimeProximityDetectionEvent extends AbstractDetectionEvent {
    threshold!: number;

}
