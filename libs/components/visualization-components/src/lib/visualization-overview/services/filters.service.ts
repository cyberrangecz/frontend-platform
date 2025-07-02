import {Injectable} from '@angular/core';
import {FILTERS_ARRAY, FILTERS_OBJECT} from './filters/filters';
import {EMPTY, Subject} from 'rxjs';

@Injectable({
    providedIn: 'root',
})
export class FiltersService {
    filtersObject;
    filtersArray;

    private filterChanged: Subject<any> = new Subject<any>();

    filterChanged$ = this.filterChanged.asObservable();

    constructor() {
        this.filtersObject = FILTERS_OBJECT;
        this.filtersArray = FILTERS_ARRAY;
    }

    getFiltersObject(): any {
        return this.filtersObject;
    }

    getFiltersArray(): any {
        return this.filtersArray;
    }

    filter(): void {
        this.filterChanged.next(EMPTY);
    }
}
