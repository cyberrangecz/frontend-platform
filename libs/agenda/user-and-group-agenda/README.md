# User and Group Agenda

User and Group Agenda is a library containing components and services to manage users, groups, microservices and roles in CyberRangeᶜᶻ Platform microservices.
It is developed as a frontend of [User and Group service](https://github.com/cyberrangecz/backend-user-and-group)

The library follows smart-dumb architecture. Smart components are exported from the library, and you can use them at your will. The project contains example implementation with lazy loading modules which you can use as an inspiration.
You can modify the behaviour of components by implementing abstract service class and injecting it through Angular dependency injection.

## Features

* Overview component and services for User
* Overview component and services for Group
* Create/Edit component and services for Group
* Create component and services for Microservice
