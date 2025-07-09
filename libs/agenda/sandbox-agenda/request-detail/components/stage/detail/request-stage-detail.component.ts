import {ChangeDetectionStrategy, Component, Input, OnChanges, SimpleChanges} from '@angular/core';
import {StageDetailComponentEnum} from '../../../model/utils/stage-detail-component-enum';
import {StageAdapter} from '../../../model/adapters/stage-adapter';
import {StageComponentResolver} from '../../../model/utils/stage-component-resolver';
import {PoolResolver, RequestResolver} from "@crczp/sandbox-agenda/resolvers";
import {
    AnsibleAllocationStageDetailComponent
} from "./ansible-allocation-stage-detail/ansible-allocation-stage-detail.component";
import {
    TerraformAllocationStageDetailComponent
} from "./terraform-allocation-stage-detail/terraform-allocation-stage-detail.component";

/**
 * Component inserting concrete component based on request stage type
 */
@Component({
    selector: 'crczp-request-stage-detail',
    templateUrl: './request-stage-detail.component.html',
    styleUrls: ['./request-stage-detail.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    providers: [PoolResolver, RequestResolver],
    imports: [
        AnsibleAllocationStageDetailComponent,
        TerraformAllocationStageDetailComponent
    ]
})
export class RequestStageDetailComponent implements OnChanges {
    @Input() stage: StageAdapter;
    stageComponents = StageDetailComponentEnum;
    stageComponentToDisplay: StageDetailComponentEnum;

    ngOnChanges(changes: SimpleChanges): void {
        if ('stage' in changes && this.stage) {
            this.stageComponentToDisplay = StageComponentResolver.resolve(this.stage?.type);
        }
    }
}
