> WORK IN PROGRESS - Parts of this codebase are still in development and as such, this version serves only as a preview

# CyberRangeᶜᶻ Platform

Nx monorepo containing the CyberRangeCZ Platform frontend.

## Prerequisites

- You need to have access to Sentinel package repository to pull the Sentinel dependencies.
  Then, you need to set up the @sentinel scope to point to that registry. You can do this by
  adding following lines to your .npmrc file:

    ```
    @sentinel:registry=https://gitlab.ics.muni.cz/api/v4/projects/2396/packages/npm/
    //gitlab.ics.muni.cz/api/v4/projects/2396/packages/npm/:_authToken=<YOUR_AUTH_TOKEN>
    ```

  where `<YOUR_AUTH_TOKEN>` is a Gitlab access token with `read_registry` scope and `api` score of a user with access
  to [Sentinel package repository](https://gitlab.ics.muni.cz/sentinel/sentinel-artifact-repository)

- To run the application, Node version >=20.19.0 is required.

## Running the app locally against the CyberRangeᶜᶻ Platform backend

1. Configure and run the [Helm deployment](https://github.com/cyberrangecz/devops-helm). Make sure to use `development: true` for Keycloak configuration in `vagrant-values.yaml`. This will add `https://localhost:4200` to the OIDC redirect URIs.
    - in case, you need to override CORS, edit it in the [Helm deployment file](https://github.com/cyberrangecz/devops-helm/blob/master/helm/crczp-head/values.yaml) using corsWhitelist
2. Run `npm install`
3. Run `nx serve cyberrangecz-platform --ssl`
4. Open `https://localhost:4200` in your browser. The app will automatically reload if you change any of the source files. App will be using self-signed certificate, so you need to accept it in your browser.

## Deployment

To build the Docker image without uploading, run `docker build .`

To build and push Docker image to an existing [Helm deployment](https://github.com/cyberrangecz/devops-helm), you can use the [deployment push script](./push.sh):

```bash
./push.sh -u <SSH user> -h <host address> -k <path to SSH identity file> Dockerfile 
```

This script builds the Docker image, uploads it to the host over ssh and modifies the Kubernetes deployment to replace the current running version of the image.

## Applications

- [cyberrangecz-platform](./apps/cyberrangecz-platform/README.md) - Main platform application
- [cyberrangecz-platform-e2e](./apps/cyberrangecz-platform-e2e/README.md) - End-to-end tests for the main platform

## Libraries

### Agenda

Agendas utilise other libraries to provide the individual pages of the application relevant to their scope.

- [sandbox-agenda](./libs/agenda/sandbox-agenda/README.md) - Sandbox agenda management
- [training-agenda](./libs/agenda/training-agenda/README.md) - Training agenda management
- [user-and-group-agenda](./libs/agenda/user-and-group-agenda/README.md) - User and group agenda management

### API

Api libraries provide abstraction layer over REST API calls via simple function calls.

- [api-common](./libs/api/api-common/README.md) - Common API utilities
- [sandbox-api](./libs/api/sandbox-api/README.md) - Sandbox API client
- [training-api](./libs/api/training-api/README.md) - Training API client
- [user-and-group-api](./libs/api/user-and-group-api/README.md) - User and group API client
- [visualization-api](./libs/api/visualization-api/README.md) - Visualization API client

### Utils

Small utility functions, classes and services.

- [components](./libs/utils/components/README.md) - Shared utility UI components
- [routing](./libs/utils/routing/README.md) - Common routing utilities
- [misc](./libs/utils/misc/README.md) - Various small pieces of code

### Components

Collection of self-contained reusable components.

### Model

Key type definitions for objects received from the API.

- [sandbox-model](./libs/model/sandbox-model/README.md) - Sandbox data models
- [training-model](./libs/model/training-model/README.md) - Training data models
- [user-and-group-model](./libs/model/user-and-group-model/README.md) - User and group data models
- [visualization-model](./libs/model/visualization-model/README.md) - Visualization data models
