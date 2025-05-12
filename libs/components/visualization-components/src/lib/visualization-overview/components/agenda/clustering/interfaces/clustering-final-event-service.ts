import { FinalComponent } from '../final/final.component';
import { PlayerData } from '../../../model/clustering/player-data';

export interface ClusteringFinalEventService {
    clusteringFinalComponent: FinalComponent;

    clusteringFinalOnPlayerMouseover(player: PlayerData): void;

    clusteringFinalOnPlayerMousemove(player: PlayerData): void;

    clusteringFinalOnPlayerMouseout(player: PlayerData): void;

    clusteringFinalOnPlayerClick(player: PlayerData): void;

    registerClusteringFinalComponent(component: FinalComponent): void;
}
