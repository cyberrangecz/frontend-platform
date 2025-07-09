import {NgModule} from '@angular/core';
import {ExtraOptions, RouterModule, Routes} from '@angular/router';
import {HomeComponent} from './components/home/home.component';
import {HOME_PATH, LOGIN_PATH, LOGOUT_PATH, NOTIFICATIONS_PATH} from './paths';
import {LoginComponent} from "./components/login/login.component";
import {sentinelAuthGuard, sentinelAuthGuardWithLoading, sentinelNegativeAuthGuard} from "@sentinel/auth";
import {
    ADAPTIVE_DEFINITION_PATH,
    ADAPTIVE_INSTANCE_PATH,
    MITRE_TECHNIQUES_PATH,
    TRAINING_DEFINITION_PATH,
    TRAINING_INSTANCE_PATH,
    TRAINING_RUN_PATH
} from "@crczp/training-agenda";
import {RoleGuards} from "./utils/guards";
import {RoleService} from "./services/role.service";
import {SANDBOX_DEFINITION_PATH, SANDBOX_IMAGES_PATH, SANDBOX_POOL_PATH} from "@crczp/sandbox-agenda";
import {GROUP_PATH, MICROSERVICE_PATH, USER_PATH} from "@crczp/user-and-group-agenda";

const routes: Routes = [
    {
        path: TRAINING_DEFINITION_PATH,
        loadChildren: () =>
            import('./modules/training-agenda/definition/overview/training-definition-overview.module').then(
                (m) => m.TrainingDefinitionOverviewModule,
            ),
        canActivate: [RoleGuards.trainingDesignerGuard],
        data: {
            breadcrumb: 'Linear Training Definitions',
            title: 'Linear Training Definition Overview',
            preloadRoleCondition: RoleService.ROLES.trainingDesigner,
        },
    },
    {
        path: ADAPTIVE_DEFINITION_PATH,
        loadChildren: () =>
            import('./modules/training-agenda/adaptive-definition/overview/adaptive-definition-overview.module').then(
                (m) => m.AdaptiveDefinitionOverviewModule,
            ),
        canActivate: [RoleGuards.adaptiveTrainingDesignerGuard],
        data: {
            breadcrumb: 'Adaptive Training Definitions',
            title: 'Adaptive Training Definition Overview',
            preloadRoleCondition: RoleService.ROLES.adaptiveTrainingDesigner,
        },
    },
    {
        path: SANDBOX_DEFINITION_PATH,
        loadChildren: () =>
            import('./modules/sandbox-agenda/definition/sandbox-definition-overview.module').then(
                (m) => m.SandboxDefinitionOverviewModule,
            ),
        canActivate: [RoleGuards.sandboxDesignerGuard],
        data: {
            breadcrumb: 'Sandbox Definitions',
            title: 'Sandbox Definition Overview',
            preloadRoleCondition: RoleService.ROLES.sandboxDesigner,
        },
    },
    {
        path: TRAINING_INSTANCE_PATH,
        loadChildren: () =>
            import('./modules/training-agenda/instance/overview/training-instance-overview.module').then(
                (m) => m.TrainingInstanceOverviewModule,
            ),
        canActivate: [RoleGuards.trainingOrganizerGuard],
        data: {
            breadcrumb: 'Linear Training Instances',
            title: 'Linear Training Instance Overview',
            preloadRoleCondition: RoleService.ROLES.trainingOrganizer,
        },
    },
    {
        path: ADAPTIVE_INSTANCE_PATH,
        loadChildren: () =>
            import('./modules/training-agenda/adaptive-instance/overview/adaptive-instance-overview.module').then(
                (m) => m.AdaptiveInstanceOverviewModule,
            ),
        canActivate: [RoleGuards.adaptiveTrainingOrganizerGuard],
        data: {
            breadcrumb: 'Adaptive Training Instances',
            title: 'Adaptive Training Instance Overview',
            preloadRoleCondition: RoleService.ROLES.adaptiveTrainingOrganizer,
        },
    },
    {
        path: SANDBOX_POOL_PATH,
        loadChildren: () =>
            import('./modules/sandbox-agenda/pool/pool-overview.module').then((m) => m.PoolOverviewModule),
        canActivate: [RoleGuards.sandboxOrganizerGuard],
        data: {
            breadcrumb: 'Pools',
            title: 'Pool Overview',
            preloadRoleCondition: RoleService.ROLES.sandboxOrganizer,
        },
    },
    {
        path: SANDBOX_IMAGES_PATH,
        loadChildren: () =>
            import('./modules/sandbox-agenda/images/sandbox-images.module').then((m) => m.SandboxImagesOverviewModule),
        canActivate: [RoleGuards.sandboxOrganizerGuard],
        data: {
            breadcrumb: 'Images',
            title: 'Images Overview',
            preloadRoleCondition: RoleService.ROLES.sandboxOrganizer,
        },
    },
    {
        path: TRAINING_RUN_PATH,
        loadChildren: () =>
            import('./modules/training-agenda/run/overview/training-run-overview.module').then(
                (m) => m.TrainingRunOverviewModule,
            ),
        canActivate: [RoleGuards.trainingTraineeGuard],
        data: {
            breadcrumb: 'Training Runs',
            title: 'Training Run Overview',
            preloadRoleCondition: RoleService.ROLES.trainingTrainee,
        },
    },
    { // for trainees
        path: MITRE_TECHNIQUES_PATH,
        loadChildren: () =>
            import('./modules/training-agenda/mitre-techniques/mitre-techniques.module').then(
                (m) => m.MitreTechniquesModule,
            ),
        canActivate: [RoleGuards.trainingTraineeGuard],
        data: {
            title: 'MITRE ATT&CK Techniques',
            breadcrumb: 'MITRE ATT&CK Techniques',
            showSwitch: false,
            preloadRoleCondition: RoleService.ROLES.trainingTrainee,
        },
    },
    { // for designers
        path: MITRE_TECHNIQUES_PATH,
        loadChildren: () =>
            import('./modules/training-agenda/mitre-techniques/mitre-techniques.module').then(
                (m) => m.MitreTechniquesModule,
            ),
        canActivate: [RoleGuards.trainingDesignerGuard],
        data: {
            title: 'MITRE ATT&CK Techniques',
            breadcrumb: 'MITRE ATT&CK Techniques',
            showSwitch: false,
            preloadRoleCondition: RoleService.ROLES.trainingDesigner,
        },
    },
    {
        path: USER_PATH,
        loadChildren: () =>
            import('./modules/user-and-group-agenda/user/user-overview.module').then((m) => m.UserOverviewModule),
        canActivate: [RoleGuards.uagAdminGuard],
        data: {
            breadcrumb: 'Users',
            title: 'User Overview',
            preloadRoleCondition: RoleService.ROLES.uagAdmin,
        },
    },
    {
        path: GROUP_PATH,
        loadChildren: () =>
            import('./modules/user-and-group-agenda/group/group-overview.module').then((m) => m.GroupOverviewModule),
        canActivate: [RoleGuards.uagAdminGuard],
        data: {
            breadcrumb: 'Groups',
            title: 'Group Overview',
            preloadRoleCondition: RoleService.ROLES.uagAdmin,
        },
    },
    {
        path: MICROSERVICE_PATH,
        loadChildren: () =>
            import('./modules/user-and-group-agenda/microservice/microservice-overview.module').then(
                (m) => m.MicroserviceOverviewModule,
            ),
        canActivate: [RoleGuards.uagAdminGuard],
        data: {
            breadcrumb: 'Microservice',
            title: 'Microservice Overview',
            preloadRoleCondition: RoleService.ROLES.uagAdmin,
        },
    },
    {
        path: NOTIFICATIONS_PATH,
        canActivate: [sentinelAuthGuard],
        loadChildren: () =>
            import('./modules/notifications/notifications-overview.module').then((m) => m.NotificationsOverviewModule),
        data: {
            breadcrumb: 'Notifications',
            title: 'Notifications'
        },
    },
    {
        path: LOGIN_PATH,
        component: LoginComponent,
        canActivate: [sentinelNegativeAuthGuard],
    },
    {
        path: HOME_PATH,
        component: HomeComponent,
        canActivate: [sentinelAuthGuardWithLoading, RoleGuards.advancedUserGuard],
    },
    {
        path: LOGOUT_PATH,
        redirectTo: HOME_PATH,
        pathMatch: 'full',
    },
    {
        path: '',
        redirectTo: HOME_PATH,
        pathMatch: 'full',
    },
];

@NgModule({
    imports: [
        RouterModule.forRoot(routes, {
            initialNavigation: 'enabledNonBlocking',
            paramsInheritanceStrategy: 'always',
        } as ExtraOptions),
    ],
    exports: [RouterModule],
})
/**
 * Main routing module. Contains routes to all lazy-loaded app agendas.
 */
export class AppRoutingModule {
}
