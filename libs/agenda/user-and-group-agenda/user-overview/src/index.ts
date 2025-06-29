/*
 * Public API Surface of entry point user-and-group-agenda/user-overview
 */

export {UserComponentsModule} from './components/user-components.module';
export {UserOverviewComponent} from '../../src/user-overview/src/components/user-overview.component';
export {UserOverviewService} from './services/overview/user-overview.service';
export {UserMaterialModule} from './components/user-material.module';
export {UserResolverService} from '../../src/user-overview/src/services/resolvers/user-resolver.service';
export {UserTitleResolverService} from '../../src/user-overview/src/services/resolvers/user-title-resolver.service';
export {
    UserBreadcrumbResolverService
} from '../../src/user-overview/src/services/resolvers/user-breadcrumb-resolver.service';
