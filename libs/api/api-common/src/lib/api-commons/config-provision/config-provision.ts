import { Type } from '@angular/core';

export function provideApiConfig<
    ConfigType extends object,
    ComponentType extends { apiConfig: ConfigType }
>(
    component: Type<ComponentType>,
    provided: Type<ConfigType>
): {
    provide: Type<ConfigType>;
    useFactory: (component: ComponentType) => ConfigType;
    deps: [Type<ComponentType>];
} {
    return {
        provide: provided,
        useFactory: (component: ComponentType) => component.apiConfig,
        deps: [component],
    };
}
