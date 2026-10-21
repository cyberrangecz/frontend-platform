# CyberRangeᶜᶻ Platform Sandbox Agenda

Sandbox Agenda is a library containing components and services to manage sandbox definitions, pools, and sandbox instances.
It is developed as a frontend of [Sandbox service](https://github.com/cyberrangecz/backend-sandbox-service)

The library follows smart-dumb architecture. Smart components are exported from the library, and you can use them at your will. The project contains example implementation with lazy loading modules which you can use as an inspiration.
You can modify the behaviour of components by implementing abstract service class and injecting it through Angular dependency injection.

## Features

* Components and services for managing sandbox definitions
* Components and services for managing pools
* Components and services for managing sandbox instances
* Components and services for managing sandbox allocation and allocation stages

## Backend contract changes

* Creating a sandbox definition: the backend answers HTTP 422 (previously reported by the frontend as 500, and answered as 400 by the backend) when it cannot read the Git repository (wrong URL, missing revision, no access). `SandboxDefinitionEditConcreteService` shows the repository message for 422 only.
* Creating a sandbox definition: the Git URL field applies the backend's URL check before submit. A URL must start with `https://` and end with `.git`, unless it contains `github.`, which the backend accepts without that check.
