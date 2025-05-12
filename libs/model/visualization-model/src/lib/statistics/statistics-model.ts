export class LevelAnswersStatistics {
    id: number;
    correctAnswer: string;
    correctAnswerSubmitted: number;
    wrongAnswers: string[];
}

export class LevelStatistics {
    id: number;
    title: string;
    hintsTaken: number;
    wrongAnswerSubmitted: string[];
    duration: number;
    score: number;
}

export class ParticipantStatistics {
    userRefId: number;
    userName: string;
    levels: LevelStatistics[];
    instanceId: number;
    totalDuration?: number;
    totalScore?: number;
    hintsTaken?: number;
}

export class TrainingInstanceStatistics {
    title: string;
    date: string;
    duration: number;
    instanceId: number;
    averageScore: number;
    medianScore: number;
    participants: ParticipantStatistics[];
    levelsAnswers: LevelAnswersStatistics[];
}
