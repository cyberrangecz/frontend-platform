import { DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Observable } from 'rxjs';
import { distinctUntilChanged, map } from 'rxjs/operators';

/**
 * Check if a type is a plain object (not array, date, function, primitive, etc.)
 */
// eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
type IsPlainObject<T> = T extends Function
    ? false
    : T extends unknown[]
      ? false
      : T extends Date
        ? false
        : T extends object
          ? true
          : false;

/**
 * Property tree that provides observable accessors for object properties.
 * - For plain object properties: provides both a $() accessor and nested property access
 * - For primitive properties: provides only a $() accessor returning Observable<T>
 * - Limited to 3 levels of depth to prevent excessive type computation
 */
type PropertyTree<T, D extends number = 3> =
    IsPlainObject<T> extends false
        ? Record<string, never>
        : {
              [K in keyof T as T[K] extends (...args: unknown[]) => unknown
                  ? never
                  : K]: IsPlainObject<T[K]> extends true
                  ? {
                        $: (destroyRef?: DestroyRef) => Observable<T[K]>;
                    } & (D extends 0
                        ? Record<string, never>
                        : PropertyTree<T[K], Prev[D]>)
                  : {
                        $: (destroyRef?: DestroyRef) => Observable<T[K]>;
                    };
          };

/**
 * Depth decrement helper
 */
type Prev = [never, 0, 1, 2];

/**
 * Creates a property tree that allows accessing nested properties as observables.
 *
 * Example usage:
 * ```typescript
 * interface Car {
 *   wheel: {
 *     color: string;
 *     diameter: number;
 *   };
 * }
 *
 * const car$ = new BehaviorSubject<Car>(...);
 * const props = car$.observeProperty();
 *
 * props.wheel.$();           // Observable<Wheel>
 * props.wheel.color.$();     // Observable<string>
 * props.wheel.diameter.$();  // Observable<number>
 * ```
 */
function createPropertyTree<T extends object>(
    source$: Observable<T>,
    pathSegments: string[] = [],
): PropertyTree<T> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return new Proxy({} as any, {
        get: (_, property: string | symbol) => {
            if (typeof property !== 'string') {
                return undefined;
            }

            // Handle the $() accessor - creates an observable for the current path
            if (property === '$') {
                return (destroyRef?: DestroyRef) => {
                    const observable = source$.pipe(
                        map((obj) => {
                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                            let current: any = obj;
                            for (const segment of pathSegments) {
                                if (current == null) {
                                    return undefined;
                                }
                                current = current[segment];
                            }
                            return current;
                        }),
                        distinctUntilChanged(),
                    );

                    return destroyRef
                        ? observable.pipe(takeUntilDestroyed(destroyRef))
                        : observable;
                };
            }

            // Handle nested property access - create a new property tree for the nested path
            return createPropertyTree(source$, [...pathSegments, property]);
        },
    });
}

/**
 * Declaration merging to add observeProperty method to Observable.
 */
declare module 'rxjs' {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    interface Observable<T> {
        observeProperty<U extends object>(this: Observable<U>): PropertyTree<U>;
    }
}

/**
 * Add observeProperty method to Observable prototype.
 * This enables accessing nested properties as observables.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(Observable.prototype as any).observeProperty = function <T extends object>(
    this: Observable<T>,
): PropertyTree<T> {
    return createPropertyTree(this);
};
