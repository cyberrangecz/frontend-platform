import {
    CorrectFlagEvent,
    HintTakenEvent,
    LevelCompletedEvent,
    LevelStartedEvent,
    ProgressEvent,
    ProgressLevelInfo,
    ProgressLevelVisualizationData,
    ProgressVisualizationData,
    SolutionDisplayedEvent,
    TraineeProgressData,
    WrongAnswerEvent
} from '@crczp/visualization-model';
import { AbstractLevelTypeEnum } from '@crczp/training-model';

/**
 * Seeded random number generator using a simple LCG (Linear Congruential Generator)
 */
class SeededRandom {
    private seed: number;

    constructor(seed: number) {
        this.seed = seed % 2147483647;
        if (this.seed <= 0) this.seed += 2147483646;
    }

    /**
     * Returns a random number between 0 and 1
     */
    next(): number {
        this.seed = (this.seed * 16807) % 2147483647;
        return (this.seed - 1) / 2147483646;
    }

    /**
     * Returns a random integer between min (inclusive) and max (inclusive)
     */
    nextInt(min: number, max: number): number {
        return Math.floor(this.next() * (max - min + 1)) + min;
    }

    /**
     * Returns a random number between min and max
     */
    nextFloat(min: number, max: number): number {
        return this.next() * (max - min) + min;
    }

    /**
     * Returns true with given probability (0-1)
     */
    nextBool(probability = 0.5): boolean {
        return this.next() < probability;
    }

    /**
     * Shuffle array in place
     */
    shuffle<T>(array: T[]): T[] {
        const result = [...array];
        for (let i = result.length - 1; i > 0; i--) {
            const j = this.nextInt(0, i);
            [result[i], result[j]] = [result[j], result[i]];
        }
        return result;
    }

    /**
     * Generate random value from exponential distribution
     * @param lambda Rate parameter (1/mean)
     */
    exponential(lambda: number): number {
        return -Math.log(1 - this.next()) / lambda;
    }
}

interface TrainingDefinition {
    title: string;
    description: string;
    estimated_duration: number;
    levels: LevelDefinition[];
}

interface LevelDefinition {
    title: string;
    level_type: string;
    order: number;
    estimated_duration: number;
    max_score?: number;
    hints?: HintDefinition[];
    answer_variable_name?: string;
    incorrect_answer_limit?: number;
    solution_penalized?: boolean;
}

interface HintDefinition {
    title: string;
    content: string;
    hint_penalty?: number;
    order: number;
}

interface GeneratorOptions {
    seed: number;
    numTrainees?: number;
    trainingStartTime?: number;
    startDelayWindowMinutes?: number;
    completionRate?: number; // 0-1, percentage of trainees who complete
}

const DEFAULT_OPTIONS: Partial<GeneratorOptions> = {
    numTrainees: 10,
    trainingStartTime: Date.now() - 3600000, // 1 hour ago
    startDelayWindowMinutes: 5,
    completionRate: 0.6,
};

const SAMPLE_NAMES = [
    'Alice Johnson',
    'Bob Smith',
    'Charlie Davis',
    'Diana Martinez',
    'Ethan Brown',
    'Fiona Wilson',
    'George Taylor',
    'Hannah Anderson',
    'Isaac Thomas',
    'Julia Jackson',
    'Kevin White',
    'Laura Harris',
    'Michael Clark',
    'Nina Lewis',
    'Oscar Robinson',
    'Paula Walker',
    'Quinn Hall',
    'Rachel Allen',
    'Samuel Young',
    'Tina King',
];

const SAMPLE_WRONG_ANSWERS = [
    'password',
    '123456',
    'admin',
    'root',
    'flag{test}',
    '8080',
    '3389',
    '21',
    'wrong_answer',
    'guess123',
];

/**
 * Generate a seeded random dataset for training progress visualization
 */
export function generateTrainingProgressData(
    trainingDefinition: TrainingDefinition,
    options: GeneratorOptions,
): ProgressVisualizationData {
    const opts = { ...DEFAULT_OPTIONS, ...options };
    const rng = new SeededRandom(options.seed);
    const levels = parseLevels(trainingDefinition);

    const trainingStartTime = opts.trainingStartTime ?? Date.now() - 3600000;
    const numTrainees = opts.numTrainees ?? 10;

    const data: ProgressVisualizationData = {
        startTime: trainingStartTime,
        currentTime: Date.now(),
        estimatedEndTime:
            trainingStartTime +
            trainingDefinition.estimated_duration * 60 * 1000,
        levels,
        progress: [],
    };

    // Generate progress for each trainee
    for (let i = 0; i < numTrainees; i++) {
        const traineeProgress = generateTraineeProgress(
            i,
            levels,
            trainingStartTime,
            data.currentTime,
            rng,
        );
        data.progress.push(traineeProgress);
    }

    return data;
}

/**
 * Generate progress data for a single trainee
 */
function generateTraineeProgress(
    traineeIndex: number,
    levels: ProgressLevelInfo[],
    trainingStartTime: number,
    currentTime: number,
    rng: SeededRandom,
): TraineeProgressData {
    const traineeName =
        SAMPLE_NAMES[traineeIndex % SAMPLE_NAMES.length] +
        (traineeIndex >= SAMPLE_NAMES.length
            ? ` ${Math.floor(traineeIndex / SAMPLE_NAMES.length) + 1}`
            : '');

    const trainee: TraineeProgressData = {
        id: traineeIndex + 1,
        name: traineeName,
        picture: `https://i.pravatar.cc/150?img=${traineeIndex + 1}`,
        trainingRunId: 1000 + traineeIndex,
        levels: [],
    };

    // Randomly pick which level the trainee is currently on (0 to levels.length-1)
    const currentLevelIndex = rng.nextInt(0, levels.length - 1);

    // Generate backwards from current time
    let currentEndTime = currentTime;

    // Generate levels from current level backwards to level 0
    for (let levelIdx = currentLevelIndex; levelIdx >= 0; levelIdx--) {
        const level = levels[levelIdx];
        const isCurrentLevel = levelIdx === currentLevelIndex;
        const isCompleted = !isCurrentLevel;

        let duration: number;

        if (isCurrentLevel) {
            // Current level: random duration between 1 minute and 2x estimated time
            const estimatedMs =
                (level.estimatedDuration > 0 ? level.estimatedDuration : 5) *
                60 *
                1000;
            const minDuration = 60 * 1000; // 1 minute
            const maxDuration = estimatedMs * 2;
            duration = rng.nextFloat(minDuration, maxDuration);
        } else {
            // Completed levels: use exponential distribution with estimated duration as mean
            const estimatedMs =
                (level.estimatedDuration > 0 ? level.estimatedDuration : 5) *
                60 *
                1000;
            const lambda = 1 / estimatedMs;
            duration = rng.exponential(lambda);
            // Cap duration to reasonable bounds (20% to 300% of estimated)
            duration = Math.max(
                estimatedMs * 0.2,
                Math.min(duration, estimatedMs * 3),
            );
        }

        const levelEndTime = currentEndTime;
        const levelStartTime = levelEndTime - duration;

        // Generate level data
        const levelData = generateLevelData(
            level,
            trainee.id,
            traineeName,
            levelStartTime,
            levelEndTime,
            isCompleted,
            trainingStartTime,
            currentTime,
            rng,
        );

        // Insert at beginning since we're going backwards
        trainee.levels.unshift(levelData);

        // Move backwards with small buffer between levels (200-500ms)
        currentEndTime = levelStartTime - (200 + rng.nextInt(0, 300));
    }

    return trainee;
}

/**
 * Generate data for a single level
 */
function generateLevelData(
    level: ProgressLevelInfo,
    traineeId: number,
    traineeName: string,
    startTime: number,
    endTime: number,
    isCompleted: boolean,
    trainingStartTime: number,
    currentTime: number,
    rng: SeededRandom,
): ProgressLevelVisualizationData {
    const events: ProgressEvent[] = [];
    const hintsTaken: number[] = [];
    let wrongAnswersCount = 0;
    let score = 0;

    const duration = endTime - startTime;
    const canHaveHints = level.levelType === AbstractLevelTypeEnum.Training;
    const canHaveFlags =
        level.levelType === AbstractLevelTypeEnum.Training ||
        level.levelType === AbstractLevelTypeEnum.Access;

    // Level Started Event
    const levelStartedEvent = new LevelStartedEvent();
    createBaseEvent(
        levelStartedEvent,
        startTime,
        trainingStartTime,
        level,
        traineeId,
        traineeName,
    );
    events.push(levelStartedEvent);

    let eventTime = startTime + 1000; // Start events 1s after level start

    // Generate wrong answers (if applicable)
    if (canHaveFlags && isCompleted) {
        const numWrongAnswers = rng.nextInt(0, 3);
        for (let i = 0; i < numWrongAnswers; i++) {
            const wrongTime = eventTime + rng.nextFloat(0, duration * 0.5);
            const wrongAnswer =
                SAMPLE_WRONG_ANSWERS[
                    rng.nextInt(0, SAMPLE_WRONG_ANSWERS.length - 1)
                ];
            const wrongEvent = new WrongAnswerEvent(wrongAnswer);
            createBaseEvent(
                wrongEvent,
                wrongTime,
                trainingStartTime,
                level,
                traineeId,
                traineeName,
            );
            events.push(wrongEvent);
            wrongAnswersCount++;
            eventTime = wrongTime + 1000;
        }
    }

    // Generate hints taken (if applicable)
    if (canHaveHints && level.hints.length > 0) {
        const takesHints = rng.nextBool(0.6); // 60% chance to take hints
        if (takesHints) {
            const numHints = rng.nextInt(0, Math.min(level.hints.length, 3));
            const shuffledHints = rng.shuffle(level.hints);
            for (let i = 0; i < numHints; i++) {
                const hint = shuffledHints[i];
                const hintTime = eventTime + rng.nextFloat(0, duration * 0.6);
                const hintEvent = new HintTakenEvent(hint.id, hint.title);
                createBaseEvent(
                    hintEvent,
                    hintTime,
                    trainingStartTime,
                    level,
                    traineeId,
                    traineeName,
                );
                events.push(hintEvent);
                hintsTaken.push(hint.id);
                eventTime = hintTime + 500;
            }
        }
    }

    // If completed, add correct flag and possibly solution
    let correctFlagTime = 0;
    if (isCompleted) {
        if (canHaveFlags) {
            correctFlagTime = endTime - rng.nextFloat(1000, 5000); // 1-5s before end
            const correctFlagEvent = new CorrectFlagEvent('TheCorrectFlag');
            createBaseEvent(
                correctFlagEvent,
                correctFlagTime,
                trainingStartTime,
                level,
                traineeId,
                traineeName,
            );
            events.push(correctFlagEvent);

            // Calculate score
            score = level.maxScore;
            if (level.solutionPenalized) {
                score -= hintsTaken.length * 10;
            }
            score -= wrongAnswersCount * 5;
            score = Math.max(0, score);
        } else {
            // Info/Assessment levels get full score
            score = level.maxScore;
        }

        // Some trainees view solution (30% chance, can be before or after completion)
        if (canHaveHints && rng.nextBool(0.3)) {
            const beforeCompletion = rng.nextBool(0.5);
            const solutionTime = beforeCompletion
                ? correctFlagTime - rng.nextFloat(2000, 10000)
                : endTime + rng.nextFloat(1000, 5000);

            if (solutionTime < currentTime && solutionTime > startTime) {
                const solutionEvent = new SolutionDisplayedEvent();
                createBaseEvent(
                    solutionEvent,
                    solutionTime,
                    trainingStartTime,
                    level,
                    traineeId,
                    traineeName,
                );
                events.push(solutionEvent);
                if (level.solutionPenalized && beforeCompletion) {
                    score = Math.floor(score * 0.5); // 50% penalty
                }
            }
        }

        // Level Completed Event
        const levelCompletedEvent = new LevelCompletedEvent();
        createBaseEvent(
            levelCompletedEvent,
            endTime,
            trainingStartTime,
            level,
            traineeId,
            traineeName,
        );
        events.push(levelCompletedEvent);
    }

    // Sort events by timestamp
    events.sort((a, b) => a.timestamp - b.timestamp);

    return {
        id: level.id,
        state: isCompleted ? 'COMPLETED' : 'RUNNING',
        startTime,
        endTime: isCompleted ? endTime : 0,
        hintsTaken,
        wrongAnswers_number: wrongAnswersCount,
        events,
        score,
    } satisfies ProgressLevelVisualizationData;
}

/**
 * Create a progress event
 */
function createBaseEvent(
    event: ProgressEvent,
    timestamp: number,
    trainingStartTime: number,
    level: ProgressLevelInfo,
    traineeId: number,
    traineeName: string,
): void {
    event.timestamp = timestamp;
    event.trainingTime = timestamp - trainingStartTime;
    event.levelId = level.id;
    event.levelNumber = level.order;
    event.traineeId = traineeId;
    event.traineeName = traineeName;
}

/**
 * Parse levels from training definition
 */
function parseLevels(
    trainingDefinition: TrainingDefinition,
): ProgressLevelInfo[] {
    return trainingDefinition.levels.map((level, index) => {
        const levelType = mapLevelType(level.level_type);

        return {
            id: index,
            title: level.title,
            maxScore: level.max_score || 0,
            levelType,
            estimatedDuration: level.estimated_duration,
            order: level.order,
            content: '',
            answer: '',
            solution: '',
            solutionPenalized: level.solution_penalized || false,
            hints:
                level.hints?.map((hint, hintIndex) => ({
                    id: hintIndex,
                    title: hint.title,
                    content: hint.content,
                })) || [],
        };
    });
}

/**
 * Map level type string to enum
 */
function mapLevelType(levelType: string): AbstractLevelTypeEnum {
    switch (levelType.toUpperCase()) {
        case 'INFO_LEVEL':
        case 'INFO':
            return AbstractLevelTypeEnum.Info;
        case 'ACCESS_LEVEL':
        case 'ACCESS':
            return AbstractLevelTypeEnum.Access;
        case 'TRAINING_LEVEL':
        case 'TRAINING':
            return AbstractLevelTypeEnum.Training;
        case 'ASSESSMENT_LEVEL':
        case 'ASSESSMENT':
            return AbstractLevelTypeEnum.Assessment;
        default:
            return AbstractLevelTypeEnum.Training;
    }
}

/**
 * Generate a dataset with default demo training
 */
export function generateDemoDataset(
    seed: number,
    numTrainees = 10,
): ProgressVisualizationData {
    // This would typically load from training-definition.json
    // For now, returning a placeholder - integrate with actual JSON loading as needed
    const trainingDef: TrainingDefinition = {
        title: 'Demo Training',
        description: 'Demo',
        estimated_duration: 45,
        levels: [
            {
                title: 'Info',
                level_type: 'INFO_LEVEL',
                order: 0,
                estimated_duration: 4,
            },
            {
                title: 'Get Access',
                level_type: 'ACCESS_LEVEL',
                order: 1,
                estimated_duration: 6,
                max_score: 0,
            },
            {
                title: 'Finding open ports',
                level_type: 'TRAINING_LEVEL',
                order: 2,
                estimated_duration: 10,
                max_score: 50,
                solution_penalized: true,
                hints: [
                    {
                        title: 'Tool to find open ports',
                        content: 'Use nmap',
                        hint_penalty: 20,
                        order: 0,
                    },
                ],
            },
            {
                title: 'Connecting via Telnet',
                level_type: 'TRAINING_LEVEL',
                order: 3,
                estimated_duration: 10,
                max_score: 100,
                solution_penalized: true,
                hints: [
                    {
                        title: 'Tool for password attacks',
                        content: 'Use hydra or medusa',
                        hint_penalty: 20,
                        order: 0,
                    },
                    {
                        title: 'Connecting using telnet',
                        content: 'Use telnet command',
                        hint_penalty: 10,
                        order: 1,
                    },
                ],
            },
            {
                title: 'Privilege Escalation',
                level_type: 'TRAINING_LEVEL',
                order: 4,
                estimated_duration: 15,
                max_score: 100,
                solution_penalized: true,
                hints: [
                    {
                        title: 'Using the privilege escalation',
                        content: 'Check sudo configuration',
                        hint_penalty: 60,
                        order: 0,
                    },
                ],
            },
            {
                title: 'Test Example',
                level_type: 'ASSESSMENT_LEVEL',
                order: 5,
                estimated_duration: 5,
                max_score: 300,
            },
            {
                title: 'Assessment Example',
                level_type: 'ASSESSMENT_LEVEL',
                order: 6,
                estimated_duration: 5,
                max_score: 0,
            },
        ],
    };

    return generateTrainingProgressData(trainingDef, {
        seed,
        numTrainees,
        trainingStartTime: Date.now() - 3600000,
        startDelayWindowMinutes: 5,
        completionRate: 0.6,
    });
}
