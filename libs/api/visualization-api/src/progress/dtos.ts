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
export class TraineeLevelProgressVisualizationDTO {
    id: number;
    state: string;
    start_time: number;
    end_time: number;
    hints_taken: number[];
    wrong_answers_number: number;
    events: ProgressEventDTO[];
}

export class TraineeProgressDTO {
    id: number;
    name: string;
    picture: string;
    training_run_id: number;
    levels: TraineeLevelProgressVisualizationDTO[];
}

export class ProgressVisualizationDataDTO {
    start_time: number;
    estimated_end_time: number;
    current_time: number;
    levels: ProgressLeveInfoDTO[];
    progress: TraineeProgressDTO[];
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
