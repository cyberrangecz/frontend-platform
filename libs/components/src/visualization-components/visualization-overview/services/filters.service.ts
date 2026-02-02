import {Injectable} from '@angular/core';
import {FILTERS_ARRAY, FILTERS_OBJECT, Filter, FiltersObject} from './filters/filters';
import {EMPTY, Subject} from 'rxjs';

@Injectable({
    providedIn: 'root',
})
export class FiltersService {
    filtersObject: FiltersObject;
    filtersArray: Filter[];

    private filterChanged: Subject<typeof EMPTY> = new Subject<typeof EMPTY>();

    filterChanged$ = this.filterChanged.asObservable();

    constructor() {
        this.filtersObject = FILTERS_OBJECT;
        this.filtersArray = FILTERS_ARRAY;
    }

    getFiltersObject(): FiltersObject {
        return this.filtersObject;
    }

    getFiltersArray(): Filter[] {
        return this.filtersArray;
    }

    filter(): void {
        this.filterChanged.next(EMPTY);
    }
}
