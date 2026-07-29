import { inject } from '@angular/core';
import { Group, User } from '@crczp/user-and-group-model';
import { Pool, SandboxDefinition } from '@crczp/sandbox-model';
import { TrainingDefinition, TrainingInstance } from '@crczp/training-model';
import { of } from 'rxjs';
import { defineRouteEntity } from './resolver/define-route-entity';
import { TrainingResolverHelperService } from './resolver/training/training-resolver-helper.service';
import { SandboxResolverHelperService } from './resolver/sandbox/sandbox-resolver-helper.service';
import { UserAndGroupResolverHelperService } from './resolver/user-and-group/user-and-group-resolver-helper.service';
import { RoutingUtils } from './utils';

/**
 * Training instance addressed by `instanceId`, labelled by its title.
 */
export const resolveTrainingInstance = defineRouteEntity<TrainingInstance>({
    key: TrainingInstance.name,
    fetch: (route) => inject(TrainingResolverHelperService).getInstance(route),
    redirect: () => inject(TrainingResolverHelperService).instanceOverviewUrl(),
});

/**
 * Training definition addressed by `definitionId`, labelled by its title.
 */
export const resolveTrainingDefinition = defineRouteEntity<TrainingDefinition>({
    key: TrainingDefinition.name,
    fetch: (route) => inject(TrainingResolverHelperService).getDefinition(route),
    redirect: () =>
        inject(TrainingResolverHelperService).definitionOverviewUrl(),
});

/**
 * Pool addressed by `poolId`, labelled by its identifier as pools carry no name.
 */
export const resolvePool = defineRouteEntity<Pool>({
    key: Pool.name,
    fetch: (route) => inject(SandboxResolverHelperService).getPool(route),
    redirect: () => inject(SandboxResolverHelperService).poolOverviewUrl(),
});

/**
 * Sandbox definition addressed by `definitionId`, labelled by its title.
 */
export const resolveSandboxDefinition = defineRouteEntity<SandboxDefinition>({
    key: SandboxDefinition.name,
    fetch: (route) =>
        inject(SandboxResolverHelperService).getSandboxDefinition(route),
    redirect: () =>
        inject(SandboxResolverHelperService).sandboxDefinitionOverviewUrl(),
});

/**
 * Group addressed by `groupId`, labelled by its name.
 */
export const resolveGroup = defineRouteEntity<Group>({
    key: Group.name,
    fetch: (route) => inject(UserAndGroupResolverHelperService).getGroup(route),
    redirect: () =>
        inject(UserAndGroupResolverHelperService).groupOverviewUrl(),
});

/**
 * User addressed by `userId`, labelled by their name.
 */
export const resolveUser = defineRouteEntity<User>({
    key: User.name,
    fetch: (route) => {
        const userId = RoutingUtils.extractVariable<'user'>('userId', route);
        if (userId === null) {
            return of(null);
        }
        return inject(UserAndGroupResolverHelperService).getUser(userId);
    },
    redirect: () => inject(UserAndGroupResolverHelperService).userOverviewUrl(),
});
