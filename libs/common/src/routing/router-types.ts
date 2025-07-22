import {Route} from "@angular/router";
import {DEFINED_ROUTES} from "./router-definitions";

type StripExcl<K extends string> =
    K extends `EXCL_${infer Rest}` ? Rest : K;

type ToPathPart<K extends string> =
    StripExcl<K> extends `VAR_${infer Param}` ? `:${Param}` :
        StripExcl<K>;

type JoinPath<A extends string, B extends string> =
    A extends '' ? B :
        B extends '' ? A :
            `${A}/${B}`;

type SplitPath<T extends string> =
    T extends `${infer Head}/${infer Rest}`
        ? Head | SplitPath<Rest>
        : T;


type IsNavigable<K extends string> = K extends `EXCL_${string}` ? false : true;

type ExtractNavigablePaths<T, Prefix extends string = ''> = {
    [K in keyof T]:
    | (IsNavigable<K & string> extends true
    ? JoinPath<Prefix, ToPathPart<K & string>>
    : never)
    | (T[K] extends object
    ? ExtractNavigablePaths<T[K], JoinPath<Prefix, ToPathPart<K & string>>>
    : never)
}[keyof T];


type TrimLeadingSlash<T extends string> = T extends `/${infer R}` ? R : T;

type PathSuffixes<AllPaths extends string, Prefix extends string> =
    AllPaths extends unknown
        ? TrimLeadingSlash<AllPaths> extends infer Trimmed
            ? Prefix extends ''
                ? Trimmed extends `${infer First}/${string}` ? First : Trimmed
                : Trimmed extends `${Prefix}/${infer Suffix}`
                    ? Suffix
                    : Trimmed extends Prefix
                        ? ''
                        : never
            : never
        : never;

type JoinPrefixes<Parts extends string[], Result extends string = ''> =
    Parts extends [infer Head extends string, ...infer Tail extends string[]]
        ? Result extends ''
            ? Head | JoinPrefixes<Tail, Head>
            : `${Result}/${Head}` | JoinPrefixes<Tail, `${Result}/${Head}`>
        : never;

type PathPrefix<Path extends string, Acc extends string[] = []> =
    Path extends `${infer Segment}/${infer Rest}`
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

type JoinPathIfValidPrefix<A extends string, B extends string> =
    JoinPath<A, B> extends ValidPathPrefix ? JoinPath<A, B> : never;


type ValidRouteConfig<Prefix extends ValidPathPrefix> =
    Omit<Route, 'path' | 'children' | 'redirectTo'>
    & {
    path?: '' | PathSuffixes<ValidPath, Prefix>;
    redirectTo?: '' | PathSuffixes<ValidPath, Prefix>;
    children?: PathSuffixes<ValidPath, Prefix> extends infer Suffix extends string
        ? ValidRouterConfig<JoinPathIfValidPrefix<Prefix, Suffix>>
        : never;
};

type SplitPathToTuple<S extends string> =
    S extends `${infer Head}/${infer Tail}`
        ? [Head, ...SplitPathToTuple<Tail>]
        : S extends '' ? [] : [S];

type Join<T extends string[]> =
    T extends [] ? never :
        T extends [infer Head extends string]
            ? Head
            : T extends [infer Head extends string, ...infer Tail extends string[]]
                ? `${Head}/${Join<Tail>}`
                : never;

type Concat<A extends string[], B extends string[]> = [...A, ...B];

type _ContiguousFromStart<T extends string[], Acc extends string[] = [], Res extends string[][] = []> =
    T extends [infer Head extends string, ...infer Rest extends string[]]
        ? _ContiguousFromStart<Rest, [...Acc, Head], [...Res, [...Acc, Head]]>
        : Res;

type ContiguousSlices<T extends string[], Acc extends string[][] = []> =
    T extends [infer _First extends string, ...infer Rest extends string[]]
        ? _ContiguousFromStart<T> extends infer Slices extends string[][]
            ? ContiguousSlices<Rest, [...Acc, ...Slices]>
            : never
        : Acc;

type JoinContiguousSlices<Slices extends string[][]> =
    Slices extends [infer Head extends string[], ...infer Tail extends string[][]]
        ? Join<Head> | JoinContiguousSlices<Tail>
        : never;

type AllContiguousPathSegments<Path extends string> =
    JoinContiguousSlices<ContiguousSlices<SplitPathToTuple<Path>>>;


/**
 * Type describing all possible path prefixes for CRCZP
 */
export type ValidPathPrefix = '' | PathPrefix<ValidPath>;

export type ValidPathParam = ExtractParamsFromPath<ValidPath>;

export type ValidPathParamByPrefix<Prefix extends ValidPathPrefix> =
        `${Prefix}` | `${Prefix}/${ValidPathSuffix<Prefix>}` extends infer SubPath
    ? SubPath extends string
        ? ExtractParamsFromPath<`/${SubPath}`>
        : never
    : never;


/**
 * Type describing all possible path suffixes for a given prefix from `NavigablePathPrefixes`
 */
export type ValidPathSuffix<Prefix extends ValidPathPrefix> =
    PathSuffixes<ValidPath, Prefix>;

export type ValidPath = ExtractNavigablePaths<typeof DEFINED_ROUTES>;

export type ValidRouterConfig<Prefix extends ValidPathPrefix> = ValidRouteConfig<Prefix>[]

export type ValidSegment = ValidPath extends infer P extends string
    ? AllContiguousPathSegments<P>
    : never;

export type ValidSubsegment<Segment extends ValidSegment> = AllContiguousPathSegments<Segment>

type StripMarkers<K extends string> = K extends `${string}VAR_${infer Rest}`
    ? StripMarkers<Rest>
    : K extends `${string}EXCL_${infer Rest}`
        ? StripMarkers<Rest>
        : K;

type SafeKey<K extends string> = K extends `${infer A}-${infer B}` ? `${A}_${SafeKey<B>}` : K;

export type NavigationBuilder<T, Path extends string = ''> = {
    [K in keyof T as K extends string ? StripMarkers<K> extends infer SK extends string ? SafeKey<SK> : never : never]:
    K extends string
        ? K extends `${string}VAR_${infer Param}`
            ? (value: any) => NavigationBuilder<T[K], JoinPath<Path, `:${Param}`>>
            : NavigationBuilder<T[K], JoinPath<Path, ToPathPart<K>>>
        : never;
} & (Path extends '' ? {} : {
    build: () => Path
});
