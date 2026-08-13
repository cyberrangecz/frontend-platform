import {
    ActivatedRouteSnapshot,
    RedirectCommand,
    ResolveData,
    ResolveFn,
    UrlTree,
} from '@angular/router';
import { map, Observable, shareReplay } from 'rxjs';
import { redirectWhenAbsent } from './redirect-when-absent';

/**
 * Keys the layout shell reads a label from.
 */
type RouteLabelKey = 'title' | 'breadcrumb';

/**
 * Fields of `T` that render into a label as-is.
 */
type LabelField<T> = keyof {
    [K in keyof T as T[K] extends string | number ? K : never]: unknown;
} &
    string;

/**
 * Names enclosed in braces within `S`.
 */
type Placeholders<S extends string> =
    S extends `${string}{${infer Field}}${infer Rest}`
        ? Field | Placeholders<Rest>
        : never;

/**
 * Resolves to `S` when each of its placeholders names a renderable field of
 * `T`, and to `never` otherwise, rejecting the template at its call site.
 */
type LabelTemplate<T, S extends string> =
    Placeholders<S> extends LabelField<T> ? S : never;

/**
 * How a route entity is fetched and where a route falls back to without it.
 */
type RouteEntityConfig<T> = {
    key: string;
    fetch: (route: ActivatedRouteSnapshot) => Observable<T | null>;
    redirect: () => UrlTree;
};

/**
 * Substitutes each brace-enclosed field name in `template` with its value,
 * yielding an empty label when no entity resolved.
 */
function render<T>(template: string, entity: T | null): string {
    if (entity === null) {
        return '';
    }
    return template.replace(/\{(\w+)}/g, (_, field: string) =>
        String((entity as Record<string, unknown>)[field]),
    );
}

/**
 * Builds a route's `resolve` map from label templates written against the
 * fields of `T`.
 */
export type RouteEntityResolver<T> = <
    const L extends Partial<Record<RouteLabelKey, string>>,
>(
    labels: L & {
        [K in keyof L]: LabelTemplate<T, L[K] & string>;
    },
) => ResolveData;

/**
 * Declares a route entity, pairing its fetch with label templates written
 * against its own fields.
 *
 * The returned function builds a route's whole `resolve` map: the entity
 * under its key, redirecting when absent, plus one resolver per supplied
 * label. Every resolver on a route shares a single fetch, memoised against
 * the route snapshot so the sharing lasts exactly one navigation.
 *
 * @param config Fetch and redirect behaviour for this entity.
 */
export function defineRouteEntity<T>(
    config: RouteEntityConfig<T>,
): RouteEntityResolver<T> {
    const inFlight = new WeakMap<
        ActivatedRouteSnapshot,
        Observable<T | null>
    >();

    const source = (route: ActivatedRouteSnapshot): Observable<T | null> => {
        const cached = inFlight.get(route);
        if (cached) {
            return cached;
        }
        const fetched = config
            .fetch(route)
            .pipe(shareReplay({ bufferSize: 1, refCount: false }));
        inFlight.set(route, fetched);
        return fetched;
    };

    const entityResolver: ResolveFn<T | RedirectCommand> = (route) =>
        source(route).pipe(redirectWhenAbsent(config.redirect()));

    const labelResolver = (template: string): ResolveFn<string> => {
        if (!/\{\w+}/.test(template)) {
            return () => template;
        }
        return (route) =>
            source(route).pipe(map((entity) => render(template, entity)));
    };

    return ((labels: Partial<Record<RouteLabelKey, string>>): ResolveData => {
        const resolvers = Object.entries(labels).map(([key, template]) => [
            key,
            labelResolver(template as string),
        ]);
        return {
            [config.key]: entityResolver,
            ...Object.fromEntries(resolvers),
        };
    }) as RouteEntityResolver<T>;
}
