import { expect, type Locator, type Page } from '@playwright/test';
import { BROWSER_KEYS } from '../../accounts';
import {
    SHARED_TRAINING_LEVEL_ORDER,
    SHARED_TRAINING_LEVEL_TITLES,
} from '../../scenario/shared-training-loader';
import { TRAINEE_PLAYS, WRONG_FLAG, WRONG_PASSKEY } from '../../scenario/trainee-plays';
import {
    expectedInstanceTotals,
    expectedResultOf,
    MAXIMUM_TOTAL_SCORE,
    type ExpectedResult,
} from './expected-results';

export type Checkpoint = (page: Page, label: string, shows?: string) => Promise<void>;

/** The label and the plain-English expectation of one chart. */
export interface ChartShows {
    label: string;
    shows: string;
}

/** Brings a chart into the viewport and records a visual check of it. */
export async function checkpointChart(
    page: Page,
    checkpoint: Checkpoint,
    chart: Locator,
    { label, shows }: ChartShows,
): Promise<void> {
    await chart.scrollIntoViewIfNeeded();
    await checkpoint(page, label, shows);
}

/** Records a visual check of each chart element, found by the selector it is keyed under, once it is visible. */
export async function checkpointCharts(
    page: Page,
    checkpoint: Checkpoint,
    charts: Record<string, ChartShows>,
): Promise<void> {
    for (const [selector, chart] of Object.entries(charts)) {
        const element = page.locator(selector);
        await expect(element).toBeVisible();
        await checkpointChart(page, checkpoint, element, chart);
    }
}

function percentOfMaximum(score: number): number {
    return Math.round((score / MAXIMUM_TOTAL_SCORE) * 100);
}

/** What the charts that depend on one run alone show, keyed by the chart element's selector. */
export function ownRunChartShows(result: ExpectedResult): Record<string, ChartShows> {
    const gainedPerLevel = result.levelScores.map((level) => `${level.title} ${level.score} of ${level.maximum}`);
    return {
        'crczp-cumulative-score-chart': {
            label: 'cumulative score chart',
            shows: `Cumulative score chart with an 'Actual score' line ending at ${result.totalScore} and a dashed 'Max possible' line ending at ${MAXIMUM_TOTAL_SCORE}; points gained per level: ${gainedPerLevel.join(', ')}`,
        },
        'crczp-time-vs-score-chart': {
            label: 'time vs score chart',
            shows: `Time vs score chart over the scored levels ${result.levelScores.map((level) => level.title).join(', ')} with 'Minutes spent' bars, a 'Points earned' line at ${result.levelScores.map((level) => level.score).join(', ')} and a dashed 'Max possible' line at ${result.levelScores.map((level) => level.maximum).join(', ')}`,
        },
        'crczp-event-timeline-chart': {
            label: 'event timeline chart',
            shows: `Event timeline with an Events lane and a Commands lane and one band per level; the Events lane holds ${result.wrongAnswers} wrong answers and ${result.hints} hints, the Commands lane holds no commands`,
        },
    };
}

/** What the charts that rank a run among the others show, keyed by the chart element's selector. */
export function standingChartShows(result: ExpectedResult): Record<string, ChartShows> {
    return {
        'crczp-overall-speed-vs-score': {
            label: 'overall speed vs score chart',
            shows: `Scatter of time (x) against score % (y) with a highlighted 'you' marker at ${result.totalScore} of ${MAXIMUM_TOTAL_SCORE} points (~${percentOfMaximum(result.totalScore)}%), ${BROWSER_KEYS.length - 1} peer points and dashed lines for the average time and the average score`,
        },
        'crczp-level-percentiles': {
            label: 'level percentiles chart',
            shows: `Percentile bars for 'score' and 'time' on the x-axis 'percentile' for each graded level: ${result.levelScores.map((level) => level.title).join(', ')}, every level completed`,
        },
        'crczp-assists-coverage': {
            label: 'hints and solutions chart',
            shows: `Hints & solutions taken: one section per training level (${[
                SHARED_TRAINING_LEVEL_TITLES.firstTraining,
                SHARED_TRAINING_LEVEL_TITLES.secondTraining,
                SHARED_TRAINING_LEVEL_TITLES.variantTraining,
            ].join(', ')}) with a coverage bar per hint and solution and ${result.hints + result.solutions} green checks on the assists this run opened`,
        },
    };
}

/** What the wrong answers chart of one run shows. */
export function wrongAnswersShows(result: ExpectedResult): ChartShows {
    return {
        label: 'wrong answers chart',
        shows: `Wrong answers chart with ${result.wrongAnswers} wrong submissions: ${result.wrongFlagAnswers} of '${WRONG_FLAG}-<n>' and ${result.wrongAnswers - result.wrongFlagAnswers} of '${WRONG_PASSKEY}'`,
    };
}

/** What the progress chart of the aggregated view shows for the given trainees. */
export function progressShows(traineeNames: readonly string[]): ChartShows {
    return {
        label: 'progress chart',
        shows: `Progress chart with one row per trainee (${traineeNames.join(', ')}), all finished, and one step per level: ${SHARED_TRAINING_LEVEL_ORDER.join(', ')}`,
    };
}

/** What the score attainment chart of the aggregated view shows. */
export function scoreAttainmentShows(): ChartShows {
    const scores = BROWSER_KEYS.map((browser) => expectedResultOf(browser).totalScore);
    return {
        label: 'score attainment chart',
        shows: `Score attainment bar chart with the x-axis 'Score band (% of max)' and the y-axis 'Trainees', placing ${scores.length} trainees with total scores ${scores.join(', ')} of ${MAXIMUM_TOTAL_SCORE} (~${scores.map(percentOfMaximum).join('%, ~')}%) into their bands`,
    };
}

/** What the difficulty distribution chart of the aggregated view shows. */
export function levelDifficultyShows(): ChartShows {
    const totals = expectedInstanceTotals();
    const solutionsOnSecond = BROWSER_KEYS.filter(
        (browser) => TRAINEE_PLAYS[browser].showsSolutionOnSecondTraining,
    ).length;
    return {
        label: 'difficulty distribution chart',
        shows: `Radar charts with the axes Wrong, Hints, Solution and Time, one per level, each started by ${BROWSER_KEYS.length} trainees: '${SHARED_TRAINING_LEVEL_TITLES.firstTraining}' ${totals.wrongFlagAnswers} wrong answers, ${totals.hints} hints, 0 solutions; '${SHARED_TRAINING_LEVEL_TITLES.secondTraining}' 0 wrong answers, 0 hints, ${solutionsOnSecond} solutions; '${SHARED_TRAINING_LEVEL_TITLES.variantTraining}' 0 wrong answers, 0 hints, ${BROWSER_KEYS.length} solutions`,
    };
}

/** What the top wrong answers chart of the aggregated view shows. */
export function topWrongAnswersShows(): ChartShows {
    return {
        label: 'top wrong answers chart',
        shows: `Top wrong answers chart with the answers '${WRONG_FLAG}-<n>' (${expectedInstanceTotals().wrongFlagAnswers} submissions on this level) and '${WRONG_PASSKEY}' (${BROWSER_KEYS.length} submissions on the access level), in a bar or pie presentation`,
    };
}

/** What the time vs expected chart of the aggregated view shows. */
export function timeVsExpectedShows(): ChartShows {
    return {
        label: 'time vs expected chart',
        shows: `Time vs expected chart with one column per training level, among them '${SHARED_TRAINING_LEVEL_TITLES.firstTraining}' and '${SHARED_TRAINING_LEVEL_TITLES.secondTraining}', plotting the ${BROWSER_KEYS.length} trainees' actual minus estimated minutes against a dashed 'estimate' line at 0`,
    };
}
