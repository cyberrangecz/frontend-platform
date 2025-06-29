import { VMImagesRowAdapter } from 'libs/agenda/sandbox-agenda/sandbox-images/src/models/vm-images-row-adapter';
import { Component, HostBinding, Input } from '@angular/core';

/**
 * Example of expanded row component
 */
@Component({
    selector: 'crczp-vm-image-detail',
    templateUrl: './vm-image-detail.component.html',
    styleUrls: ['./vm-image-detail.component.css'],
})
export class VMImageDetailComponent {
    @HostBinding('style.width') width = '100%';
    @Input() data: VMImagesRowAdapter;
}
