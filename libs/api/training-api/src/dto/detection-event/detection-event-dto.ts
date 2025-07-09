export interface DetectionEventDTO {
    id: number;
    training_instance_id: number;
    cheating_detection_id: number;
    training_run_id: number;
    detection_event_type: DetectionEventDTO.AbstractDetectionEventTypeEnum;
    detected_at: Date;
    level_title: string;
    level_id: number;
    level_order: number;
    participant_count: number;
    participants: string;
}

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace DetectionEventDTO {
    export type AbstractDetectionEventTypeEnum =
        | 'ANSWER_SIMILARITY'
        | 'LOCATION_SIMILARITY'
        | 'TIME_PROXIMITY'
        | 'MINIMAL_SOLVE_TIME'
        | 'NO_COMMANDS'
        | 'FORBIDDEN_COMMANDS';
    export const AbstractDetectionEventTypeEnum = {
        ANSWER_SIMIlARITY: 'ANSWER_SIMILARITY' as AbstractDetectionEventTypeEnum,
        LOCATION_SIMILARITY: 'LOCATION_SIMILARITY' as AbstractDetectionEventTypeEnum,
        TIME_PROXIMITY: 'TIME_PROXIMITY' as AbstractDetectionEventTypeEnum,
        MINIMAL_SOLVE_TIME: 'MINIMAL_SOLVE_TIME' as AbstractDetectionEventTypeEnum,
        NO_COMMANDS: 'NO_COMMANDS' as AbstractDetectionEventTypeEnum,
        FORBIDDEN_COMMANDS: 'FORBIDDEN_COMMANDS' as AbstractDetectionEventTypeEnum,
    };
}
