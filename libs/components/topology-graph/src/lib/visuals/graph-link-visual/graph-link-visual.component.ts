import { Component, Input } from '@angular/core';
import { Link } from '@crczp/topology-graph-model';

/**
 * Visual component used to display links in the graph-visual and its decorators. Binds to link mode.
 */
@Component({
    selector: '[linkVisual]',
    templateUrl: './graph-link-visual.component.html',
    styleUrls: ['./graph-link-visual.component.css'],
    standalone: false
})
export class GraphLinkVisualComponent {
    @Input('linkVisual') link: Link;
}
