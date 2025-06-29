/**
 * Creates routes to navigate between components and pages of user and group-overview agenda. Default implementation is provived,
 * but can be overridden by client if custom routes are desired
 */
export abstract class UserAndGroupNavigator {
    /**
     * Returns route to user overview page
     */
    abstract toUserOverview(): string;

    /**
     * Returns route to user detail page
     */
    abstract toUserDetail(id: number | string): string;

    /**
     * Return route to group-overview overview page
     */
    abstract toGroupOverview(): string;

    /**
     * Returns route to group-overview state page
     * @param id id of the group-overview
     */
    abstract toGroupEdit(id: number | string): string;

    /**
     * Returns route to new group-detail page
     */
    abstract toGroupDetail(id: number | string): string;

    /**
     * Returns route to new group-overview page
     */
    abstract toNewGroup(): string;

    /**
     * Returns route to new microservice-overview page
     */
    abstract toMicroserviceOverview(): string;

    /**
     * Returns route to new microservice-registration page
     */
    abstract toNewMicroservice(): string;
}
