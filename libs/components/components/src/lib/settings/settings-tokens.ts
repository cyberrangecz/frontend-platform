import {InjectionToken} from '@angular/core';
import {Duration} from "moment-mini";

export const DEFAULT_PAGE_SIZE_SETTING_TOKEN = new InjectionToken<number>('pagination-size-token');

export const PAGINATION_TTL_TOKEN = new InjectionToken<Duration>('pagination-ttl-token');


export const POLLING_PERIOD_SHORT_SETTING_TOKEN = new InjectionToken<number>('polling-period-short');
export const POLLING_PERIOD_LONG_SETTING_TOKEN = new InjectionToken<number>('polling-period-long');

export const RETRY_COUNT_SETTING_TOKEN = new InjectionToken<number>('retry-count-setting-token');
