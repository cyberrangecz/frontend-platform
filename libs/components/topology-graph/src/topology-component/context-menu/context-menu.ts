import { Component, ElementRef, input, OnChanges, signal, SimpleChanges, viewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Network } from 'vis-network';
import { ClickOutsideDirective } from '@crczp/utils';

export interface ContextMenuItem {
    label: string;
    action: () => void;
}

@Component({
    selector: 'crczp-context-menu',
    imports: [CommonModule, ClickOutsideDirective],
    templateUrl: './context-menu.html',
    styleUrl: './context-menu.scss',
})
export class ContextMenu implements OnChanges {
    network = input.required<Network>();
    boundingBox = input.required<DOMRect>();
    accessibleNodes = input.required<(string | number)[]>();

    createContextMenu =
        input.required<(nodeId: string | number) => ContextMenuItem[]>();

    contextMenuRef = viewChild<ElementRef<HTMLDivElement>>('contextMenu');

    menuData = signal<ContextMenuItem[]>([]);
    visible = signal<boolean>(false);
    position = signal<{ x: number; y: number }>({ x: 0, y: 0 });

    private storedBoundingBox: DOMRect | null = null;

    ngOnChanges(changes: SimpleChanges): void {
        if (changes['network'] && this.network()) {
            this.registerEvents();
        }
        if (changes['boundingBox']) {
            this.storedBoundingBox = this.boundingBox();
        }
    }

    hideContextMenu(): void {
        this.visible.set(false);
    }

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
        y: number,
    ): void {
        if (!this.accessibleNodes().includes(nodeId)) {
            return;
        }
        // Use stored bounding box to prevent using expanded container dimensions
        const containerRect = this.storedBoundingBox || this.boundingBox();

        this.menuData.set(this.createContextMenu()(nodeId));
        this.visible.set(true);

        // Use setTimeout to ensure the menu is rendered and we can get its dimensions
        setTimeout(() => {
            const adjustedPosition = this.calculateAdjustedPosition(
                x,
                y,
                containerRect,
            );
            this.position.set(adjustedPosition);
        }, 0);
    }

    private calculateAdjustedPosition(
        x: number,
        y: number,
        containerRect: DOMRect,
    ): { x: number; y: number } {
        const menuElement = this.contextMenuRef()?.nativeElement;
        if (!menuElement) {
            return { x, y };
        }

        const menuRect = menuElement.getBoundingClientRect();

        let adjustedX = x;
        let adjustedY = y;

        const absoluteX = containerRect.left + x;
        const absoluteY = containerRect.top + y;

        // Check if menu would clip on the right side
        if (absoluteX + menuRect.width > containerRect.right) {
            adjustedX =
                containerRect.right - containerRect.left - menuRect.width - 4;
            adjustedX = Math.max(0, adjustedX);
        }

        // Check if menu would clip on the bottom
        if (absoluteY + menuRect.height > containerRect.bottom) {
            adjustedY =
                containerRect.bottom - containerRect.top - menuRect.height - 4;
            adjustedY = Math.max(0, adjustedY);
        }

        return { x: adjustedX, y: adjustedY };
    }
}
