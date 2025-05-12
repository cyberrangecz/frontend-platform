import { inject, InjectionToken, Provider, Type } from '@angular/core';

export function provideComponentProperty<
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
            return valueFromComponent !== undefined ? valueFromComponent : injectedValue!;
        }
    };
}
