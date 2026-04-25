import { Hint, Level, TrainingDefinition, TrainingInstance, TrainingRun, TrainingUser } from '@crczp/training-model';
import { Pool } from '@crczp/sandbox-model';

export interface PlatformEvent {
    id: string;
    type: string;
    timestamp: number;
}

export interface TrainingEvent extends PlatformEvent {
    sandbox_id: string;

    pool_id: number;
    get pool(): Pool;

    training_definition_id: number;
    get trainingDefinition(): TrainingDefinition;

    training_instance_id: number;
    get trainingInstance(): TrainingInstance;

    training_run_id: number;
    get trainingRun(): TrainingRun;

    level_id: number;
    get level(): Level;

    user_ref_id: number;
    get userRef(): TrainingUser;

    training_time: number;
    level_order: number;

    actual_score_in_level: number;
    total_training_level_score: number;
    total_assessment_level_score: number;
}

export enum ProgressEventType {
    TRAINING_RUN_STARTED = 'TrainingRunStarted',
    TRAINING_RUN_RESUMED = 'TrainingRunResumed',
    TRAINING_RUN_ENDED = 'TrainingRunEnded',
    LEVEL_STARTED = 'LevelStarted',
    LEVEL_COMPLETED = 'LevelCompleted',
    CORRECT_ANSWER_SUBMITTED = 'CorrectAnswerSubmitted',
    WRONG_ANSWER_SUBMITTED = 'WrongAnswerSubmitted',
    HINT_TAKEN = 'HintTaken',
    SOLUTION_DISPLAYED = 'SolutionDisplayed',
    ASSESSMENT_ANSWERS = 'AssessmentAnswers',
}

export type LevelType = 'INFO' | 'ACCESS' | 'TRAINING' | 'ASSESSMENT';

export type TrainingRunStartedEvent = TrainingEvent;

export type TrainingRunResumedEvent = TrainingEvent;

export interface TrainingRunEndedEvent extends TrainingEvent {
    start_time: number;
    end_time: number;
}

export interface LevelStartedEvent extends TrainingEvent {
    level_type: LevelType;
    level_title: string;
    max_score: number;
}

export interface LevelCompletedEvent extends TrainingEvent {
    level_type: LevelType;
}

export interface CorrectAnswerSubmittedEvent extends TrainingEvent {
    answer_content: string;
}

export interface WrongAnswerSubmittedEvent extends TrainingEvent {
    answer_content: string;
    count: number;
}

export interface HintTakenEvent extends TrainingEvent {
    hint_id: number;
    get hint(): Hint;
    hint_title: string;
    hint_penalty_points: number;
}

export interface SolutionDisplayedEvent extends TrainingEvent {
    penalty_points: number;
}

export interface AssessmentAnswersEvent extends TrainingEvent {
    answers: Record<string, unknown>;
}

export interface CommandEvent extends PlatformEvent {
    timestamp_str: string;
    ip: string;
    sandbox_id: string;

    pool_id: number;
    get pool(): Pool;

    hostname: string;
    username: string;
    wd: string;
    cmd_type: string;
    cmd: string;
}
