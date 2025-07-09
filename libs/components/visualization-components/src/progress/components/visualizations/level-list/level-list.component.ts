import {Component, EventEmitter, Input, Output, ViewEncapsulation} from '@angular/core';
import {ProgressLevelInfo, ProgressTraineeInfo, ProgressVisualizationData} from '@crczp/visualization-model';
import {MatTooltipModule} from '@angular/material/tooltip';
import {CommonModule} from '@angular/common';

@Component({
    selector: 'crczp-viz-hurdling-level-list',
    templateUrl: './level-list.component.html',
    styleUrls: ['./level-list.component.css'],
    encapsulation: ViewEncapsulation.None,
    imports: [
        CommonModule,
        MatTooltipModule
    ]
})
export class LevelListComponent {
    @Input() visualizationData: ProgressVisualizationData;

    @Output() filteredTrainees = new EventEmitter<ProgressTraineeInfo[]>();
    @Output() traineeSort = new EventEmitter<ProgressLevelInfo>();

    constructor() {
    }

    getTraineesForLevel(levelId): ProgressTraineeInfo[] {
        const trainees: ProgressTraineeInfo[] = [];
        this.visualizationData.traineeProgress.forEach((traineeProgress) => {
            if (traineeProgress.levels.find((level) => level.id == levelId && level.startTime && !level.endTime)) {
                trainees.push(
                    this.visualizationData.trainees.find((trainee) => trainee.userRefId === traineeProgress.userRefId)
                );
            }
        });
        return trainees;
    }

    getFinishedTrainees() {
        const trainees: ProgressTraineeInfo[] = [];
        this.visualizationData.traineeProgress.forEach((traineeProgress) => {
            const finishedLevels = traineeProgress.levels.filter((level) => level.state == 'FINISHED');
            if (finishedLevels.length == this.visualizationData.levels.length) {
                trainees.push(
                    this.visualizationData.trainees.find((trainee) => trainee.userRefId == traineeProgress.userRefId)
                );
            }
        });
        return trainees;
    }

    isFinished(levelId: number): boolean {
        return (
            this.visualizationData.traineeProgress
                .map((traineeProgress) =>
                    traineeProgress.levels.filter((level) => level.id == levelId && level.state == 'FINISHED')
                )
                .reduce((accumulator, value) => accumulator.concat(value), []).length ==
            this.visualizationData.traineeProgress.length
        );
    }

    getLevelTooltip(level: ProgressLevelInfo) {
        if (level.answer) return this.formatLevelType(level) + '\nCorrect answer: ' + level.answer;
        return this.formatLevelType(level);
    }

    filterTrainees(trainees: ProgressTraineeInfo[], level: ProgressLevelInfo): void {
        this.filteredTrainees.emit(trainees);
        if (level) this.traineeSort.emit(level);
    }

    formatLevelType(level: ProgressLevelInfo) {
        let name = level.levelType.charAt(0).toUpperCase() + level.levelType.slice(1) + ' level ';
        name += level.levelType === 'training' ? this.getTrainingLevelNumber(level) : '';
        return name;
    }

    private getTrainingLevelNumber(level: ProgressLevelInfo): number {
        return this.visualizationData.levels.filter((level) => level.levelType == 'training').indexOf(level) + 1;
    }
}
