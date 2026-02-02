import { Component, effect, input, model, viewChild } from '@angular/core';
import { TraineeModeInfo } from '../../../shared/interfaces/trainee-mode-info';
import { ClusteringTrainingData } from '../../model/clustering/clustering-training-data';
import { FinalComponent } from './final/final.component';
import { LevelsComponent } from './levels/levels.component';

@Component({
    selector: 'crczp-visualization-overview-clustering',
    templateUrl: './clustering.component.html',
    styleUrls: ['./clustering.component.css'],
    // eslint-disable-next-line
    standalone: false,
})
export class ClusteringComponent {
    readonly finalComponent = viewChild(FinalComponent);
    readonly levelsComponent = viewChild(LevelsComponent);

    readonly clusteringTrainingData = model<ClusteringTrainingData>({
        finalResults: null,
        levels: null,
    });

    /**
     * Array of color strings for visualization.
     */
    readonly colorScheme = input<string[]>();
    /**
     * Main svg dimensions.
     */
    readonly size = input<{ width: number; height: number }>();
    /**
     * Id of training definition
     */
    readonly trainingDefinitionId = input<number>();
    /**
     * Id of training instance
     */
    readonly trainingInstanceId = input<number>();
    /**
     * Use if visualization should use anonymized data (without names and credentials of other users) from trainee point of view
     */
    readonly traineeModeInfo = input<TraineeModeInfo>();
    /**
     * List of players which should be displayed
     */
    readonly runIds = input<number[]>([]);
    /**
     * Id of training run which should be highlighted
     */
    readonly highlightedTrainingRunId = model<number | null>(null);
    /**
     * Enables trainee view - defaulty highlights given trainee
     */
    readonly standalone = input<boolean>(false);
    /**
     * If provided is used for aggregated view across data from several instances.
     */
    readonly instanceIds = input<number[]>([]);

    constructor() {
        effect(() => {
            const traineeModeInfo = this.traineeModeInfo();
            const standalone = this.standalone();
            if (traineeModeInfo && standalone) {
                this.highlightedTrainingRunId.set(
                    traineeModeInfo.trainingRunId,
                );
            }
        });
    }
}
