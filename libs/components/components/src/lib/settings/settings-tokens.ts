import { InjectionToken } from '@angular/core';

export const PageSizeSettingToken = new InjectionToken<number>('pagination-size-token');

export const PollingPeriodShortSetting = new InjectionToken<number>('polling-period-short');
export const PollingPeriodLongSetting = new InjectionToken<number>('polling-period-long');

export const RetryCountSettingToken = new InjectionToken<number>('retry-count-setting-token');
