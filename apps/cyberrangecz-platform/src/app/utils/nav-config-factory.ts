import {User} from '@sentinel/auth';
import {
    ADAPTIVE_DEFINITION_PATH,
    ADAPTIVE_INSTANCE_PATH,
    TRAINING_DEFINITION_PATH,
    TRAINING_INSTANCE_PATH,
    TRAINING_RUN_PATH,
} from '@crczp/training-agenda';
import {RoleResolver} from './role-resolver';
import {SANDBOX_DEFINITION_PATH, SANDBOX_IMAGES_PATH, SANDBOX_POOL_PATH} from '@crczp/sandbox-agenda';
import {GROUP_PATH, MICROSERVICE_PATH, USER_PATH} from '@crczp/user-and-group-agenda';
import {NavAgendaContainerConfig} from "@crczp/common";

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
                                path: ADAPTIVE_DEFINITION_PATH,
                                canActivate: () => RoleResolver.isAdaptiveTrainingDesigner(user.roles),
                            },
                            {
                                label: 'Linear',
                                path: TRAINING_DEFINITION_PATH,
                                canActivate: () => RoleResolver.isTrainingDesigner(user.roles),
                            },
                        ],
                    },
                    {
                        label: 'Instance',
                        agendas: [
                            {
                                label: 'Adaptive',
                                path: ADAPTIVE_INSTANCE_PATH,
                                canActivate: () => RoleResolver.isAdaptiveTrainingOrganizer(user.roles),
                            },
                            {
                                label: 'Linear',
                                path: TRAINING_INSTANCE_PATH,
                                canActivate: () => RoleResolver.isTrainingOrganizer(user.roles),
                            },
                        ],
                    },
                    {
                        label: 'Run',
                        path: TRAINING_RUN_PATH,
                    },
                ],
            },
            {
                label: 'Sandboxes',
                agendas: [
                    {
                        label: 'Definition',
                        path: SANDBOX_DEFINITION_PATH,
                        canActivate: () => RoleResolver.isAdaptiveTrainingDesigner(user.roles),
                    },
                    {
                        label: 'Pool',
                        path: SANDBOX_POOL_PATH,
                        canActivate: () => RoleResolver.isTrainingOrganizer(user.roles),
                    },
                    {
                        label: 'Images',
                        path: SANDBOX_IMAGES_PATH,
                        canActivate: () => RoleResolver.isTrainingOrganizer(user.roles),
                    },
                ],
            },
            {
                label: 'Administration',
                agendas: [
                    {
                        label: 'User',
                        path: USER_PATH,
                        canActivate: () => RoleResolver.isUserAndGroupAdmin(user.roles),
                    },
                    {
                        label: 'Group',
                        path: GROUP_PATH,
                        canActivate: () => RoleResolver.isUserAndGroupAdmin(user.roles),
                    },
                    {
                        label: 'Microservice',
                        path: MICROSERVICE_PATH,
                        canActivate: () => RoleResolver.isUserAndGroupAdmin(user.roles),
                    },
                ],
            },
        ];
    }
}
