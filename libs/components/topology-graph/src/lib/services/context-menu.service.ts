import {Injectable} from '@angular/core';
import {Observable, Subject} from 'rxjs';
import {NodeActionEnum} from '../model/enums/node-context-menu-items-enum';
import {HostNode, RouterNode} from '@crczp/topology-graph-model';
import {HostService} from './host.service';
import {MenuItemResult} from '../model/events/menu-item-result';
import {map} from 'rxjs/operators';

/**
 * Service used for handling events in context menu
 */
@Injectable()
export class ContextMenuService {
    private readonly _items;

    constructor(private hostService: HostService) {
        this._items = [
            {
                id: 1,
                type: NodeActionEnum.GraphicalUserInterface,
                title: NodeActionEnum.GraphicalUserInterface,
            },
            {
                id: 2,
                type: NodeActionEnum.CommandLineInterface,
                title: NodeActionEnum.CommandLineInterface,
            },
            {
                id: 3,
                type: NodeActionEnum.OpenConsoleUrl,
                title: NodeActionEnum.OpenConsoleUrl,
            },
            {
                id: 4,
                type: NodeActionEnum.CopyHostInfo,
                title: NodeActionEnum.CopyHostInfo,
            },
        ];
    }

    show: Subject<{
        position: {
            x: number;
            y: number;
        };
        nodeName: string;
    }> = new Subject();

    getItems() {
        return this._items;
    }

    /**
     * Handles chosen context menu item by taking appropriate actions
     * @param type type of the context menu item
     * @param node node associated with the context menu
     */
    handleMenuItem(
        type: NodeActionEnum,
        node: HostNode | RouterNode
    ): Observable<MenuItemResult> {
        return this.hostService
            .performAction(type, node)
            .pipe(map((payload) => new MenuItemResult(type, payload)));
    }
}
