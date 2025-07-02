import {Component, EventEmitter, HostListener, Input, OnChanges, OnInit, Output, SimpleChanges,} from '@angular/core';
import {ContextMenuService} from '../../services/context-menu.service';
import {Clipboard} from '@angular/cdk/clipboard';
import {HostNode, RouterNode} from '@crczp/topology-graph-model';
import {take} from 'rxjs/operators';
import {NodeActionEnum} from '../../model/enums/node-context-menu-items-enum';
import {Dimensions} from '../../model/others/dimensions';
import {Settings} from '@crczp/common';

/**
 * Visual component for displaying context meu of node after right click
 */
@Component({
    selector: '[context]',
    templateUrl: './graph-node-context-menu.component.html',
    styleUrls: ['./graph-node-context-menu.component.css'],
    standalone: false,
})
export class NodeContextMenuComponent implements OnInit, OnChanges {
    MENU_ROW_HEIGHT = 20;
    MENU_ROW_WIDTH = 240;

    @Input() node: HostNode | RouterNode;
    @Input() cloudSandboxInstance: boolean;
    @Input() graphSize: Dimensions;
    @Input() zoom: number;
    @Input() isConsoleReady: boolean;
    @Output() loadConsoles: EventEmitter<string> = new EventEmitter();
    @Output() polling: EventEmitter<boolean> = new EventEmitter();

    isDisplayed = false;
    items;
    consoleButtonDisplayed = false;
    protected readonly take = take;
    private menuLocation: { left: number; top: number } = { left: 0, top: 0 };

    constructor(
        private contextMenuService: ContextMenuService,
        private settings: Settings,
        private clipboard: Clipboard
    ) {}

    /**
     * Location parameters of mouse right click
     * @returns {{left: number; top: number}} object describing click location
     */
    get location() {
        return {
            left: this.menuLocation.left,
            top: this.menuLocation.top,
        };
    }

    ngOnInit() {
        this.contextMenuService.show.subscribe((e) =>
            this.showMenu(e.position, e.nodeName)
        );
        if (this.cloudSandboxInstance) {
            this.items = this.contextMenuService.getItems().filter((item) => {
                if (item.type === NodeActionEnum.CommandLineInterface) {
                    return this.node.osType === 'linux';
                } else if (
                    item.type === NodeActionEnum.GraphicalUserInterface
                ) {
                    return this.node.guiAccess;
                }
                return true;
            });
        } else {
            this.items = this.contextMenuService.getItems().filter((item) => {
                return item.type === NodeActionEnum.CopyHostInfo;
            });
        }
    }

    ngOnChanges(changes: SimpleChanges) {
        if ('isConsoleReady' in changes || 'zoom' in changes) {
            const width = this.isConsoleReady ? 220 : 260;
            this.MENU_ROW_WIDTH = width * this.zoom;
            this.MENU_ROW_HEIGHT = 20 * this.zoom;
        }
    }

    /**
     * Changes internal state of the component to reset after user clicked outside the context menu
     */
    @HostListener('document:click', ['$event'])
    onClickOutside(event) {
        if (this.isDisplayed) {
            this.polling.emit(false);
        }
        this.isDisplayed = false;
        this.consoleButtonDisplayed = false;
    }

    /**
     * Calls appropriate service based on value which was chosen by user
     * @param type of menu item user clicked on
     */
    onItemClick(event, item) {
        if (item.type === NodeActionEnum.CopyHostInfo) {
            this.clipboard.copy(this.node.toString());
            return;
        }
        if (
            item.type === NodeActionEnum.OpenConsoleUrl &&
            !this.isConsoleReady
        ) {
            return;
        }

        this.contextMenuService
            .handleMenuItem(item.type, this.node)
            .pipe(take(1))
            .subscribe((result) => {
                if (
                    result.type === NodeActionEnum.CommandLineInterface ||
                    result.type === NodeActionEnum.GraphicalUserInterface
                ) {
                    const clientIdentifier = window.btoa(
                        [result.payload, 'c', 'quickconnect'].join('\0')
                    );
                    window.open(
                        `${this.settings.GUACAMOLE_CONFIG.GUACAMOLE_BASE_PATH}#/client/${clientIdentifier}`,
                        '_blank'
                    );
                } else if (result.type === NodeActionEnum.OpenConsoleUrl) {
                    window.open(result.payload, '_blank');
                }
            });
    }

    /**
     * Displays menu and all its items
     * @param event sent by context menu service
     * @param items to be shown in menu
     */
    showMenu(position, nodeName) {
        if (this.node.name === nodeName) {
            this.menuLocation = {
                left:
                    position.x + this.MENU_ROW_WIDTH > this.graphSize.width
                        ? this.graphSize.width - this.MENU_ROW_WIDTH
                        : position.x,
                top:
                    position.y + this.MENU_ROW_HEIGHT * this.items.length >
                    this.graphSize.height
                        ? this.graphSize.height -
                          this.MENU_ROW_HEIGHT * this.items.length
                        : position.y,
            };
            this.isDisplayed = true;
            if (this.cloudSandboxInstance) {
                this.loadConsoles.emit(this.node.name);
            }
        } else {
            this.isDisplayed = false;
        }
    }
}
