import { Component, EventEmitter, OnInit, Output, inject } from '@angular/core';
import {FiltersService} from '../../../services/filters.service';

@Component({
    selector: 'crczp-visualization-overview-filters',
    templateUrl: './filters.component.html',
    styleUrls: ['./filters.component.css'],
    standalone: false
})
export class FiltersComponent implements OnInit {
    private filtersService = inject(FiltersService);

    @Output() activeFilters: EventEmitter<any> = new EventEmitter();
    filtersArray: any;

    ngOnInit(): void {
        this.filtersArray = this.filtersService.getFiltersArray();
    }

    onFilterChange(): void {
        this.filtersService.filter();
        this.activeFilters.emit(this.filtersService.getFiltersObject());
    }
}
