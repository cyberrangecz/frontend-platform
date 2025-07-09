import {AbstractDetectionEvent} from './detection-event';

/**
 * Class representing detection event of type Minimal Solve Time
 */
export class MinimalSolveTimeDetectionEvent extends AbstractDetectionEvent {
    minimalSolveTime!: number;
}
