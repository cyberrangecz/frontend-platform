export enum CommandEventsModel {
    LevelStarted = 'started',
    TrainingRunStarted = 'begin',
    CorrectAnswerSubmitted = 'correct',
    WrongAnswerSubmitted = 'wrong',
    HintTaken = 'hint',
    SolutionDisplayed = 'solution',
    TrainingRunEnded = 'finish',
    OTHER = 'other',
}

export class CommandEvent {
    time!: number;
    type!: CommandEventsModel;
    level!: number;
    commands!: Array<string>;
    points!: number;
}
