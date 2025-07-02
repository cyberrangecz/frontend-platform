import {Injectable} from '@angular/core';
import {Observable, Subject} from 'rxjs';
import {GraphEventTypeEnum} from '../model/enums/graph-event-type-enum';
import {GraphEvent} from '../model/events/graph-event';
import {SwitchNode} from '@crczp/topology-graph-model';

/**
 * Service used for communication with graph-visual model and rearrangements from other parts of application
 */
@Injectable()
export class GraphEventService {
    private _graphEventSubject: Subject<GraphEvent> = new Subject();
    graphEvent: Observable<GraphEvent> = this._graphEventSubject.asObservable();

    /**
     * Sends event to graph-visual to collapse all subnetworks
     */
    collapseAll() {
        this._graphEventSubject.next(
            new GraphEvent(GraphEventTypeEnum.CollapseAllSubnets)
        );
    }

    /**
     * Sends event to graph-visual to expand all subnetworks
     */
    expandAll() {
        this._graphEventSubject.next(
            new GraphEvent(GraphEventTypeEnum.ExpandAllSubnets)
        );
    }

    fitToScreen() {
        this._graphEventSubject.next(
            new GraphEvent(GraphEventTypeEnum.FitToScreen)
        );
    }

    balloonTreeLayout() {
        this._graphEventSubject.next(
            new GraphEvent(GraphEventTypeEnum.BalloonTreeLayout)
        );
    }

    hierarchicalLayout() {
        this._graphEventSubject.next(
            new GraphEvent(GraphEventTypeEnum.HierarchicalLayout)
        );
    }

    turnOffForces() {
        this._graphEventSubject.next(
            new GraphEvent(GraphEventTypeEnum.TurnOffForces)
        );
    }

    hideSubnet(node: SwitchNode) {
        this._graphEventSubject.next(
            new GraphEvent(GraphEventTypeEnum.HideSubnet, node)
        );
    }

    revealSubnet(node: SwitchNode) {
        this._graphEventSubject.next(
            new GraphEvent(GraphEventTypeEnum.RevealSubnet, node)
        );
    }
}
