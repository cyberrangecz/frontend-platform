import {Injectable} from '@angular/core';
import {Observable, Subject} from 'rxjs';
import {INode} from '@crczp/topology-graph-model';

@Injectable()
export class DraggedNodeService {
    lastDraggedNodeName = '';

    private _onNodeTouchedSubject: Subject<INode> = new Subject<INode>();
    public onNodeTouched: Observable<INode> =
        this._onNodeTouchedSubject.asObservable();

    private _onNodeDragStartedSubject: Subject<INode> = new Subject<INode>();
    public onNodeDragStarted: Observable<INode> =
        this._onNodeDragStartedSubject.asObservable();

    private _onNodeDragEndedSubject: Subject<INode> = new Subject<INode>();
    public onNodeDragEnded: Observable<INode> =
        this._onNodeDragEndedSubject.asObservable();

    /**
     * Emits event when node is touched (clicked, double-clicked or being hold). Before it is dragged.
     * @param node INode interface - node in the graph
     */
    emitNodeTouchedEvent(node: INode) {
        this._onNodeTouchedSubject.next(node);
    }

    /**
     * Emits event when node starts being dragged.
     * @param node INode interface - node in the graph
     */
    emitNodeDragStartedEvent(node: INode) {
        this.lastDraggedNodeName = node.name;
        this._onNodeDragStartedSubject.next(node);
    }

    /**
     * Sets lastDraggedNode attribute to empty string and emits empty observable event when dragging of a node stops
     */
    emitNodeDragEndedEvent() {
        this._onNodeDragEndedSubject.next(null);
    }
}
