import { User } from '@sentinel/auth';
import { RoleResolver } from './role-resolver';
import { NavAgendaContainerConfig } from '@crczp/utils';
import { ValidPathPrefix } from '@crczp/routing-commons';

export class NavConfigFactory {
    static buildNavConfig(user: User): NavAgendaContainerConfig[] {
        return [
            {
                label: 'Trainings',
                agendas: [
                    {
                        label: 'Definition',
                        agendas: [
                            {
                                label: 'Adaptive',
                                path: 'adaptive-definition' satisfies ValidPathPrefix,
                                canActivate: () =>
                                    RoleResolver.isAdaptiveTrainingDesigner(
                                        user.roles,
                                    ),
                            },
                            {
                                label: 'Linear',
                                path: 'linear-definition' satisfies ValidPathPrefix,
                                canActivate: () =>
                                    RoleResolver.isTrainingDesigner(user.roles),
                            },
                        ],
                    },
                    {
                        label: 'Instance',
                        agendas: [
                            {
                                label: 'Adaptive',
                                path: 'adaptive-instance' satisfies ValidPathPrefix,
                                canActivate: () =>
                                    RoleResolver.isAdaptiveTrainingOrganizer(
                                        user.roles,
                                    ),
                            },
                            {
                                label: 'Linear',
                                path: 'linear-instance' satisfies ValidPathPrefix,
                                canActivate: () =>
                                    RoleResolver.isTrainingOrganizer(
                                        user.roles,
                                    ),
                            },
                        ],
                    },
                    {
                        label: 'Run',
                        path: 'run' satisfies ValidPathPrefix,
                    },
                ],
            },
            {
                label: 'Sandboxes',
                agendas: [
                    {
                        label: 'Definition',
                        path: 'sandbox-definition' satisfies ValidPathPrefix,
                        canActivate: () =>
                            RoleResolver.isAdaptiveTrainingDesigner(user.roles),
                    },
                    {
                        label: 'Pool',
                        path: 'pool' satisfies ValidPathPrefix,
                        canActivate: () =>
                            RoleResolver.isTrainingOrganizer(user.roles),
                    },
                    {
                        label: 'Images',
                        path: 'sandbox-image' satisfies ValidPathPrefix,
                        canActivate: () =>
                            RoleResolver.isTrainingOrganizer(user.roles),
                    },
                ],
            },
            {
                label: 'Administration',
                agendas: [
                    {
                        label: 'User',
                        path: 'user' satisfies ValidPathPrefix,
                        canActivate: () =>
                            RoleResolver.isUserAndGroupAdmin(user.roles),
                    },
                    {
                        label: 'Group',
                        path: 'group' satisfies ValidPathPrefix,
                        canActivate: () =>
                            RoleResolver.isUserAndGroupAdmin(user.roles),
                    },
                    {
                        label: 'Microservice',
                        path: 'microservice' satisfies ValidPathPrefix,
                        canActivate: () =>
                            RoleResolver.isUserAndGroupAdmin(user.roles),
                    },
                ],
            },
        ];
    }
}
