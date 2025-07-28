import {
    Component,
    ElementRef,
    EventEmitter,
    HostListener,
    Input,
    OnChanges,
    Output,
    SimpleChanges,
    ViewChild,
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
    @Input({ required: true }) network!: Network;
    @Input() items: ContextMenuItem[] = [];
    @Output() itemSelected = new EventEmitter<ContextMenuItem>();

    @ViewChild('contextMenu', { static: false })
    contextMenuRef!: ElementRef<HTMLDivElement>;

    visible = false;
    position = { x: 0, y: 0 };
    targetNode: string | number | null = null;

    ngOnChanges(changes: SimpleChanges): void {
        if (changes['network'] && this.network) {
            this.registerEvents();
        }
        if (this.items.length === 0) {
            this.items = [
                {
                    label: 'No actions available',
                    action: () => {},
                },
            ];
        }
    }

    hideContextMenu(): void {
        this.visible = false;
        this.targetNode = null;
    }

    @HostListener('document:click')
    onOutsideClick(): void {
        if (this.visible) {
            this.hideContextMenu();
        }
    }

    private registerEvents(): void {
        this.network.on('oncontext', (params: any) => {
            params.event.preventDefault();

            const pointer = params.pointer.DOM;
            const nodeId = this.network.getNodeAt(pointer);

            if (nodeId != null) {
                this.targetNode = nodeId;
                this.showContextMenu(pointer.x, pointer.y);
            } else {
                this.hideContextMenu();
            }
        });
    }

    private showContextMenu(x: number, y: number): void {
        this.position = { x, y };
        this.visible = true;
    }
}
