import {
    Component,
    HostListener,
    input,
    OnChanges,
    signal,
    SimpleChanges,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Network } from 'vis-network';

export interface ContextMenuItem {
    label: string;
    action: () => void;
}

@Component({
    selector: 'crczp-context-menu',
    imports: [CommonModule],
    templateUrl: './context-menu.html',
    styleUrl: './context-menu.scss',
})
export class ContextMenu implements OnChanges {
    network = input.required<Network>();

    createContextMenu =
        input.required<(nodeId: string | number) => ContextMenuItem[]>();

    menuData = signal<ContextMenuItem[]>([]);
    visible = signal<boolean>(false);
    position = signal<{ x: number; y: number }>({ x: 0, y: 0 });

    ngOnChanges(changes: SimpleChanges): void {
        if (changes['network'] && this.network()) {
            this.registerEvents();
        }
    }

    hideContextMenu(): void {
        this.visible.set(false);
    }

    @HostListener('document:click')
    onOutsideClick(): void {
        if (this.visible()) {
            this.hideContextMenu();
        }
    }

    private registerEvents(): void {
        this.network().on('oncontext', (params: any) => {
            params.event.preventDefault();

            const pointer = params.pointer.DOM;
            const nodeId = this.network().getNodeAt(pointer);

            if (nodeId != null) {
                this.showContextMenu(nodeId, pointer.x, pointer.y);
            } else {
                this.hideContextMenu();
            }
        });
    }

    private showContextMenu(
        nodeId: string | number,
        x: number,
        y: number
    ): void {
        this.menuData.set(this.createContextMenu()(nodeId));
        this.position.set({ x, y });
        this.visible.set(true);
    }
}
