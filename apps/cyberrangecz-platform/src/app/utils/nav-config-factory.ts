import {User} from '@sentinel/auth';
import {RoleResolver} from './role-resolver';
import {NavAgendaContainerConfig, ValidPath} from "@crczp/common";

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
                                path: 'adaptive-definition' satisfies ValidPath,
                                canActivate: () => RoleResolver.isAdaptiveTrainingDesigner(user.roles),
                            },
                            {
                                label: 'Linear',
                                path: 'linear-definition' satisfies ValidPath,
                                canActivate: () => RoleResolver.isTrainingDesigner(user.roles),
                            },
                        ],
                    },
                    {
                        label: 'Instance',
                        agendas: [
                            {
                                label: 'Adaptive',
                                path: 'adaptive-instance' satisfies ValidPath,
                                canActivate: () => RoleResolver.isAdaptiveTrainingOrganizer(user.roles),
                            },
                            {
                                label: 'Linear',
                                path: 'linear-instance' satisfies ValidPath,
                                canActivate: () => RoleResolver.isTrainingOrganizer(user.roles),
                            },
                        ],
                    },
                    {
                        label: 'Run',
                        path: 'run' satisfies ValidPath,
                    },
                ],
            },
            {
                label: 'Sandboxes',
                agendas: [
                    {
                        label: 'Definition',
                        path: 'sandbox-definition' satisfies ValidPath,
                        canActivate: () => RoleResolver.isAdaptiveTrainingDesigner(user.roles),
                    },
                    {
                        label: 'Pool',
                        path: 'pool' satisfies ValidPath,
                        canActivate: () => RoleResolver.isTrainingOrganizer(user.roles),
                    },
                    {
                        label: 'Images',
                        path: 'sandbox-image' satisfies ValidPath,
                        canActivate: () => RoleResolver.isTrainingOrganizer(user.roles),
                    },
                ],
            },
            {
                label: 'Administration',
                agendas: [
                    {
                        label: 'User',
                        path: 'user' satisfies ValidPath,
                        canActivate: () => RoleResolver.isUserAndGroupAdmin(user.roles),
                    },
                    {
                        label: 'Group',
                        path: 'group' satisfies ValidPath,
                        canActivate: () => RoleResolver.isUserAndGroupAdmin(user.roles),
                    },
                    {
                        label: 'Microservice',
                        path: 'microservice' satisfies ValidPath,
                        canActivate: () => RoleResolver.isUserAndGroupAdmin(user.roles),
                    },
                ],
            },
        ];
    }
}
