export enum EventType {
    LevelStarted = 'started',
    TrainingRunStarted = 'begin',
    CorrectAnswerSubmitted = 'correct',
    WrongAnswerSubmitted = 'wrong',
    HintTaken = 'hint',
    SolutionDisplayed = 'solution',
    TrainingRunEnded = 'finish',
    OTHER = 'other',
}
