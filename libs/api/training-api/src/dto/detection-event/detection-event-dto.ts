export interface DetectionEventDTO {
    id: number;
    training_instance_id: number;
    cheating_detection_id: number;
    training_run_id: number;
    detection_event_type: DetectionEventDTOAbstractDetectionEventTypeEnum;
    detected_at: Date;
    level_title: string;
    level_id: number;
    level_order: number;
    participant_count: number;
    participants: string;
}

export type DetectionEventDTOAbstractDetectionEventTypeEnum =
    | 'ANSWER_SIMILARITY'
    | 'LOCATION_SIMILARITY'
    | 'TIME_PROXIMITY'
    | 'MINIMAL_SOLVE_TIME'
    | 'NO_COMMANDS'
    | 'FORBIDDEN_COMMANDS';
export const DetectionEventDTOAbstractDetectionEventTypeEnum = {
    ANSWER_SIMIlARITY: 'ANSWER_SIMILARITY' as DetectionEventDTOAbstractDetectionEventTypeEnum,
    LOCATION_SIMILARITY: 'LOCATION_SIMILARITY' as DetectionEventDTOAbstractDetectionEventTypeEnum,
    TIME_PROXIMITY: 'TIME_PROXIMITY' as DetectionEventDTOAbstractDetectionEventTypeEnum,
    MINIMAL_SOLVE_TIME: 'MINIMAL_SOLVE_TIME' as DetectionEventDTOAbstractDetectionEventTypeEnum,
    NO_COMMANDS: 'NO_COMMANDS' as DetectionEventDTOAbstractDetectionEventTypeEnum,
    FORBIDDEN_COMMANDS: 'FORBIDDEN_COMMANDS' as DetectionEventDTOAbstractDetectionEventTypeEnum,
};
