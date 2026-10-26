import { BROWSER_KEYS, type BrowserKey } from '../../accounts';
import {
    SHARED_TRAINING_ANSWERS,
    SHARED_TRAINING_LEVELS,
    SHARED_TRAINING_QUESTION_POINTS,
} from '../../scenario/shared-training-loader';
import { TRAINEE_PLAYS, type TraineePlay } from '../../scenario/trainee-plays';

/** Wrong submissions on the access level: the one incorrect passkey every trainee tries. */
const ACCESS_LEVEL_WRONG_ANSWERS = 1;

type TrainingLevel = typeof SHARED_TRAINING_LEVELS.firstTraining;
type AssessmentQuestion = (typeof SHARED_TRAINING_LEVELS.assessment.questions)[number];

/** What a trainee does on one training level of the shared training. */
interface TrainingLevelPlay {
    level: TrainingLevel;
    /** Hints taken, in hint order, before any solution is displayed. */
    hintsTaken: number;
    showsSolution: boolean;
}

/** The score one trainee reaches on one score-bearing level, against the level's maximum. */
export interface ExpectedLevelScore {
    title: string;
    score: number;
    maximum: number;
}

/** The outcome of one trainee's answer to one assessment question. */
export interface ExpectedQuestionScore {
    text: string;
    correct: boolean;
    score: number;
    maximum: number;
}

/** What the shared training's results show for one browser's trainee, derived from how it played. */
export interface ExpectedResult {
    hints: number;
    /** Wrong submissions of the whole run: the first training level's wrong flags plus the access level's wrong passkey. */
    wrongAnswers: number;
    /** Wrong flags submitted on the first training level. */
    wrongFlagAnswers: number;
    solutions: number;
    /** Every score-bearing level in play order: the training levels, then the assessment level. */
    levelScores: ExpectedLevelScore[];
    /** Every assessment question in question order. */
    questionScores: ExpectedQuestionScore[];
    trainingScore: number;
    assessmentScore: number;
    totalScore: number;
    correctAssessmentQuestions: number;
}

const ASSESSMENT_QUESTIONS = [...SHARED_TRAINING_LEVELS.assessment.questions].sort(
    (left, right) => left.order - right.order,
);

/** The highest assessment score a trainee can reach in the shared training. */
export const MAXIMUM_ASSESSMENT_SCORE = sumOf(SHARED_TRAINING_QUESTION_POINTS);

/** The highest total score a trainee can reach in the shared training. */
export const MAXIMUM_TOTAL_SCORE =
    [
        SHARED_TRAINING_LEVELS.firstTraining,
        SHARED_TRAINING_LEVELS.secondTraining,
        SHARED_TRAINING_LEVELS.variantTraining,
    ].reduce((sum, level) => sum + level.max_score, 0) + MAXIMUM_ASSESSMENT_SCORE;

function sumOf(values: readonly number[]): number {
    return values.reduce((sum, value) => sum + value, 0);
}

/** The training levels in play order with what the trainee of the play does on each. */
function trainingLevelPlaysOf(play: TraineePlay): TrainingLevelPlay[] {
    return [
        { level: SHARED_TRAINING_LEVELS.firstTraining, hintsTaken: play.hintsOnFirstTraining, showsSolution: false },
        {
            level: SHARED_TRAINING_LEVELS.secondTraining,
            hintsTaken: 0,
            showsSolution: play.showsSolutionOnSecondTraining,
        },
        { level: SHARED_TRAINING_LEVELS.variantTraining, hintsTaken: 0, showsSolution: true },
    ];
}

/**
 * The level's maximum score less its penalty. Each taken hint adds its hint penalty; displaying
 * the solution of a level that penalizes it sets the penalty to the whole maximum score. Wrong
 * answers cost nothing.
 */
function trainingLevelScore({ level, hintsTaken, showsSolution }: TrainingLevelPlay): number {
    const hintPenalty = sumOf(
        [...level.hints]
            .sort((left, right) => left.order - right.order)
            .slice(0, hintsTaken)
            .map((hint) => hint.hint_penalty),
    );
    const solutionPenalized = showsSolution && level.solution_penalized;
    return level.max_score - (solutionPenalized ? level.max_score : hintPenalty);
}

/**
 * Whether a test question counts as answered correctly: a free form answer must equal the text of
 * any of the question's choices, a multiple choice answer must select exactly the correct choices,
 * and an extended matching answer must pair every statement with its correct option.
 */
function isAnsweredCorrectly(question: AssessmentQuestion, answers: TraineePlay['assessment']): boolean {
    const choices = question.choices ?? [];
    switch (question.question_type) {
        case 'FFQ':
            return choices.some((choice) => choice.text === answers.freeForm);
        case 'MCQ': {
            const correctTexts = choices.filter((choice) => choice.correct).map((choice) => choice.text);
            return correctTexts.length === 1 && correctTexts.includes(answers.multipleChoice);
        }
        case 'EMI':
            return Object.entries(SHARED_TRAINING_ANSWERS.extendedMatching).every(
                ([statement, option]) => answers.extendedMatching[statement] === option,
            );
    }
}

/** A test question awards its points when answered correctly and deducts its penalty otherwise. */
function questionScore(question: AssessmentQuestion, answers: TraineePlay['assessment']): ExpectedQuestionScore {
    const correct = isAnsweredCorrectly(question, answers);
    return {
        text: question.text,
        correct,
        score: correct ? question.points : -question.penalty,
        maximum: question.points,
    };
}

/** Computes the result the shared training shows for the trainee of the given browser. */
export function expectedResultOf(browser: BrowserKey): ExpectedResult {
    const play = TRAINEE_PLAYS[browser];
    const trainingLevelPlays = trainingLevelPlaysOf(play);
    const trainingLevelScores = trainingLevelPlays.map(
        (levelPlay): ExpectedLevelScore => ({
            title: levelPlay.level.title,
            score: trainingLevelScore(levelPlay),
            maximum: levelPlay.level.max_score,
        }),
    );
    const questionScores = ASSESSMENT_QUESTIONS.map((question) => questionScore(question, play.assessment));
    const trainingScore = sumOf(trainingLevelScores.map((level) => level.score));
    const assessmentScore = sumOf(questionScores.map((question) => question.score));
    return {
        hints: play.hintsOnFirstTraining,
        wrongAnswers: play.wrongAnswersOnFirstTraining + ACCESS_LEVEL_WRONG_ANSWERS,
        wrongFlagAnswers: play.wrongAnswersOnFirstTraining,
        solutions: trainingLevelPlays.filter((levelPlay) => levelPlay.showsSolution).length,
        levelScores: [
            ...trainingLevelScores,
            {
                title: SHARED_TRAINING_LEVELS.assessment.title,
                score: assessmentScore,
                maximum: MAXIMUM_ASSESSMENT_SCORE,
            },
        ],
        questionScores,
        trainingScore,
        assessmentScore,
        totalScore: trainingScore + assessmentScore,
        correctAssessmentQuestions: questionScores.filter((question) => question.correct).length,
    };
}

/** The browsers ordered the way the scoreboard ranks their trainees: highest total score first. */
export function browsersByRank(): BrowserKey[] {
    return [...BROWSER_KEYS].sort(
        (left, right) => expectedResultOf(right).totalScore - expectedResultOf(left).totalScore,
    );
}

/** The sums of the three trainees' results, as the aggregated view shows them. */
export function expectedInstanceTotals(): {
    hints: number;
    wrongAnswers: number;
    wrongFlagAnswers: number;
    solutions: number;
    averageScore: number;
} {
    const results = BROWSER_KEYS.map(expectedResultOf);
    const sum = (pick: (result: ExpectedResult) => number): number =>
        results.reduce((total, result) => total + pick(result), 0);
    return {
        hints: sum((result) => result.hints),
        wrongAnswers: sum((result) => result.wrongAnswers),
        wrongFlagAnswers: sum((result) => result.wrongFlagAnswers),
        solutions: sum((result) => result.solutions),
        averageScore: sum((result) => result.totalScore) / results.length,
    };
}
