import { NgModule } from '@angular/core';
import { ContextMenuDirective } from './context-menu.directive';
import { DraggableDirective } from './draggable.directive';
import { DisableControlDirective } from './disable-control.directive';

@NgModule({
    declarations: [
        ContextMenuDirective,
        DraggableDirective,
        DisableControlDirective,
    ],
    exports: [
        ContextMenuDirective,
        DraggableDirective,
        DisableControlDirective,
    ],
})
export class DirectivesModule {}
