import {Component, Input, OnInit} from '@angular/core';
import {Observable, take} from 'rxjs';
import {AbstractLevelTypeEnum, Level} from '@crczp/training-model';
import {MatFormField, MatLabel, MatOption, MatSelect, MatSelectChange} from "@angular/material/select";
import {AsyncPipe} from "@angular/common";
import {WalkthroughVisualizationData} from "@crczp/visualization-model";
import {WalkthroughVisualizationService} from "./service/walkthrough-visualization.service";
import {WalkthroughVisualizationComponent} from "./walkthrough-visualization.component";

@Component({
    selector: 'crczp-walkthrough-visualization-wrapper',
    templateUrl: 'walkthrough-visualization-wrapper.component.html',
    styleUrls: ['walkthrough-visualization-wrapper.component.scss'],
    imports: [
        MatFormField,
        MatSelect,
        MatOption,
        AsyncPipe,
        MatFormField,
        MatLabel,
        MatOption,
        WalkthroughVisualizationComponent
    ]
})
export class WalkthroughVisualizationWrapperComponent implements OnInit {
    @Input() instanceId: number;
    @Input() levels: Level[];

    data$: Observable<WalkthroughVisualizationData>;
    currentLevel: Level;

    constructor(private visualizationService: WalkthroughVisualizationService) {
    }

    ngOnInit() {
        this.levels = this.levels
            .filter((level) => level.type === AbstractLevelTypeEnum.Training)
            .sort((a, b) => a.order - b.order);
        this.currentLevel = this.levels[0];
        this.data$ = this.visualizationService.levelData$;
    }

    onSelectionChange(event: MatSelectChange<number>): void {
        if (event.value) {
            this.visualizationService.getData(event.value, this.instanceId).pipe(take(1)).subscribe();
        }
    }
}
