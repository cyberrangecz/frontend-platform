import { UserRefDTO } from '@crczp/training-api';

export class CommandLineEntryDTO {
    timestamp_str: string;
    cmd: string;
}

export class ProgressEventDTO {
    type: string;
    timestamp: number;
    training_time: number;
    level: number;
    answer_content?: string;
    hint_id?: number;
    hint_title?: string;
    actual_score_in_level?: number;
}

export class ProgressHintDTO {
    hint_id: number;
    hint_title: string;
    hint_content: string;
}
export class ProgressLevelVisualizationDTO {
    id: number;
    state: string;
    start_time: number;
    end_time: number;
    hints_taken: number[];
    wrong_answers_number: number;
    events: ProgressEventDTO[];
}

export class TraineeProgressDTO {
    user_ref_id: number;
    training_run_id: number;
    levels: ProgressLevelVisualizationDTO[];
}

export class ProgressVisualizationDataDTO {
    start_time: number;
    estimated_end_time: number;
    current_time: number;
    players: UserRefDTO[];
    levels: ProgressLeveInfoDTO[];
    player_progress: TraineeProgressDTO[];
}

export class ProgressLeveInfoDTO {
    id: number;
    title: string;
    max_score: number;
    level_type: string;
    estimated_duration: number;
    order: number;
    content: string;
    answer: string;
    solution: string;
    solution_penalized: boolean;
    hints: ProgressHintDTO[];
}
