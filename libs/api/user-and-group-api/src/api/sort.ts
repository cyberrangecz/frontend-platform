export type UserSort =
    | 'id'
    | 'sub'
    | 'iss'
    | 'fullName'
    | 'givenName'
    | 'familyName'
    | 'mail'
    | 'status'
    | 'externalId';

export type RoleSort = 'id' | 'roleType' | 'description';

export type GroupSort =
    | 'id'
    | 'name'
    | 'description'
    | 'status'
    | 'externalId'
    | 'expirationDate';

export type MicroserviceSort = 'id' | 'name' | 'endpoint';
