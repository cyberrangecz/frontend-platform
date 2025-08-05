import {
    Component,
    DestroyRef,
    EventEmitter,
    inject,
    Input,
    Output,
} from '@angular/core';
import { Observable, of } from 'rxjs';
import { AsyncPipe } from '@angular/common';
import { MatButton } from '@angular/material/button';
import { MatTooltip } from '@angular/material/tooltip';

@Component({
    selector: 'crczp-topology-wrapper',
    templateUrl: './topology-wrapper.component.html',
    styleUrl: './topology-wrapper.component.css',
    imports: [AsyncPipe, MatButton, MatTooltip],
})
export class TopologyWrapperComponent {
    @Input() loading: Observable<boolean> = of(false);
    @Input() sandboxInstanceId!: string;
    @Input() sandboxDefinitionId!: number;
    @Output() getAccessFile = new EventEmitter<void>();
    destroyRef = inject(DestroyRef);
}
