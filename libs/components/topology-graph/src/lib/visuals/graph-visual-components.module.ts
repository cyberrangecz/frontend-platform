import { NgModule } from '@angular/core';
import { NodeContextMenuComponent } from './graph-node-context-menu/graph-node-context-menu.component';
import { GraphVisualComponent } from './graph-visual/graph-visual.component';
import { GraphLinkVisualComponent } from './graph-link-visual/graph-link-visual.component';
import { GraphNodeVisualComponent } from './graph-node-visual/graph-node-visual.component';
import { CommonModule } from '@angular/common';
import { DirectivesModule } from '../directives/directives.module';
import { LabelShortenerPipe } from '../pipes/label-shortener.pipe';
import { MatCard } from '@angular/material/card';

/**
 * Main module of visual (svg and d3) components
 */
@NgModule({
    imports: [CommonModule, DirectivesModule, MatCard],
    declarations: [
        LabelShortenerPipe,
        NodeContextMenuComponent,
        GraphVisualComponent,
        GraphLinkVisualComponent,
        GraphNodeVisualComponent,
    ],
    exports: [GraphVisualComponent],
})
export class GraphVisualComponentsModule {}
