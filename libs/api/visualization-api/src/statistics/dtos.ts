export class LevelStatisticsDto {
    level_id: number;
    level_title: string;
    hints_taken: number;
    wrong_answers: string[];
    duration: number;
    score: number;
}

export class ParticipantStatisticsDTO {
    user_ref_id: number;
    user_name: string;
    levels: LevelStatisticsDto[];
}

export class LevelAnswersStatisticsDTO {
    level_id: number;
    correct_answer: string;
    correct_answers_submitted: number;
    wrong_answers: string[];
}


export class TrainingInstanceStatisticsDTO {
    title: string;
    date: string;
    duration: number;
    instance_id: number;
    average_score: number;
    median_score: number;
    participants: ParticipantStatisticsDTO[];
    levels: LevelAnswersStatisticsDTO[];
}
