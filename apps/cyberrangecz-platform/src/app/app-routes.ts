import { HomeComponent } from './components/home/home.component';
import { LoginComponent } from './components/login/login.component';
import {
    sentinelAuthGuard,
    sentinelAuthGuardWithLogin,
    sentinelNegativeAuthGuard,
} from '@sentinel/auth';
import { RoleService } from './services/role.service';
import { ValidRouterConfig } from '@crczp/routing-commons';
import { RoleGuards } from './utils/guards';

export const APP_ROUTES: ValidRouterConfig<''> = [
    {
        path: 'login',
        component: LoginComponent,
        canActivate: [sentinelNegativeAuthGuard],
    },
    {
        path: 'home',
        component: HomeComponent,
        canActivate: [sentinelAuthGuardWithLogin],
    },
    {
        path: 'linear-definition',
        loadChildren: () =>
            import(
                './modules/training-agenda/training-definition-routing.module'
            ).then((m) => m.TrainingDefinitionRoutingModule),
        canActivate: [RoleGuards.trainingDesignerGuard],
        data: {
            breadcrumb: 'Linear Training Definitions',
            title: 'Linear Training Definition Overview',
            preloadRoleCondition: RoleService.ROLES.trainingDesigner,
        },
    },
    {
        path: 'adaptive-definition',
        loadChildren: () =>
            import(
                './modules/training-agenda/adaptive-definition-routing.module'
            ).then((m) => m.AdaptiveDefinitionRoutingModule),
        canActivate: [RoleGuards.adaptiveTrainingDesignerGuard],
        data: {
            breadcrumb: 'Adaptive Training Definitions',
            title: 'Adaptive Training Definition Overview',
            preloadRoleCondition: RoleService.ROLES.adaptiveTrainingDesigner,
        },
    },
    {
        path: 'linear-instance',
        loadChildren: () =>
            import(
                './modules/training-agenda/training-instance-routing.module'
            ).then((m) => m.TrainingInstanceRoutingModule),
        canActivate: [RoleGuards.trainingOrganizerGuard],
        data: {
            breadcrumb: 'Linear Training Instances',
            title: 'Linear Training Instance Overview',
            preloadRoleCondition: RoleService.ROLES.trainingOrganizer,
        },
    },
    {
        path: 'adaptive-instance',
        loadChildren: () =>
            import(
                './modules/training-agenda/adaptive-instance-routing.module'
            ).then((m) => m.AdaptiveInstanceRoutingModule),
        canActivate: [RoleGuards.adaptiveTrainingOrganizerGuard],
        data: {
            breadcrumb: 'Adaptive Training Instances',
            title: 'Adaptive Training Instance Overview',
            preloadRoleCondition: RoleService.ROLES.adaptiveTrainingOrganizer,
        },
    },
    {
        path: 'sandbox-definition',
        loadChildren: () =>
            import(
                './modules/sandbox-agenda/sandbox-definition-routing.module'
            ).then((m) => m.SandboxDefinitionRoutingModule),
        canActivate: [RoleGuards.sandboxDesignerGuard],
        data: {
            breadcrumb: 'Sandbox Definitions',
            title: 'Sandbox Definition Overview',
            preloadRoleCondition: RoleService.ROLES.sandboxDesigner,
        },
    },
    {
        path: 'pool',
        loadChildren: () =>
            import('./modules/sandbox-agenda/pool-routing.module').then(
                (m) => m.PoolRoutingModule,
            ),
        canActivate: [RoleGuards.sandboxOrganizerGuard],
        data: {
            breadcrumb: 'Pools',
            title: 'Pool Overview',
            preloadRoleCondition: RoleService.ROLES.sandboxOrganizer,
        },
    },
    {
        path: 'sandbox-image',
        loadChildren: () =>
            import(
                './modules/sandbox-agenda/sandbox-images-routing.module'
            ).then((m) => m.SandboxImagesRoutingModule),
        canActivate: [RoleGuards.sandboxOrganizerGuard],
        data: {
            breadcrumb: 'Images',
            title: 'Images Overview',
            preloadRoleCondition: RoleService.ROLES.sandboxOrganizer,
        },
    },
    {
        path: 'run',
        loadChildren: () =>
            import(
                './modules/training-agenda/training-run-routing.module'
            ).then((m) => m.TrainingRunRoutingModule),
        canActivate: [RoleGuards.trainingTraineeGuard],
        data: {
            breadcrumb: 'Training Runs',
            title: 'Training Run Overview',
            preloadRoleCondition: RoleService.ROLES.trainingTrainee,
        },
    },
    {
        // for trainees
        path: 'mitre-techniques',
        loadChildren: () =>
            import('./modules/training-agenda/mitre-routing.module').then(
                (m) => m.TrainingRunRoutingModule,
            ),
        canActivate: [RoleGuards.trainingTraineeGuard],
        data: {
            title: 'MITRE ATT&CK Techniques',
            breadcrumb: 'MITRE ATT&CK Techniques',
            showSwitch: false,
            preloadRoleCondition: RoleService.ROLES.trainingTrainee,
        },
    },
    {
        // for designers
        path: 'mitre-techniques',
        loadChildren: () =>
            import('./modules/training-agenda/mitre-routing.module').then(
                (m) => m.TrainingRunRoutingModule,
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
        path: 'user',
        loadChildren: () =>
            import('./modules/user-and-group-agenda/user-routing.module').then(
                (m) => m.UserRoutingModule,
            ),
        canActivate: [RoleGuards.uagAdminGuard],
        data: {
            breadcrumb: 'Users',
            title: 'User Overview',
            preloadRoleCondition: RoleService.ROLES.uagAdmin,
        },
    },
    {
        path: 'group',
        loadChildren: () =>
            import('./modules/user-and-group-agenda/group-routing.module').then(
                (m) => m.GroupRoutingModule,
            ),
        canActivate: [RoleGuards.uagAdminGuard],
        data: {
            breadcrumb: 'Groups',
            title: 'Group Overview',
            preloadRoleCondition: RoleService.ROLES.uagAdmin,
        },
    },
    {
        path: 'microservice',
        loadChildren: () =>
            import(
                './modules/user-and-group-agenda/microservice-routing.module'
            ).then((m) => m.MicroserviceRoutingModule),
        canActivate: [RoleGuards.uagAdminGuard],
        data: {
            breadcrumb: 'Microservice',
            title: 'Microservice Overview',
            preloadRoleCondition: RoleService.ROLES.uagAdmin,
        },
    },
    {
        path: 'notifications',
        canActivate: [sentinelAuthGuard],
        loadChildren: () =>
            import('./modules/notifications/notifications-routing.module').then(
                (m) => m.NotificationsRoutingModule,
            ),
        data: {
            breadcrumb: 'Notifications',
            title: 'Notifications',
        },
    },
    {
        path: 'console/sandbox-instance/:sandboxInstanceId/console/:nodeId',
        loadComponent: () =>
            import('@crczp/topology-graph').then(
                (m) => m.ConsoleFullscreenWrapperComponent,
            ),
        canActivate: [sentinelAuthGuardWithLogin],
    },

    {
        path: 'logout',
        redirectTo: 'login',
        pathMatch: 'full',
    },
    {
        path: '',
        redirectTo: 'home',
        pathMatch: 'full',
    },
];
