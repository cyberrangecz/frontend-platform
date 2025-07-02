import {Injectable} from '@angular/core';
import {BehaviorSubject, Subject} from 'rxjs';
import {PlayerTableData} from '../components/model/table/player-table-data';

/**
 * Communication service between table and other components
 */

@Injectable({
    providedIn: 'root'
})
export class TableService {
    private tableRowClicked = new Subject<any>();
    tableRowClicked$ = this.tableRowClicked.asObservable();
    private tableRowMouseover = new Subject<number>();
    tableRowMouseover$ = this.tableRowMouseover.asObservable();
    private tableRowMouseout = new Subject<number>();
    tableRowMouseout$ = this.tableRowMouseout.asObservable();
    private playerColorScale = new BehaviorSubject<any>(() => 'black');
    playerColorScale$ = this.playerColorScale.asObservable();

    sendTableRowClick(player: PlayerTableData) {
        this.tableRowClicked.next(player);
    }

    sendTableRowMouseover(id: number) {
        this.tableRowMouseover.next(id);
    }

    sendTableRowMouseout(id: number) {
        this.tableRowMouseout.next(id);
    }

    sendPlayerColorScale(scale: any) {
        this.playerColorScale.next(scale);
    }
}
