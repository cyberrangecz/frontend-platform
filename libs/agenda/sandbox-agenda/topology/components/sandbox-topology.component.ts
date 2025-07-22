import {ChangeDetectionStrategy, Component, DestroyRef, inject, OnInit} from '@angular/core';
import {ActivatedRoute} from '@angular/router';
import {SandboxDefinition, SandboxInstance} from '@crczp/sandbox-model';
import {Observable} from 'rxjs';

/**
 * Smart component of sandbox instance topology page
 */
@Component({
    selector: 'crczp-sandbox-instance-topology',
    templateUrl: './sandbox-topology.component.html',
    styleUrls: ['./sandbox-topology.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SandboxTopologyComponent implements OnInit {
    sandboxInstance$: Observable<SandboxInstance>;
    sandboxDefinition$: Observable<SandboxDefinition>;
    destroyRef = inject(DestroyRef);
    private activeRoute = inject(ActivatedRoute);

    ngOnInit(): void {

    }

}
