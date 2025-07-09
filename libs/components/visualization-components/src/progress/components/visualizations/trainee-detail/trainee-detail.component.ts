import { AfterViewInit, Component, EventEmitter, Input, OnChanges, Output, inject } from '@angular/core';
import {take} from 'rxjs/operators';
import {
    CommandLineEntry,
    HintTakenEvent,
    LevelTimelineData,
    ProgressHint,
    ProgressLevelInfo,
    ProgressLevelVisualizationData,
    ProgressTraineeInfo,
    ProgressVisualizationData,
    TrainingTimeOverviewData,
    WrongAnswerData,
    WrongAnswerEvent
} from '@crczp/visualization-model';
import {D3, D3Service} from '../../../../common/d3-service/d3-service';
import {PROGRESS_CONFIG} from '../../../progress-config';
import {AbstractLevelTypeEnum} from '@crczp/training-model';
import {MatDivider} from '@angular/material/divider';
import {MatTooltipModule} from '@angular/material/tooltip';

import {ProgressVisualizationsDataService} from '../../../services/progress-visualizations-data.service';

@Component({
    selector: 'crczp-trainee-detail',
    templateUrl: './trainee-detail.component.html',
    styleUrls: ['./trainee-detail.component.css'],
    imports: [
    MatDivider,
    MatTooltipModule
]
})
export class TraineeDetailComponent implements OnChanges, AfterViewInit {
    private visualizationDataService = inject(ProgressVisualizationsDataService);

    @Input() trainee: ProgressTraineeInfo;
    @Input() visualizationData: ProgressVisualizationData;
    @Input() trainingInstanceId: number;

    @Output() hideDetail = new EventEmitter();

    private readonly d3: D3;

    constructor() {
        const d3Service = inject(D3Service);

        this.d3 = d3Service.getD3();
    }

    ngOnChanges(): void {
        this.createTrainingTimeOverview();
        this.createLevelTimeline();
        this.createCommandTimeline();
    }

    ngAfterViewInit(): void {
        this.createTrainingTimeOverview();
        this.createLevelTimeline();
        this.createCommandTimeline();
    }

    getCurrentLevel(): ProgressLevelInfo {
        return this.visualizationData.levels.find((level) => level.id == this.getCurrentTraineeLevel()?.id);
    }

    getCurrentTraineeLevel(): ProgressLevelVisualizationData {
        return this.visualizationData.traineeProgress
            .find((p) => p.userRefId == this.trainee.userRefId)
            .levels.find((level) => level.state != 'FINISHED');
    }

    getHints(): ProgressHint[] {
        return this.getCurrentLevel().hints.sort((a, b) => a.title.localeCompare(b.title));
    }

    getHintsUsed(): number {
        return this.getCurrentTraineeLevel().hintsTaken?.length ? this.getCurrentTraineeLevel().hintsTaken.length : 0;
    }

    hintUsed(hint: ProgressHint): boolean {
        return !!this.getCurrentTraineeLevel().hintsTaken?.find((h) => h == hint.id);
    }

    getLevelsTimePlan(): number[] {
        return this.visualizationData.levels.map((level: ProgressLevelInfo) =>
            level.estimatedDuration > 0 ? level.estimatedDuration * 60 : 60
        );
    }

    getLevelColor(levelId: number): string {
        const currentLevel = this.getCurrentLevel();
        if (currentLevel.id != levelId) {
            return 'lightgray';
        }
        const minutesInLevel = (this.visualizationData.currentTime - this.getCurrentTraineeLevel().startTime) / 60;
        if (minutesInLevel < currentLevel.estimatedDuration) {
            return 'green';
        }

        if (minutesInLevel > currentLevel.estimatedDuration && minutesInLevel < currentLevel.estimatedDuration * 1.5) {
            return 'orange';
        }

        if (minutesInLevel > currentLevel.estimatedDuration) {
            return 'red';
        }
        return 'lightgray';
    }

    getWrongAnswers(): WrongAnswerData[] {
        const wrongAnswerData = [];
        this.getCurrentTraineeLevel()
            .events.filter((event) => event instanceof WrongAnswerEvent)
            .forEach((event) => {
                const index = wrongAnswerData.findIndex(
                    (data) => data.value == (event as WrongAnswerEvent).answerContent
                );
                if (index != -1) {
                    wrongAnswerData[index].timesUsed++;
                    const wrongAnswerLastTime = Math.ceil((this.visualizationData.currentTime - event.timestamp) / 60);
                    wrongAnswerData[index].lastUsed =
                        wrongAnswerLastTime == 1
                            ? wrongAnswerLastTime + ' minute ago'
                            : wrongAnswerLastTime + ' minutes ago';
                } else {
                    const wrongAnswerDataEntry = new WrongAnswerData();
                    wrongAnswerDataEntry.value = (event as WrongAnswerEvent).answerContent;
                    wrongAnswerDataEntry.timesUsed = 1;
                    const wrongAnswerLastTime = Math.ceil((this.visualizationData.currentTime - event.timestamp) / 60);
                    wrongAnswerDataEntry.lastUsed =
                        wrongAnswerLastTime == 1
                            ? wrongAnswerLastTime + ' minute ago'
                            : wrongAnswerLastTime + ' minutes ago';
                    wrongAnswerData.push(wrongAnswerDataEntry);
                }
            });
        return wrongAnswerData;
    }

    getUsedHintTime(hint: ProgressHint): string {
        const hintTakenTime = this.getCurrentTraineeLevel()
            .events.filter((event) => event instanceof HintTakenEvent)
            .find((event: HintTakenEvent) => event.hintId == hint.id).timestamp;
        const hintTakenMinutes = Math.ceil((this.visualizationData.currentTime - hintTakenTime) / 60);
        return hintTakenMinutes == 1 ? hintTakenMinutes + ' minute ago' : hintTakenMinutes + ' minutes ago';
    }

    getLowerLevelData(levelId: number): string {
        const currentLevel = this.getCurrentLevel();
        if (currentLevel.id == levelId) {
            return `in ${currentLevel.order + 1}. level, ${currentLevel.title}`;
        }
        return '';
    }

    getUpperLevelData(levelId: number): string {
        const currentLevel = this.getCurrentLevel();
        if (currentLevel.id == levelId) {
            let res = this.timeDifference(this.visualizationData.currentTime, this.getCurrentTraineeLevel().startTime);
            const minutesInLevel = (this.visualizationData.currentTime - this.getCurrentTraineeLevel().startTime) / 60;
            if (Math.floor(minutesInLevel) > currentLevel.estimatedDuration && currentLevel.estimatedDuration != 0) {
                res += ` (~ ${Math.floor(minutesInLevel - currentLevel.estimatedDuration)} minutes behind)`;
            }
            return res;
        }
        return '';
    }

    timeDifference(timestamp1: number, timestamp2: number): string {
        let difference = timestamp1 - timestamp2;

        const hoursDifference = Math.floor(difference / 60 / 60);
        difference -= hoursDifference * 60 * 60;

        const minutesDifference = Math.floor(difference / 60);
        difference -= minutesDifference * 60;

        const secondsDifference = Math.floor(difference);

        return `${this.pad(hoursDifference)}:${this.pad(minutesDifference)}:${this.pad(secondsDifference)}`;
    }

    pad(num: number): string {
        return num < 10 ? `0${num}` : `${num}`;
    }

    createTrainingTimeOverview(): void {
        this.d3.select('.training-time-overview').html('');

        if (!this.getCurrentLevel()) {
            return;
        }

        let sum = 0;
        const data = this.visualizationData.levels.map((level) => {
            const data = new TrainingTimeOverviewData();
            data.start = sum;
            sum += level.estimatedDuration > 0 ? level.estimatedDuration * 60 : 60;
            data.end = sum;
            data.levelId = level.id;
            return data;
        });

        const width = '100%';
        const height = 10;

        const chart = this.d3
            .select('.training-time-overview')
            .append('svg')
            .attr('class', 'chart')
            .attr('width', width)
            .attr('height', 5 * height);

        const el = document.getElementsByClassName('level-timeline');
        const rect = el[0] ? el[0].getBoundingClientRect() : { width: 0 };

        const scale = this.d3
            .scaleLinear()
            .domain([0, sum])
            .range([0, rect?.width - rect?.width * 0.5]);

        const bar = chart.selectAll('rect').data(data).enter().append('g');

        // create level bars
        bar.append('rect')
            .attr('height', height * 0.7)
            .attr('width', (d: TrainingTimeOverviewData): number => {
                return scale(d.end) - scale(d.start) - 1;
            })
            .attr('x', (d: TrainingTimeOverviewData): number => scale(d.start))
            .attr('y', 20)
            .attr('rx', 3)
            .attr('ry', 3)
            .attr('fill', (d: TrainingTimeOverviewData) => this.getLevelColor(d.levelId));

        //append upper text
        bar.append('text')
            .attr('x', (d: TrainingTimeOverviewData): number => scale(d.start))
            .attr('y', 15)
            .attr('height', 10)
            .text((d: TrainingTimeOverviewData) => {
                return this.getUpperLevelData(d.levelId);
            });

        //append lower text
        bar.append('text')
            .attr('x', (d: TrainingTimeOverviewData): number => scale(d.start))
            .attr('y', 45)
            .attr('height', 10)
            .text((d: TrainingTimeOverviewData) => {
                return this.getLowerLevelData(d.levelId);
            });
    }

    createLevelTimeline(): void {
        this.d3.select('.level-timeline').html('');

        if (!this.getCurrentLevel()) {
            return;
        }

        const offset = (this.visualizationData.currentTime - this.getCurrentTraineeLevel().startTime) * 0.05;
        const startTime = this.getCurrentTraineeLevel().startTime;
        const currentTime = this.visualizationData.currentTime;

        const width = '100%';
        const height = 100;

        const levelTimeline = this.d3
            .select('.level-timeline')
            .append('svg')
            .attr('width', width)
            .attr('height', height);

        const el = document.getElementsByClassName('level-timeline');
        const rect = el[0] ? el[0].getBoundingClientRect() : { width: 0 };

        // Create scale
        const scale = this.d3
            .scaleLinear()
            .domain([startTime - offset, currentTime + offset])
            .range([0, rect.width - 1]);

        // Add scales to axis
        const x_axis = this.d3
            .axisBottom(scale)
            .tickFormat((d) => this.timeDifference(d.valueOf(), this.visualizationData.startTime));

        //Append timeline
        levelTimeline
            .append('g')
            .attr('transform', 'translate(0, ' + height / 2 + ')')
            .call(x_axis);

        const events = levelTimeline
            .append('g')
            .selectAll('path.event')
            .data(this.getTimelineData())
            .enter()
            .append('g');

        // used for alternating position of event labels
        let position = 0;

        //append events
        events
            .append('path')
            .attr('class', 'event')
            .attr('d', (d) => d.icon)
            .attr('transform', (d) => 'translate(' + scale(d.timestamp) + ',' + height / 2.4 + ') scale(' + 1 + ')')
            .attr('fill', 'lightgrey');

        //append events line
        events
            .append('line')
            .attr(
                'transform',
                (d) => 'translate(' + (scale(d.timestamp) + 8) + ',' + height / 2.4 + ') scale(' + 1 + ')'
            )
            .attr('y1', (_, i) => {
                return i % 2 ? 16 : 0;
            })
            .attr('y2', (_, i) => {
                return i % 2 ? 23 : -7;
            })
            .attr('width', 1)
            .attr('stroke-width', 1)
            .attr('stroke', 'black');

        //append events text
        events
            .append('text')
            .attr(
                'transform',
                (d) => 'translate(' + (scale(d.timestamp) + 8) + ',' + height / 2.4 + ') scale(' + 1 + ')'
            )
            .attr('y', () => {
                position++;
                return position % 2 ? -10 : 40;
            })
            .style('text-anchor', 'middle')
            .style('fill', (d) => d.color)
            .text((d) => {
                return d.value;
            });
    }

    createCommandTimeline(): void {
        if (!this.getCurrentLevel()) {
            return;
        }

        const traineeTrainingRunId = this.visualizationData.traineeProgress.find(
            (trainee) => trainee.userRefId == this.trainee.userRefId
        ).trainingRunId;

        this.visualizationDataService
            .getCommandLineData(this.trainingInstanceId, traineeTrainingRunId)
            .pipe(take(1))
            .subscribe((commands: CommandLineEntry[]) => {
                this.d3.select('.command-timeline').html('');

                const offset = (this.visualizationData.currentTime - this.getCurrentTraineeLevel().startTime) * 0.05;
                const startTime = this.getCurrentTraineeLevel().startTime;
                const currentTime = this.visualizationData.currentTime;

                const commandsForLevel = commands.filter((command) => command.timestamp >= startTime - offset);

                const width = '100%';
                const height = 100;

                const el = document.getElementsByClassName('command-timeline');
                const rect = el[0] ? el[0].getBoundingClientRect() : { width: 0 };

                let sumTime = startTime;
                const data = [];
                data.push({ timestamp: startTime - offset, commandsUsed: 0 });
                data.push({ timestamp: startTime, commandsUsed: 0 });
                const period = 30; // commands are groupped every 30 seconds
                while (sumTime <= currentTime) {
                    const commandsUsed = commandsForLevel.filter(
                        (command) => command.timestamp >= sumTime && command.timestamp <= sumTime + period
                    ).length;
                    data.push({ timestamp: sumTime, commandsUsed: commandsUsed });
                    data.push({
                        timestamp: sumTime + period,
                        commandsUsed: commandsUsed
                    });
                    sumTime += period;
                }

                // append chart to its position
                const commandTimeline = this.d3
                    .select('.command-timeline')
                    .append('svg')
                    .attr('width', width)
                    .attr('height', height);

                // Add X axis
                const x = this.d3
                    .scaleTime()
                    .domain([startTime - offset, currentTime + offset])
                    .range([0, rect.width - 1]);

                commandTimeline
                    .append('g')
                    .attr('transform', 'translate(0,' + height + ')')
                    .call(this.d3.axisBottom(x));

                // Add Y axis
                const y = this.d3
                    .scaleLinear()
                    .domain([
                        0,
                        this.d3.max(data, function(d) {
                            return d.commandsUsed;
                        })
                    ])
                    .range([height, 0]);

                commandTimeline
                    .append('g')
                    .call(this.d3.axisLeft(y))
                    .call((g) => g.select('.domain').remove());

                // Add the area to the chart
                commandTimeline
                    .append('path')
                    .datum(data)
                    .attr('fill', '#cce5df')
                    .attr('stroke', '#69b3a2')
                    .attr('stroke-width', 1.5)
                    .attr(
                        'd',
                        this.d3
                            .area()
                            .x((d: any) => {
                                return x(d.timestamp);
                            })
                            .y0(y(0))
                            .y1((d: any) => {
                                return y(d.commandsUsed);
                            }) as any
                    );
            });
    }

    getTimelineData(): LevelTimelineData[] {
        const data = [];
        const currentLevel = this.getCurrentLevel();
        const levelStarted = new LevelTimelineData();
        levelStarted.icon = PROGRESS_CONFIG.eventProps.eventShapes['hint'];
        levelStarted.value = 'Started ProgressLevelInfo ' + (currentLevel.order + 1);
        levelStarted.timestamp = this.getCurrentTraineeLevel().startTime;
        levelStarted.color = 'black';
        data.push(levelStarted);
        this.getCurrentTraineeLevel()
            .events.filter((event) => event instanceof HintTakenEvent || event instanceof WrongAnswerEvent)
            .forEach((event) => {
                const eventTimelineData = new LevelTimelineData();
                eventTimelineData.icon = PROGRESS_CONFIG.eventProps.eventShapes[event.type];
                eventTimelineData.value =
                    event instanceof HintTakenEvent
                        ? (event as HintTakenEvent).hintTitle
                        : (event as WrongAnswerEvent).answerContent;
                eventTimelineData.color = event instanceof HintTakenEvent ? 'black' : 'red';
                eventTimelineData.timestamp = event.timestamp;
                data.push(eventTimelineData);
            });
        return data;
    }

    isTrainingLevel(): boolean {
        return this.getCurrentLevel()?.levelType == AbstractLevelTypeEnum.Training;
    }

    onResize(): void {
        this.createLevelTimeline();
        this.createTrainingTimeOverview();
        this.createCommandTimeline();
    }

    onOverviewClick(): void {
        this.hideDetail.emit(null);
    }
}
