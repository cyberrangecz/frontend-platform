import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { PoolRowAdapter } from '../../model/pool-row-adapter';
import { ResourceBarComponent } from './resource-bar/resource-bar.component';
import { MatGridList, MatGridTile } from '@angular/material/grid-list';
import { AsyncPipe } from '@angular/common';

@Component({
    selector: 'crczp-pool-expand-detail',
    templateUrl: './pool-expand-detail.component.html',
    styleUrls: ['./pool-expand-detail.component.css'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [ResourceBarComponent, MatGridTile, MatGridList, AsyncPipe],
})
export class PoolExpandDetailComponent {
    @Input() sentinelExpandData: PoolRowAdapter;

    displayedResources = ['instances', 'vcpu', 'ram', 'port', 'network'];
}
