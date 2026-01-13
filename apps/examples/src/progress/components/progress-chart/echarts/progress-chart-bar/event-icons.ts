import { SingleBarData } from '../progress-chart';
import type { CustomSeriesRenderItemAPI, CustomSeriesRenderItemReturn } from 'echarts';
import { Utils } from '@crczp/utils';
import { ProgressEvent, ProgressEventType } from '@crczp/visualization-model';

export type EventTypeData = {
    /** Material Design icon name */
    iconName: string;
    iconColor: string;
    backgroundColor: string;
    iconSize: number;
    interactive: boolean;
    zIndex: number;
};

export type EventIconOptions = EventTypeData & {
    /** Timestamp for positioning the icon */
    timestamp: number;
};

const PROGRESS_EVENT_TYPE_DATA: Record<ProgressEventType, EventTypeData> = {
    [ProgressEventType.AssessmentAnswers]: {
        iconName: 'question_answer',
        iconColor: '#f39c12',
        backgroundColor: '#fff3e0',
        iconSize: 16,
        interactive: true,
        zIndex: 12,
    },
    [ProgressEventType.CorrectFlag]: {
        iconName: 'check_circle',
        iconColor: '#27ae60',
        backgroundColor: '#e8f5e9',
        iconSize: 16,
        interactive: false,
        zIndex: 15,
    },
    [ProgressEventType.WrongAnswer]: {
        iconName: 'cancel',
        iconColor: '#c0392b',
        backgroundColor: '#ffebee',
        iconSize: 16,
        interactive: false,
        zIndex: 16,
    },
    [ProgressEventType.HintTaken]: {
        iconName: 'lightbulb',
        iconColor: '#f1c40f',
        backgroundColor: '#fffde7',
        iconSize: 16,
        interactive: true,
        zIndex: 17,
    },
    [ProgressEventType.LevelCompleted]: {
        iconName: 'send',
        iconColor: '#8e44ad',
        backgroundColor: '#f3e5f5',
        iconSize: 16,
        interactive: false,
        zIndex: 10,
    },
    [ProgressEventType.LevelStarted]: {
        iconName: 'play_circle',
        iconColor: '#2980b9',
        backgroundColor: '#e3f2fd',
        iconSize: 16,
        interactive: false,
        zIndex: 10,
    },
    [ProgressEventType.SolutionDisplayed]: {
        iconName: 'visibility',
        iconColor: '#f38406',
        backgroundColor: '#eceff1',
        iconSize: 16,
        interactive: true,
        zIndex: 18,
    },
    [ProgressEventType.TrainingRunFinished]: {
        iconName: 'logout',
        iconColor: '#2c3e50',
        backgroundColor: '#eceff1',
        iconSize: 16,
        interactive: false,
        zIndex: 11,
    },
    [ProgressEventType.TrainingRunStarted]: {
        iconName: 'login',
        iconColor: '#27ae60',
        backgroundColor: '#e8f5e9',
        iconSize: 16,
        interactive: false,
        zIndex: 11,
    },
    [ProgressEventType.TrainingExited]: {
        iconName: 'exit_to_app',
        iconColor: '#c0392b',
        backgroundColor: '#ffebee',
        iconSize: 16,
        interactive: false,
        zIndex: 20,
    },
};

/**
 * Icon utilities for rendering Material Design icons in ECharts
 *
 * This utility renders icons with circular white backgrounds for visibility,
 * hover effects (glow), and optional tooltips. Icons use the Material Icons
 * font family and support customizable colors.
 *
 * Prerequisites:
 * - Material Icons font must be loaded in the HTML:
 *   <link href="https://fonts.googleapis.com/icon?family=Material+Icons" rel="stylesheet">
 */
export class EventIcons {
    /**
     * Render a level type icon at the start of a bar with D-shaped background
     * The D-shape is created from a rectangle on the left and a circle on the right
     *
     * @param item Bar data containing level information
     * @param barHeight Height of the bar for icon sizing
     * @param api ECharts render API
     * @returns Icon element with D-shaped background positioned at bar start
     */
    static buildLevelTypeIcon(
        item: SingleBarData,
        barHeight: number,
        api: CustomSeriesRenderItemAPI,
    ): CustomSeriesRenderItemReturn {
        const iconName = Utils.LevelType.levelTypeToIcon(item.levelType);
        const startPoint = api.coord([item.startTime, item.traineeIndex]);

        // Background dimensions based on barHeight
        const bgRadius = barHeight / 2;
        const bgStartX = startPoint[0];
        const iconY = startPoint[1];

        // Icon size calculated after background
        const iconSize = barHeight * 0.65;

        return {
            type: 'group',
            children: [
                // White semicircle background
                {
                    type: 'path',
                    shape: {
                        pathData: `M ${bgStartX} ${iconY - bgRadius} L ${bgStartX + bgRadius} ${iconY - bgRadius} A ${bgRadius} ${bgRadius + 0.5} 0 0 1 ${bgStartX + bgRadius} ${iconY + bgRadius} L ${bgStartX} ${iconY + bgRadius} Z`,
                    },
                    style: {
                        fill: 'rgba(243,243,243,0.98)',
                    },
                },
                // Icon text
                {
                    type: 'text',
                    style: {
                        text: iconName,
                        x: bgStartX + bgRadius - 2,
                        y: iconY,
                        fontSize: iconSize,
                        fontFamily: 'Material Icons',
                        fill: '#4f61c8',
                        align: 'center',
                        verticalAlign: 'middle',
                    },
                },
            ],
            silent: true,
        };
    }

    /**
     * Internal method to create the icon group with circular background and styling
     * Used for event icons with circular backgrounds
     */
    static buildEventIcon(
        api: CustomSeriesRenderItemAPI,
        singleBarData: SingleBarData,
        progressEvent: ProgressEvent,
        backgroundRadius = 10,
        iconSize = 16,
    ) {
        const progressEventOptions = EventIcons.mapToEventIconOptions(
            singleBarData,
            progressEvent,
        );

        const x = api.coord([progressEventOptions.timestamp, 0])[0];
        const y = api.coord([0, singleBarData.traineeIndex])[1];

        return {
            type: 'group',
            children: [
                // White circular background
                {
                    type: 'circle',
                    shape: {
                        cx: x,
                        cy: y,
                        r: backgroundRadius,
                    },
                    style: {
                        fill: progressEventOptions.backgroundColor,
                        shadowBlur: 0,
                        shadowColor: 'rgba(0, 0, 0, 0.2)',
                        shadowOffsetX: 0,
                        shadowOffsetY: 1,
                    },
                    // Hover effect - glow
                    emphasis: {
                        style: {
                            shadowBlur: 12,
                            shadowColor: progressEventOptions.iconColor,
                            shadowOffsetX: 0,
                            shadowOffsetY: 0,
                        },
                    },
                },
                // Icon text
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
                    emphasis: {
                        style: {
                            fill: progressEventOptions.iconColor,
                            fontSize: iconSize * 1.1,
                        },
                    },
                },
            ],
            silent: false,
            cursor: 'pointer',
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any;
    }

    static getEventIconZIndex(type: ProgressEventType) {
        return PROGRESS_EVENT_TYPE_DATA[type].zIndex;
    }

    private static mapToEventIconOptions(
        _bar: SingleBarData,
        event: ProgressEvent,
    ): EventIconOptions {
        const typeData = PROGRESS_EVENT_TYPE_DATA[event.type];
        return {
            ...typeData,
            timestamp: event.timestamp,
        };
    }
}
