import { LevelsComponent } from '../levels/levels.component';
import { PlayerData } from '../../../model/clustering/player-data';
import { PlayerLevelData } from '../../../model/clustering/player-level-data';

export interface ClusteringLevelsEventService {
    clusteringLevelsComponent: LevelsComponent;

    clusteringLevelsOnPlayerMouseover(player: PlayerLevelData): void;

    clusteringLevelsOnPlayerMousemove(player: PlayerData): void;

    clusteringLevelsOnPlayerMouseout(player: PlayerLevelData): void;

    clusteringLevelsOnPlayerClick(player: PlayerLevelData): void;

    registerClusteringLevelsComponent(component: LevelsComponent): void;
}
