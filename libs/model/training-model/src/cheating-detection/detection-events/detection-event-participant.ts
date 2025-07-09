/**
 * Class representing participant of a detection event
 */
export class DetectionEventParticipant {
    ipAddress?: string;
    occurredAt!: Date;
    participantName!: string;
    solvedInTime?: number;
    userId!: number;
    detectionEventId!: number;
}
