import { Component, EventEmitter, inject, OnInit, Output } from '@angular/core';
import { FiltersService } from '../../../services/filters.service';
import { MatCheckbox } from '@angular/material/checkbox';
import { FormsModule } from '@angular/forms';
import { Filter, FiltersObject } from '../../../services/filters/filters';

@Component({
    selector: 'crczp-visualization-overview-filters',
    templateUrl: './filters.component.html',
    styleUrls: ['./filters.component.css'],
    imports: [MatCheckbox, FormsModule],
})
export class FiltersComponent implements OnInit {
    @Output() activeFilters: EventEmitter<FiltersObject> = new EventEmitter();
    filtersArray: Filter[] = [];
    private filtersService = inject(FiltersService);

    ngOnInit(): void {
        this.filtersArray = this.filtersService.getFiltersArray();
    }

    onFilterChange(): void {
        this.filtersService.filter();
        this.activeFilters.emit(this.filtersService.getFiltersObject());
    }
}
