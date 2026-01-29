import type {
    CustomSeriesRenderItemAPI,
    CustomSeriesRenderItemReturn,
} from 'echarts';
import { Utils } from '@crczp/utils';
import { ProgressEvent, ProgressEventType } from '@crczp/visualization-model';
import { SingleBarData } from '../../chart-utility-types';

/**
 * Event and level type icon rendering.
 *
 * Creates Material Icons in circular backgrounds with shadows/glow.
 * Separate z-index per event type for stacking.
 * Interactive events get hover effects.
 */

/**
 * Icon style data for event types.
 */
type EventTypeIconData = {
    iconName: string; // Material icon name
    iconColor: string; // Icon fill
    backgroundColor: string; // Circle background
    interactive: boolean; // Hover effects?
    zIndex: number; // Stacking order
};

/**
 * Event icon options + position.
 */
type EventIconOptions = EventTypeIconData & {
    timestamp: number;
};

/**
 * Level type icon constants.
 *
 * - barHeightPercentage: Icon 65% of bar height
 * - background: Semi-transparent light gray
 * - foreground: Purple-gray icon
 */
const LEVEL_ICON = {
    barHeightPercentage: 0.65,
    background: 'rgba(243,243,243,0.75)',
    foreground: '#8989b1',
} as const;

/**
 * Event icon constants.
 *
 * - barHeightPercentage: Icon 60% of bar height
 * - backgroundPadding: Extra padding around icon
 * - Shadows for depth and hover glow
 */
const EVENT_ICON = {
    barHeightPercentage: 0.6,
    backgroundPadding: 2,
    shadowColor: 'rgba(0, 0, 0, 0.2)',
    shadowOffsetY: 1,
    shadowOffsetX: 0,
} as const;

/**
 * Complete style map for all event types.
 *
 * Semantic colors:
 * - Green: Success (correct, start, login)
 * - Red: Failure (wrong, exit)
 * - Orange: Neutral (hint, solution, assessment)
 * - Purple: Completion
 *
 * Z-order: Hints(17) > Solution(18) > Wrong(16) > Correct(15) > Others
 * Ensures hints visible above wrong answer clusters.
 *
 * interactive: true = hover glow + tooltip
 */
const PROGRESS_EVENT_ICON_STYLE_MAP: Record<
    ProgressEventType,
    EventTypeIconData
> = {
    [ProgressEventType.AssessmentAnswers]: {
        iconName: 'question_answer',
        iconColor: '#f39c12', // Orange
        backgroundColor: '#fff3e0',
        interactive: true,
        zIndex: 12,
    },
    [ProgressEventType.CorrectFlag]: {
        iconName: 'check_circle',
        iconColor: '#27ae60', // Green
        backgroundColor: '#e8f5e9',
        interactive: false,
        zIndex: 15,
    },
    [ProgressEventType.WrongAnswer]: {
        iconName: 'cancel',
        iconColor: '#c0392b', // Red
        backgroundColor: '#ffebee',
        interactive: false,
        zIndex: 16,
    },
    [ProgressEventType.HintTaken]: {
        iconName: 'lightbulb',
        iconColor: '#f1c40f', // Yellow
        backgroundColor: '#fffde7',
        interactive: true,
        zIndex: 17,
    },
    [ProgressEventType.LevelCompleted]: {
        iconName: 'send',
        iconColor: '#8e44ad', // Purple
        backgroundColor: '#f3e5f5',
        interactive: false,
        zIndex: 10,
    },
    [ProgressEventType.LevelStarted]: {
        iconName: 'play_circle',
        iconColor: '#2980b9', // Blue
        backgroundColor: '#e3f2fd',
        interactive: false,
        zIndex: 10,
    },
    [ProgressEventType.SolutionDisplayed]: {
        iconName: 'visibility',
        iconColor: '#f38406', // Orange
        backgroundColor: '#eceff1',
        interactive: true,
        zIndex: 18,
    },
    [ProgressEventType.TrainingRunFinished]: {
        iconName: 'logout',
        iconColor: '#2c3e50', // Dark
        backgroundColor: '#eceff1',
        interactive: false,
        zIndex: 11,
    },
    [ProgressEventType.TrainingRunStarted]: {
        iconName: 'login',
        iconColor: '#27ae60', // Green
        backgroundColor: '#e8f5e9',
        interactive: false,
        zIndex: 11,
    },
    [ProgressEventType.TrainingExited]: {
        iconName: 'exit_to_app',
        iconColor: '#c0392b', // Red
        backgroundColor: '#ffebee',
        interactive: false,
        zIndex: 20,
    },
};

/**
 * Creates level type icon with circular background at the start of progress bar.
 * Uses Material Design icons corresponding to level types (Training, Assessment, etc.).
 * @param item - Bar data containing level type information
 * @param barHeight - Height of the bar for icon sizing
 * @param api - ECharts coordinate API for positioning
 * @returns ECharts render group with background circle and icon text
 */
function buildLevelTypeIcon(
    item: SingleBarData,
    barHeight: number,
    api: CustomSeriesRenderItemAPI,
): CustomSeriesRenderItemReturn {
    /**
     * Convert levelType enum to Material icon name.
     * e.g. Training → 'school', Assessment → 'quiz'
     */
    const iconName = Utils.LevelType.levelTypeToIcon(item.levelType);
    const startPoint = api.coord([item.startTime, item.traineeIndex]);

    const bgRadius = barHeight / 2;
    const bgStartX = startPoint[0];
    const iconY = startPoint[1];

    const iconSize = barHeight * LEVEL_ICON.barHeightPercentage;

    return {
        type: 'group',
        children: [
            {
                /**
                 * Custom path for left-half circle.
                 * Arc creates rounded right edge.
                 * +0.5 on y radius fixes ECharts arc rendering.
                 */
                type: 'path',
                shape: {
                    pathData: `M ${bgStartX} ${iconY - bgRadius} L ${bgStartX + bgRadius} ${iconY - bgRadius} A ${bgRadius} ${bgRadius + 0.5} 0 0 1 ${bgStartX + bgRadius} ${iconY + bgRadius} L ${bgStartX} ${iconY + bgRadius} Z`,
                },
                style: {
                    fill: LEVEL_ICON.background,
                },
            },
            {
                type: 'text',
                style: {
                    text: iconName,
                    x: bgStartX + bgRadius - 2, // Center with offset
                    y: iconY,
                    fontSize: iconSize,
                    fontFamily: 'Material Icons',
                    fill: LEVEL_ICON.foreground,
                    align: 'center',
                    verticalAlign: 'middle',
                },
            },
        ],
        silent: true, // No interaction
    };
}

/**
 * Creates interactive event icon with hover effects positioned at event timestamp.
 * Renders circular background with Material icon and glow effect on hover.
 * @param item - Bar data for positioning context
 * @param barHeight - Scaled bar height for icon sizing
 * @param api - ECharts coordinate API for positioning
 * @param progressEvent - Event data containing type, timestamp, and description
 * @returns Interactive ECharts render group with hover animations
 */
function buildEventIcon(
    item: SingleBarData,
    barHeight: number,
    api: CustomSeriesRenderItemAPI,
    progressEvent: ProgressEvent,
): CustomSeriesRenderItemReturn {
    /**
     * Get style from event type map + timestamp.
     */
    const progressEventOptions = mapToEventIconOptions(item, progressEvent);

    /**
     * Precise positioning using coord API.
     * x from timestamp, y from trainee index.
     */
    const x = api.coord([progressEventOptions.timestamp, 0])[0];
    const y = api.coord([0, item.traineeIndex])[1];

    const iconSize = barHeight * EVENT_ICON.barHeightPercentage;
    const backgroundRadius = iconSize / 2 + EVENT_ICON.backgroundPadding;

    return {
        type: 'group',
        children: [
            {
                type: 'circle',
                shape: {
                    cx: x,
                    cy: y,
                    r: backgroundRadius,
                },
                style: {
                    fill: progressEventOptions.backgroundColor,
                    shadowBlur: 0, // Resting state
                    shadowColor: EVENT_ICON.shadowColor,
                    shadowOffsetX: 0,
                    shadowOffsetY: 1,
                },
                /**
                 * Hover glow effect.
                 * Colored shadow matching icon.
                 */
                emphasis: {
                    style: {
                        shadowBlur: 12,
                        shadowColor: progressEventOptions.iconColor,
                        shadowOffsetX: EVENT_ICON.shadowOffsetX,
                        shadowOffsetY: EVENT_ICON.shadowOffsetY,
                    },
                },
            },
            {
                type: 'text',
                style: {
                    text: progressEventOptions.iconName,
                    x: x,
                    y: y,
                    fontSize: iconSize,
                    fontFamily: 'Material Icons',
                    fill: progressEventOptions.iconColor,
                    textAlign: 'center',
                    textVerticalAlign: 'middle',
                },
                /**
                 * Hover: Larger icon.
                 */
                emphasis: {
                    style: {
                        fill: progressEventOptions.iconColor,
                        fontSize: iconSize * 1.25,
                    },
                },
            },
        ],
        silent: false, // Enable hover
        cursor: 'pointer', // Hand cursor
    } as CustomSeriesRenderItemReturn;
}

/**
 * Returns z-index for event type to control visual stacking order.
 * Ensures important events (like hints) appear above others.
 * @param type - Progress event type enum
 * @returns Z-index value between 10 and 20
 */
function getEventIconZIndex(type: ProgressEventType): number {
    return PROGRESS_EVENT_ICON_STYLE_MAP[type].zIndex;
}

/**
 * Maps progress event to icon styling options including color, icon name, and z-index.
 * @param _bar - Bar data (unused, kept for API consistency)
 * @param event - Progress event with type and metadata
 * @returns Complete icon options including visual styling and positioning data
 */
function mapToEventIconOptions(
    _bar: SingleBarData,
    event: ProgressEvent,
): EventIconOptions {
    return {
        ...PROGRESS_EVENT_ICON_STYLE_MAP[event.type],
        timestamp: event.timestamp,
    };
}

export const EventIcons = {
    buildLevelTypeIcon,
    buildEventIcon,
    getEventIconZIndex,
} as const;
