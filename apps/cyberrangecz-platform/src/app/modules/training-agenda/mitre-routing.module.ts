import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { TrainingApiModule } from '@crczp/training-api';
import { ValidRouterConfig } from '@crczp/routing-commons';
import { MitreTechniquesComponent } from '@crczp/training-agenda/mitre-techniques';

const routes: ValidRouterConfig<'run'> = [
    {
        path: '',
        component: MitreTechniquesComponent,
    },
];

@NgModule({
    imports: [
        RouterModule.forChild(routes),
        TrainingApiModule,
        MitreTechniquesComponent,
    ],
    exports: [RouterModule],
})
export class TrainingRunRoutingModule {}
