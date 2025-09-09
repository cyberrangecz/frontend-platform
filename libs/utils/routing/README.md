# CyberRangeᶜᶻ Platform Utils Routing

This library is key for safely using routing within the platform as it provides type-safe methods for routing, ensuring that only valid routes are used and preventing runtime errors from invalid paths.

## Router Types

The `router-types.ts` file defines TypeScript types for type-safe routing:

- **ValidPathPrefix**: Type describing all possible path prefixes for the platform.
- **ValidPathParam**: Type describing valid path parameters for a valid path.
- **ValidPathParamByPrefix**: Type for parameters specific to a given path prefix.
- **ValidPathSuffix**: Type describing all possible path suffixes for a given prefix.
- **ValidPath**: Type describing all possible navigable paths in the platform.
- **ValidRouterConfig**: Type for valid router configurations with type-safe paths.
- **ValidSegment**: Type for valid path segments, any continuous sequence of slash separated segments.


## Routing Namespace

The `routing-namespace.ts` exports the `Routing` object with the following properties:

- **ValidRoutes**: A dictionary containing only valid routes with value `true`, used for route validation.
- **RouteBuilder**: A builder method for creating a valid route within the platform according to the `DEFINED_ROUTES` object.
- **Utils**: Contains utility methods for routing:
  - `createUrlTree`: Creates a UrlTree from a valid path.
  - `appendPath`: Appends a suffix to a prefix to form a valid path.
  - `extractVariable`: Extracts a variable from the route parameters.
  - `hasVariable`: Checks if a variable exists in the route.
  - `containsSubroute`: Checks if a subroute is contained in the current router state.
- **Resolvers**: Groups of resolver functions for different domains:
  - User and Group resolvers
  - Training resolvers (Run, Instance, Definition, Cheating Detection)
  - Sandbox resolvers (Sandbox, Pool, Definition)

Additionally, the library exports resolver helper services for sandbox, training, and user-and-group domains which are required by the resolvers to work properly.
