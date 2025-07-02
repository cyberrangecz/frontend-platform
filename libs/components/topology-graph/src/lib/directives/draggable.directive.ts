import {Directive, ElementRef, Input, OnInit} from '@angular/core';
import {Node} from '@crczp/topology-graph-model';
import {ForceDirectedGraph} from '../model/graph/force-directed-graph';
import {D3Service} from '../services/d3.service';

/**
 *Directive used for marking objects that should be able to be dragged.
 */

@Directive({
    selector: '[draggableNode]',
})
export class DraggableDirective implements OnInit {
    @Input('draggableNode') node: Node;
    @Input('draggableInGraph') graph: ForceDirectedGraph;

    constructor(private d3Service: D3Service, private _element: ElementRef) {}

    ngOnInit() {
        this.d3Service.applyDraggableBehaviour(
            this._element.nativeElement,
            this.node,
            this.graph
        );
    }
}
