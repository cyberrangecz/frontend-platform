import {Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges} from '@angular/core';
import {
    ProgressLevelInfo,
    ProgressLevelVisualizationData,
    ProgressTraineeInfo,
    ProgressVisualizationData,
    TraineeSelectData
} from '@crczp/visualization-model';
import {TraineeViewEnum} from '../../types';
import {D3Service} from '../../../../common/d3-service/d3-service';
import {PROGRESS_CONFIG} from '../../../progress-config';
import {MatGridListModule} from '@angular/material/grid-list';
import {MatTooltipModule} from '@angular/material/tooltip';
import {CommonModule} from '@angular/common';
import {MatButtonModule} from '@angular/material/button';

@Component({
    selector: 'crczp-viz-hurdling-trainee-selection',
    templateUrl: './trainee-selection.component.html',
    styleUrls: ['./trainee-selection.component.css'],
    imports: [
        CommonModule,
        MatButtonModule,
        MatGridListModule,
        MatTooltipModule
    ]
})
export class TraineeSelectionComponent implements OnInit, OnChanges {
    @Input() visualizationData: ProgressVisualizationData;
    @Input() selectedTraineeView: TraineeViewEnum;

    @Input() filteredTrainees: ProgressTraineeInfo[] = [];
    @Output() filteredTraineesChange = new EventEmitter<ProgressTraineeInfo[]>(true);
    @Output() highlightTraineeChange = new EventEmitter<ProgressTraineeInfo>();

    public maxNumOfColumns = 10;
    public numberOfColumns = 10;
    public rowHeight = 100;
    public gridWidth;

    private d3;
    private rowWidth = 100;
    private minTileWidth = 80;
    private highlightedTrainee: ProgressTraineeInfo;
    private traineeSelectData: TraineeSelectData[] = [];

    constructor(d3: D3Service) {
        this.d3 = d3.getD3();
    }

    ngOnInit() {
        this.setTraineeColumnDistribution();
    }

    ngOnChanges(changes: SimpleChanges) {
        this.setTraineeColumnDistribution();
        if (!this.filteredTrainees) this.filteredTrainees = [];
        this.visualizationData.trainees.forEach((trainee) => {
            if (!this.traineeSelectData.find((p) => p.trainee.userRefId == trainee.userRefId)) {
                const res = new TraineeSelectData();
                res.trainee = trainee;
                res.isActive = false;
                res.isSelected = null;
                res.warnings = {
                    wrongAnswerWarning: false,
                    hintWarning: false,
                    tooLongWarning: false
                };
                res.fadedWarnings = {
                    wrongAnswerWarning: false,
                    hintWarning: false,
                    tooLongWarning: false
                };
                this.traineeSelectData.push(res);
                this.filteredTrainees.push(trainee);
            }
        });
        this.traineeSelectData.forEach((trainee) => {
            trainee.isActive = this.checkIfActive(trainee.trainee);
            if (trainee.isSelected == null && !this.checkIfActive(trainee.trainee)) {
                trainee.isSelected = null;
            } else if (trainee.isSelected == null && this.checkIfActive(trainee.trainee)) {
                trainee.isSelected = true;
            } else {
                trainee.isSelected = !!this.filteredTrainees.find((p) => p.userRefId === trainee.trainee.userRefId);
            }
            trainee.warnings = {
                wrongAnswerWarning: this.checkWrongAnswers(trainee.trainee),
                hintWarning: this.checkOutOfHints(trainee.trainee),
                tooLongWarning: this.checkLateTrainee(trainee.trainee)
            };

            if (
                !trainee.warnings.hintWarning &&
                !trainee.warnings.wrongAnswerWarning &&
                !trainee.warnings.tooLongWarning
            ) {
                trainee.fadedWarnings = {
                    wrongAnswerWarning: this.checkWrongAnswers(trainee.trainee),
                    hintWarning: this.checkOutOfHints(trainee.trainee),
                    tooLongWarning: this.checkLateTrainee(trainee.trainee)
                };
            }
            this.highlightTraineeChange.emit(this.highlightedTrainee);
        });

        if ('visualizationData' in changes) {
            this.filteredTraineesChange.emit(this.traineeSelectData.filter((p) => p.isSelected).map((p) => p.trainee));
        }
    }

    setTraineeColumnDistribution(): void {
        const fullWidth = (this.d3.select('.trainee-selection').node() as HTMLElement).offsetWidth * 0.8;
        this.maxNumOfColumns = Math.round(fullWidth / this.minTileWidth); // % 10; <- limit by 10 people max?
        this.numberOfColumns =
            this.visualizationData.trainees.length <= this.maxNumOfColumns
                ? this.visualizationData.trainees.length
                : this.maxNumOfColumns;
        const traineeNameLength = Math.max(...this.visualizationData.trainees.map((trainee) => trainee.name.length));
        this.gridWidth = this.rowWidth * this.numberOfColumns;
        this.rowHeight = traineeNameLength < 25 ? 100 : 150;
    }

    toggleTrainee(trainee: ProgressTraineeInfo): void {
        this.traineeSelectData.find((pp) => pp.trainee.userRefId == trainee.userRefId).isSelected =
            !this.traineeSelectData.find((pp) => pp.trainee.userRefId == trainee.userRefId).isSelected;
        this.filteredTraineesChange.emit(
            this.traineeSelectData.filter((pp) => pp.isSelected == true).map((pp) => pp.trainee)
        );
    }

    showAllTrainees(): void {
        this.traineeSelectData.forEach((selectionData) => {
            if (selectionData.isActive) {
                selectionData.isSelected = true;
            }
        });
        this.filteredTraineesChange.emit(
            this.traineeSelectData.filter((pp) => pp.isSelected == true).map((pp) => pp.trainee)
        );
    }

    hideAllTrainees(): void {
        this.traineeSelectData.forEach((selectionData) => {
            if (selectionData.isActive) {
                selectionData.isSelected = false;
            }
        });
        this.filteredTraineesChange.emit(
            this.traineeSelectData.filter((pp) => pp.isSelected == true).map((pp) => pp.trainee)
        );
    }

    checkIfSelected(trainee: ProgressTraineeInfo): boolean {
        return this.traineeSelectData.find((p) => p.trainee.userRefId == trainee.userRefId).isSelected;
    }

    checkIfActive(trainee: ProgressTraineeInfo): boolean {
        return !!this.visualizationData.traineeProgress.find(
            (traineeProgress) => traineeProgress.userRefId == trainee.userRefId
        );
    }

    buildWarningTooltip(trainee): string {
        let tooltipText = trainee.name;
        tooltipText += '\n( in level ' + this.getCurrentLevel(trainee).title + ')';
        let conjunction = '';
        if (this.checkLateTrainee(trainee)) {
            tooltipText += '\n is too long in the current level ';
            conjunction = 'and';
        }
        if (this.checkWrongAnswers(trainee)) {
            tooltipText += '\n' + conjunction + ' submitted many wrong answers ';
            conjunction = 'and';
        }
        if (this.checkOutOfHints(trainee)) tooltipText += '\n' + conjunction + ' had used all level hints';
        return tooltipText;
    }

    buildTraineeTooltip(trainee): string {
        let tooltipText = trainee.name;
        if (this.checkIfActive(trainee))
            tooltipText += this.getCurrentTraineeLevel(trainee)
                ? 'is in level: ' + this.getCurrentLevel(trainee).title
                : ' has finished';
        return tooltipText;
    }

    showTooltip(innerText, event): void {
        const tooltip = this.d3.select('.vis-participant-grid .viz-hurdling-trainee-tooltip');

        tooltip.style('visibility', 'visible').style('opacity', '0.8');

        const yOffset = 0;

        tooltip
            .html(innerText)
            .style('left', event.pageX + 10 + 'px')
            .style('top', event.pageY + yOffset + 'px');
    }

    getDisplayedTrainees(): ProgressTraineeInfo[] {
        return this.visualizationData.trainees.filter((trainee) => this.checkIfSelected(trainee));
    }

    checkLateTrainee(trainee: ProgressTraineeInfo): boolean {
        if (!this.checkIfActive(trainee)) return false;
        if (!this.getCurrentTraineeLevel(trainee)) return false;
        if (this.getCurrentLevel(trainee).estimatedDuration == 0) return false;
        return (
            this.visualizationData.currentTime >
            this.getCurrentTraineeLevel(trainee).startTime + this.getCurrentLevel(trainee).estimatedDuration * 60 * 1.5
        );
    }

    checkWrongAnswers(trainee: ProgressTraineeInfo): boolean {
        return this.getNumOfWrongAnswers(trainee) >= PROGRESS_CONFIG.wrongAnswerWarningThreshold;
    }

    checkOutOfHints(trainee: ProgressTraineeInfo): boolean {
        const levelHints = this.visualizationData.levels.find(
            (level) => level.id == this.getCurrentTraineeLevel(trainee)?.id
        )?.hints;
        if (!levelHints || levelHints.length == 0) {
            return false;
        }
        const levelHintsTaken =
            this.getCurrentTraineeLevel(trainee).hintsTaken == null
                ? []
                : this.getCurrentTraineeLevel(trainee).hintsTaken;
        return levelHints.length == levelHintsTaken.length;
    }

    getNumOfWrongAnswers(trainee: ProgressTraineeInfo): number {
        return this.getCurrentTraineeLevel(trainee)?.wrongAnswers_number;
    }

    getCurrentTraineeLevel(trainee: ProgressTraineeInfo): ProgressLevelVisualizationData {
        return this.visualizationData.traineeProgress
            .find((p) => p.userRefId == trainee.userRefId)
            ?.levels.find((level) => level.state != 'FINISHED');
    }

    getCurrentLevel(trainee: ProgressTraineeInfo): ProgressLevelInfo {
        return this.visualizationData.levels.find((level) => level.id == this.getCurrentTraineeLevel(trainee)?.id);
    }

    over(trainee: ProgressTraineeInfo): void {
        this.highlightedTrainee = trainee;
        this.highlightTraineeChange.emit(trainee);
    }

    out(): void {
        this.highlightedTrainee = null;
        this.highlightTraineeChange.emit(null);
    }

    hasWarnings(trainee: ProgressTraineeInfo): boolean {
        const traineeWarnings = this.traineeSelectData.find((p) => p.trainee.userRefId === trainee.userRefId).warnings;
        return traineeWarnings.hintWarning || traineeWarnings.tooLongWarning || traineeWarnings.wrongAnswerWarning;
    }

    allCurrentWarningsFaded(trainee: ProgressTraineeInfo): boolean {
        const warnings = this.traineeSelectData.find((p) => p.trainee.userRefId === trainee.userRefId).warnings;
        const fadedWarnings = this.traineeSelectData.find(
            (p) => p.trainee.userRefId === trainee.userRefId
        ).fadedWarnings;
        return (
            warnings.hintWarning == fadedWarnings.hintWarning &&
            warnings.tooLongWarning == fadedWarnings.tooLongWarning &&
            warnings.wrongAnswerWarning == fadedWarnings.wrongAnswerWarning
        );
    }

    fadeCurrentWarnings(trainee: ProgressTraineeInfo): void {
        const traineeData = this.traineeSelectData.find((p) => p.trainee.userRefId === trainee.userRefId);
        traineeData.fadedWarnings.tooLongWarning = this.checkLateTrainee(trainee);
        traineeData.fadedWarnings.hintWarning = this.checkOutOfHints(trainee);
        traineeData.fadedWarnings.wrongAnswerWarning = this.checkWrongAnswers(trainee);
    }
}
