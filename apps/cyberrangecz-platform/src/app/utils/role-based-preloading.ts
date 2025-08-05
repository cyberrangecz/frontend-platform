import { inject, Injectable } from '@angular/core';
import { PreloadingStrategy, Route } from '@angular/router';
import { Observable, of } from 'rxjs';
import { RoleService } from '../services/role.service';

@Injectable({
    providedIn: 'root',
})
export class RoleBasedPreloader implements PreloadingStrategy {
    private readonly rolesService = inject(RoleService);

    preload(
        route: Route,
        load: () => Observable<unknown>
    ): Observable<unknown> {
        const hasResolveCondition =
            route.data && route.data['preloadRoleCondition'];

        if (
            !hasResolveCondition ||
            this.rolesService.hasRole(route.data['preloadRoleCondition'])
        ) {
            load();
        }
        return of(null);
    }
}
