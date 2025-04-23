export class RequestStageDTO {
    id: number;
    request_id: number;
    start: Date;
    end: Date;
    failed: boolean;
    error_message: string;
}
