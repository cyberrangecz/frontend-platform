import {NgModule} from '@angular/core';
import {RouterModule, Routes} from '@angular/router';
import {CheatingDetectionOverviewComponent} from '@crczp/training-agenda/instance-cheating-detection';
import {PATHS} from "../../paths";

const routes: Routes = [
    {
        path: '',
        pathMatch: 'full',
        component: CheatingDetectionOverviewComponent,
    },
    {
        path: PATHS.ACTION.CREATE,
        loadChildren: () =>
            import('@crczp/training-agenda/instance-cheating-detection-edit').then(
                (m) => m.CheatingDetectionEditComponent,
            ),
        data: {
            title: 'Create Cheating Detection',
            breadcrumb: 'Create',
        },
    },
    {
        path: `:${PATHS.INSTANCE.CHEATING_DETECTION.ATTRIBUTE.ID}`,
        loadChildren: () =>
            import('@crczp/training-agenda/instance-detection-event').then(
                (m) => m.TrainingInstanceDetectionEventComponent,
            ),
        data: {
            title: 'Detection Events',
            breadcrumb: 'Events',
        },
    },
    {
        path: `:${PATHS.INSTANCE.CHEATING_DETECTION.ATTRIBUTE.ID}/${PATHS.VIEW.DETAIL}`,
        loadChildren: () =>
            import('@crczp/training-agenda/instance-detection-event-detail').then(
                (m) => m.TrainingInstanceDetectionEventDetailComponent,
            ),
        data: {
            title: 'Detection Event Detail',
            breadcrumb: 'Detail',
        },
    },
];

/**
 * Routing module for training instance progress
 */
@NgModule({
    imports: [
        RouterModule.forChild(routes),
        CheatingDetectionOverviewComponent,
    ],
    exports: [RouterModule],
})
export class CheatingDetectionOverviewRoutingModule {
}
