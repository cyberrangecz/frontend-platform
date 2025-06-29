import {Component, Input} from '@angular/core';
import {SandboxDefinition} from '@crczp/sandbox-model';
import {NgIf} from "@angular/common";

/**
 * Table detail of expanded row displaying sandbox definition details
 */
@Component({
    selector: 'crczp-sandbox-definition-detail',
    templateUrl: './sandbox-definition-detail.component.html',
    styleUrls: ['./sandbox-definition-detail.component.scss'],
    imports: [
        NgIf
    ]
})
export class SandboxDefinitionDetailComponent {
    @Input() data: SandboxDefinition;
}
