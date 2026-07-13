import { Component, Input } from '@angular/core';
import { PoolRowAdapter } from '../../model/pool-row-adapter';
import { ResourceBarComponent } from './resource-bar/resource-bar.component';
import { MatGridList, MatGridTile } from '@angular/material/grid-list';

@Component({
    selector: 'crczp-pool-expand-detail',
    templateUrl: './pool-expand-detail.component.html',
    styleUrls: ['./pool-expand-detail.component.css'],
    imports: [ResourceBarComponent, MatGridTile, MatGridList],
})
export class PoolExpandDetailComponent {
    @Input() data: PoolRowAdapter;

    displayedResources = ['instances', 'vcpu', 'ram', 'port', 'network'];
}
