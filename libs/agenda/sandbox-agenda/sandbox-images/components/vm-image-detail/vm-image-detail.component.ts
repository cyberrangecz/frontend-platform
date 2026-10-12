import {VMImagesRowAdapter} from '../../models/vm-images-row-adapter';
import {Component, HostBinding, Input, ChangeDetectionStrategy} from '@angular/core';

/**
 * Example of expanded row component
 */
@Component({
    selector: 'crczp-vm-image-detail',
    templateUrl: './vm-image-detail.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
    styleUrls: ['./vm-image-detail.component.css'],
})
export class VMImageDetailComponent {
    @HostBinding('style.width') width = '100%';
    @Input() sentinelExpandData: VMImagesRowAdapter;
}
