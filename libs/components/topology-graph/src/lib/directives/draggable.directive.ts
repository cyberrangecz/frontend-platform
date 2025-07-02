import { Directive, ElementRef, Input, OnInit, inject } from '@angular/core';
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
    private d3Service = inject(D3Service);
    private _element = inject(ElementRef);

    @Input('draggableNode') node: Node;
    @Input('draggableInGraph') graph: ForceDirectedGraph;

    ngOnInit() {
        this.d3Service.applyDraggableBehaviour(
            this._element.nativeElement,
            this.node,
            this.graph
        );
    }
}
