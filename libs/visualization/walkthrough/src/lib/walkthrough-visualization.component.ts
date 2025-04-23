import { Component, Input, OnInit } from '@angular/core';
import { WalkthroughVisualizationData } from './model/walkthrough-visualization-data';
import { WalkthroughVisualizationService } from './services/walkthrough-visualization.service';
import { Observable, take } from 'rxjs';
import { AbstractLevelTypeEnum, Level } from '@crczp/training-model';

@Component({
    selector: 'crczp-walkthrough-visualization',
    templateUrl: 'walkthrough-visualization.component.html',
    styleUrls: ['walkthrough-visualization.component.scss'],
    standalone: false
})
export class WalkthroughVisualizationComponent implements OnInit {
    @Input() instanceId: number;
    @Input() levels: Level[];

    data$: Observable<WalkthroughVisualizationData>;
    currentLevel: Level;

    constructor(private visualizationService: WalkthroughVisualizationService) {}

    ngOnInit() {
        this.levels = this.levels
            .filter((level) => level.type === AbstractLevelTypeEnum.Training)
            .sort((a, b) => a.order - b.order);
        this.currentLevel = this.levels[0];
        this.data$ = this.visualizationService.levelData$;
    }

    onSelectionChange(event): void {
        if (event.value) {
            this.visualizationService.getData(event.value, this.instanceId).pipe(take(1)).subscribe();
        }
    }
}
