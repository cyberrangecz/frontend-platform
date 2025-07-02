import {Component, EventEmitter, OnInit, Output} from '@angular/core';
import {FiltersService} from '../../../services/filters.service';

@Component({
    selector: 'crczp-visualization-overview-filters',
    templateUrl: './filters.component.html',
    styleUrls: ['./filters.component.css'],
    standalone: false
})
export class FiltersComponent implements OnInit {
    @Output() activeFilters: EventEmitter<any> = new EventEmitter();
    filtersArray: any;

    constructor(private filtersService: FiltersService) {
    }

    ngOnInit(): void {
        this.filtersArray = this.filtersService.getFiltersArray();
    }

    onFilterChange(): void {
        this.filtersService.filter();
        this.activeFilters.emit(this.filtersService.getFiltersObject());
    }
}
