import {
    Component,
    EventEmitter,
    Input,
    Output,
    ViewEncapsulation,
} from '@angular/core';
import { PROGRESS_CONFIG } from '../../../progress-config';
import { CommonModule } from '@angular/common';

@Component({
    selector: 'crczp-viz-hurdling-column-header',
    templateUrl: './column-header.component.html',
    styleUrls: ['./column-header.component.css'],
    encapsulation: ViewEncapsulation.None,
    imports: [CommonModule],
})
export class ColumnHeaderComponent {
    public assetsRoot: string = PROGRESS_CONFIG.assetsRoot;

    @Input() sortType: string;
    @Input() label: string;
    @Input() selectedSortType: string;
    @Input() selectedSortReverse: boolean;
    @Input() level: any;

    @Output() sortEmitter = new EventEmitter();

    sort() {
        const event: any = { sortReverse: !this.selectedSortReverse };
        this.sortEmitter.emit(event);
    }
}
