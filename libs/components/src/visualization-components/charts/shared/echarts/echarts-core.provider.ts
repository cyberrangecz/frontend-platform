import { provideEchartsCore } from 'ngx-echarts';

/**
 * Pre-built Angular provider that registers the lazy-loaded ECharts core
 * bundle with ngx-echarts. Declared as a reusable constant because Angular
 * does NOT inherit `providers` from a base class — each concrete
 * `@Component` that uses ngx-echarts must list this in its own `providers`
 * array.
 *
 * Usage:
 * ```ts
 * @Component({ providers: [ECHARTS_CORE_PROVIDER] })
 * ```
 */
export const ECHARTS_CORE_PROVIDER = provideEchartsCore({ echarts: () => import('echarts') });
