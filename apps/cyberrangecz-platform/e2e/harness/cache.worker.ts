/// <reference lib="webworker" />

import { initSqliteCacheWorker } from '@crczp/event-query-engine';

initSqliteCacheWorker({ vfsName: 'event-cache-harness-v1' });
