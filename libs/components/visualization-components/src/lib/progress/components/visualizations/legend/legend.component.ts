import {Component, EventEmitter, Input, OnDestroy, OnInit, Output} from '@angular/core';
import {timer} from 'rxjs';
import {takeWhile} from 'rxjs/operators';
import {PROGRESS_CONFIG} from '../../../progress-config';
import {D3, D3Service} from '../../../../common/d3-service/d3-service';
import {ViewEnum} from '../../types';
import {CommonModule} from '@angular/common';
import {MatButtonModule} from '@angular/material/button';

@Component({
    selector: 'crczp-viz-hurdling-legend',
    templateUrl: './legend.component.html',
    styleUrls: ['./legend.component.css'],
    imports: [
        CommonModule,
        MatButtonModule
    ]
})
export class LegendComponent implements OnInit, OnDestroy {
    @Input() selectedViewValue = ViewEnum.Progress;

    @Output() zoomResetChange = new EventEmitter();
    public pathConfig: { [x: string]: any };
    public activeLevelColorIndex = 3;
    public finishedLevelColorIndex = 0;
    public levelColors = {
        finished: PROGRESS_CONFIG.trainingColors[0],
        active: PROGRESS_CONFIG.levelsColorEstimates[0]
    };
    public activeLevelsDesc = [
        'the level duration is within estimates',
        'the level duration matches the expected time estimation',
        'the trainee is falling behind the schedule'
    ];
    private isAlive = true;
    private readonly d3: D3;

    constructor(
        d3Service: D3Service
    ) {
        this.d3 = d3Service.getD3();
        this.pathConfig = {
            ...PROGRESS_CONFIG.shapes,
            ...PROGRESS_CONFIG.eventProps.eventShapes
        };
    }

    ngOnInit() {
        this.initUpdateLevelColor();
    }

    initUpdateLevelColor() {
        timer(0, 5000)
            .pipe(takeWhile(() => this.isAlive))
            .subscribe(() => this.updateLevelColor());
    }

    updateLevelColor() {
        this.activeLevelColorIndex = (this.activeLevelColorIndex + 1) % PROGRESS_CONFIG.levelsColorEstimates.length;
        const newColor = PROGRESS_CONFIG.levelsColorEstimates[this.activeLevelColorIndex];
        this.levelColors.active = this.d3.hsl(newColor).brighter(1.2).toString();

        this.finishedLevelColorIndex = (this.finishedLevelColorIndex + 1) % PROGRESS_CONFIG.trainingColors.length;
        this.levelColors.finished = PROGRESS_CONFIG.trainingColors[this.finishedLevelColorIndex];
    }

    ngOnDestroy(): void {
        this.isAlive = false;
    }
}
