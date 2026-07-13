import { AbstractType, inject, InjectionToken, Provider, Type } from '@angular/core';

/**
 * Checks whether each token in {@link deps} is resolvable in the current
 * injector and emits a single `console.warn` listing every missing one.
 *
 * Call inside a class constructor (injection context required).
 *
 * @param deps Tokens to probe — `Type<T>` or `InjectionToken<T>`.
 * @param providerFn The provider function consumers should call to wire the
 *   missing deps. Its {@link Function.name} is included in the warning message.
 *
 * @example
 * constructor() {
 *   warnMissingProviders([EntityFetchApi], provideEntityResolverService);
 * }
 */
function warnMissingProviders(
    deps: (Type<unknown> | AbstractType<unknown> | InjectionToken<unknown>)[],
    providerFn: (...args: never[]) => unknown,
): void {
    const missing = deps
        .filter((dep) => inject(dep, { optional: true }) === null)
        .map((dep) =>
            dep instanceof InjectionToken ? dep.toString() : dep.name,
        );

    if (missing.length > 0) {
        console.warn(
            `[DI] Missing providers: ${missing.join(', ')}. ` +
                `Call ${providerFn.name}() in your ApplicationConfig or route providers.`,
        );
    }
}

function provideComponentProperty<
    ConfigType,
    PropertyKey extends string,
    ComponentType extends { [K in PropertyKey]?: ConfigType }
>(
    component: Type<ComponentType>,
    providedToken: InjectionToken<ConfigType> | Type<ConfigType>,
    propertyKey: PropertyKey
): Provider {
    return {
        provide: providedToken,
        useFactory: () => {
            const componentInstance = inject(component);
            const injectedValue = inject(providedToken, { optional: true });

            const valueFromComponent = componentInstance[propertyKey];
            return valueFromComponent !== undefined
                ? valueFromComponent
                : injectedValue!;
        },
    };
}

export const ProvisionUtil = {
    provideComponentProperty,
    warnMissingProviders,
};
