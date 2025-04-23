export interface DetectionEventParticipantDTO {
    ip_address?: string;
    occurred_at: Date;
    participant_name: string;
    solved_in_time?: number;
    user_id: number;
    detection_event_id: number;
}
