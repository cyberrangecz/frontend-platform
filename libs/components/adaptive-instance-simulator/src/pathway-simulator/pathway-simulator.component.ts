import {Component, Input} from '@angular/core';
import {
    AdaptiveTransitionVisualizationComponent
} from "../transition-visualization/adaptive-transition-visualization.component";
import {NgIf} from "@angular/common";
import {TransitionGraphVisualizationData} from "../transition-visualization/model/transition-graph-visualization-data";

@Component({
    selector: 'crczp-pathway-simulator',
    templateUrl: './pathway-simulator.component.html',
    styleUrls: ['./pathway-simulator.component.css'],
    imports: [
        AdaptiveTransitionVisualizationComponent,
        NgIf
    ]
})
export class PathwaySimulatorComponent {
    @Input() transitionData: TransitionGraphVisualizationData;
}
