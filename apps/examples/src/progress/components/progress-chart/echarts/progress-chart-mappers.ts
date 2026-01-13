import { CombinedProgressChartData } from '../progress-chart.component';
import { SingleBarData } from './progress-chart';
import { AbstractLevelTypeEnum } from '@crczp/training-model';
import { ProgressEventType } from '@crczp/visualization-model';

const SHOWN_EVENT_TYPES = {
    [ProgressEventType.WrongAnswer]: true,
    [ProgressEventType.CorrectFlag]: true,
    [ProgressEventType.HintTaken]: true,
    [ProgressEventType.LevelCompleted]: false,
    [ProgressEventType.SolutionDisplayed]: true,
    [ProgressEventType.TrainingRunFinished]: false,
};

function extractBarData(data: CombinedProgressChartData): SingleBarData[] {
    const chartData: SingleBarData[] = [];
    data.visualizationData.progress.forEach((trainee, traineeIndex) => {
        trainee.levels.forEach((level) => {
            const levelInfo = data.visualizationData.levels.find(
                (l) => l.id === level.id,
            );
            chartData.push({
                traineeIndex,
                traineeName: trainee.name,
                levelName: levelInfo?.title ?? `Level ${level.id}`,
                levelId: level.id,
                levelType:
                    levelInfo?.levelType ?? AbstractLevelTypeEnum.Training,
                startTime: level.startTime,
                endTime:
                    level.state === 'RUNNING'
                        ? data.visualizationData.currentTime
                        : level.endTime,
                estimatedEndTime:
                    level.state === 'RUNNING'
                        ? level.startTime +
                          (levelInfo?.estimatedDuration ?? 0) * 60 * 1000
                        : undefined,
                state: level.state,
                score: level.score,
                events: level.events.filter(
                    (event) => SHOWN_EVENT_TYPES[event.type],
                ),
                isHighlighted:
                    level.id === data.auxiliaryData.highlightedLevelIndex,
                isOtherHighlighted:
                    data.auxiliaryData.highlightedLevelIndex !== null &&
                    level.id !== data.auxiliaryData.highlightedLevelIndex,
            });
        });
    });

    return chartData;
}

function extractTraineeNames(data: CombinedProgressChartData): string[] {
    return data.visualizationData.progress.map((trainee) => trainee.name);
}

export const ProgressChartMappers = {
    extractBarData,
    extractTraineeNames,
};
