import { ResolveData, ResolveFn, Route } from '@angular/router';
import { DEFINED_ROUTES } from './router-definitions';

/**
 * Static values a route may attach for the layout shell to read.
 *
 * `title` feeds the page heading, `breadcrumb` the navigation trail, and
 * `showSwitch` a component-level toggle. Each accepts `undefined` so a route
 * can suppress an inherited value.
 */
export type RouteData = {
    title?: string | undefined;
    breadcrumb?: string | undefined;
    preloadRoleCondition?: string | undefined;
    showSwitch?: boolean | undefined;
};

/**
 * Resolvers permitted for the label keys the layout shell reads, constraining
 * each to produce a string rather than arbitrary route data.
 */
type RouteLabelResolvers = {
    title?: ResolveFn<string>;
    breadcrumb?: ResolveFn<string>;
};

type StripExcl<K extends string> = K extends `EXCL_${infer Rest}` ? Rest : K;

type ToPathPart<K extends string> = StripExcl<K> extends `VAR_${infer Param}`
    ? `:${Param}`
    : StripExcl<K>;

type JoinPath<A extends string, B extends string> = A extends ''
    ? B
    : B extends ''
    ? A
    : `${A}/${B}`;

type IsNavigable<K extends string> = K extends `EXCL_${string}` ? false : true;

type ExtractNavigablePaths<T, Prefix extends string = ''> = {
    [K in keyof T]:
        | (IsNavigable<K & string> extends true
              ? JoinPath<Prefix, ToPathPart<K & string>>
              : never)
        | (T[K] extends object
              ? ExtractNavigablePaths<
                    T[K],
                    JoinPath<Prefix, ToPathPart<K & string>>
                >
              : never);
}[keyof T];

type TrimLeadingSlash<T extends string> = T extends `/${infer R}` ? R : T;

type PathSuffixes<
    AllPaths extends string,
    Prefix extends string
> = AllPaths extends unknown
    ? TrimLeadingSlash<AllPaths> extends infer Trimmed extends string
        ? Prefix extends ''
            ? Trimmed
            : Trimmed extends `${Prefix}/${infer Suffix}`
            ? Suffix
            : Trimmed extends Prefix
            ? ''
            : never
        : never
    : never;

type JoinPrefixes<
    Parts extends string[],
    Result extends string = ''
> = Parts extends [infer Head extends string, ...infer Tail extends string[]]
    ? Result extends ''
        ? Head | JoinPrefixes<Tail, Head>
        : `${Result}/${Head}` | JoinPrefixes<Tail, `${Result}/${Head}`>
    : never;

type PathPrefix<
    Path extends string,
    Acc extends string[] = []
> = Path extends `${infer Segment}/${infer Rest}`
    ? PathPrefix<Rest, [...Acc, Segment]>
    : [...Acc, Path] extends infer Parts
    ? Parts extends string[]
        ? JoinPrefixes<Parts>
        : never
    : never;

type ExtractParamsFromPath<T extends string> =
    T extends `${string}/:${infer Param}/${infer Rest}`
        ? Param | ExtractParamsFromPath<`/${Rest}`>
        : T extends `${string}/:${infer Param}`
        ? Param
        : never;

type JoinPathIfValidPrefix<A extends string, B extends string> = JoinPath<
    A,
    B
> extends ValidPathPrefix
    ? JoinPath<A, B>
    : never;

type ValidRouteConfig<Prefix extends ValidPathPrefix> = Omit<
    Route,
    'path' | 'children' | 'redirectTo' | 'data' | 'resolve'
> & {
    path?: '' | PathSuffixes<ValidPath, Prefix>;
    redirectTo?: '' | PathSuffixes<ValidPath, Prefix>;
    data?: RouteData;
    resolve?: RouteLabelResolvers & ResolveData;
    children?: PathSuffixes<
        ValidPath,
        Prefix
    > extends infer Suffix extends string
        ? ValidRouterConfig<JoinPathIfValidPrefix<Prefix, Suffix>>
        : never;
};

/**
 * Type describing all possible path prefixes for CRCZP
 */
export type ValidPathPrefix = '' | PathPrefix<ValidPath>;

export type ValidPathParam = ExtractParamsFromPath<ValidPath>;

export type ValidPathParamByPrefix<Prefix extends ValidPathPrefix> =
    | `${Prefix}`
    | `${Prefix}/${ValidPathSuffix<Prefix>}` extends infer SubPath
    ? SubPath extends string
        ? ExtractParamsFromPath<`/${SubPath}`>
        : never
    : never;

/**
 * Type describing all possible path suffixes for a given prefix from `NavigablePathPrefixes`
 */
export type ValidPathSuffix<Prefix extends ValidPathPrefix> = PathSuffixes<
    ValidPath,
    Prefix
>;

export type ValidPath = ExtractNavigablePaths<typeof DEFINED_ROUTES>;

export type ValidRouterConfig<Prefix extends ValidPathPrefix> =
    ValidRouteConfig<Prefix>[];

type StripMarkers<K extends string> = K extends `${string}VAR_${infer Rest}`
    ? StripMarkers<Rest>
    : K extends `${string}EXCL_${infer Rest}`
    ? StripMarkers<Rest>
    : K;

type SafeKey<K extends string> = K extends `${infer A}-${infer B}`
    ? `${A}_${SafeKey<B>}`
    : K;

export type NavigationBuilder<T, Path extends string = ''> = {
    [K in keyof T as K extends string
        ? StripMarkers<K> extends infer SK extends string
            ? SafeKey<SK>
            : never
        : never]: K extends string
        ? K extends `${string}VAR_${infer Param}`
            ? (
                  value: any
              ) => NavigationBuilder<T[K], JoinPath<Path, `:${Param}`>>
            : NavigationBuilder<T[K], JoinPath<Path, ToPathPart<K>>>
        : never;
} & (Path extends ''
    ? object
    : {
          build: () => Path;
      });
