import {Injectable} from '@angular/core';
import {Observable} from 'rxjs';
import {
    Clusterables,
    ClusteredUser,
    ClusteringVisualizationData,
    TimeAfterHint,
    WrongFlags
} from '@crczp/visualization-model';
import {ClusteringApi} from '@crczp/visualization-api';

@Injectable()
export class VisualizationsDataService {
    protected _selectedFeature: Clusterables;

    set selectedFeature(value: Clusterables) {
        this._selectedFeature = value;
    }

    get selectedFeature(): Clusterables {
        return this._selectedFeature;
    }

    constructor(private clusteringApi: ClusteringApi) {
    }

    getData(
        trainingDefinitionId: number,
        numOfClusters: number,
        instanceIds: number[],
        level: number,
    ): Observable<ClusteringVisualizationData> {
        switch (this._selectedFeature) {
            case Clusterables.WrongFlags:
                return this.clusteringApi.getVisualizationData(trainingDefinitionId, 'wrong-answers', numOfClusters, instanceIds, level)
            case Clusterables.TimeAfterHint:
                return this.clusteringApi.getVisualizationData(trainingDefinitionId, 'hints', numOfClusters, instanceIds, level)

            default:
                return new Observable<ClusteringVisualizationData>();
        }
    }

    getRadarData(
        trainingDefinitionId: number,
        numOfClusters: number,
        instanceIds: number[],
        level: number,
    ): Observable<ClusteringVisualizationData> {
        return this.clusteringApi.getRadarChartData(trainingDefinitionId, numOfClusters, instanceIds, level)
    }

    getLineData(
        trainingDefinitionId: number,
        numOfClusters: number,
        instanceIds: number[],
        level: number,
    ): Observable<any> {
        switch (this._selectedFeature) {
            case Clusterables.WrongFlags:
                return this.clusteringApi
                    .getFeatureSSE(trainingDefinitionId, 'wrong-answers', numOfClusters, instanceIds, level);

            case Clusterables.TimeAfterHint:
                return this.clusteringApi
                    .getFeatureSSE(trainingDefinitionId, 'hints', numOfClusters, instanceIds, level);

            case Clusterables.NDimensional:
                return this.clusteringApi
                    .getFeatureSSE(trainingDefinitionId, 'n-dimensional', numOfClusters, instanceIds, level);
        }
    }

    getOption(point: ClusteredUser, feature = this._selectedFeature): number {
        switch (feature) {
            case Clusterables.TimeAfterHint:
                return (point as TimeAfterHint).level;
        }
        return 0;
    }

    getX(value: any, feature = this._selectedFeature): number {
        switch (feature) {
            case Clusterables.WrongFlags:
                return (value as WrongFlags).wrongFlagsSubmittedNormalized;
            case Clusterables.TimeAfterHint:
                return (value as TimeAfterHint).timeSpentAfterHintNormalized;
            case Clusterables.NDimensional:
                break;
        }
        const tmp = value as WrongFlags;
        return tmp.wrongFlagsSubmittedNormalized;
    }

    getY(value: any, feature = this._selectedFeature): number {
        switch (feature) {
            case Clusterables.WrongFlags:
                return (value as WrongFlags).timePlayedNormalized;
            case Clusterables.TimeAfterHint:
                return (value as TimeAfterHint).wrongFlagsAfterHintNormalized;
            case Clusterables.NDimensional:
                break;
        }
        const tmp = value as WrongFlags;
        return tmp.timePlayedNormalized;
    }

    getXLabel(feature = this._selectedFeature): string {
        switch (feature) {
            case Clusterables.WrongFlags:
                return 'Wrong answers submitted';
            case Clusterables.TimeAfterHint:
                return 'Time spent after using hint';
        }
        return 'Feature X';
    }

    getYLabel(feature = this._selectedFeature): string {
        switch (feature) {
            case Clusterables.WrongFlags:
                return 'Time played';
            case Clusterables.TimeAfterHint:
                return 'Wrong answers after using hint';
        }
        return 'Feature Y';
    }
}
