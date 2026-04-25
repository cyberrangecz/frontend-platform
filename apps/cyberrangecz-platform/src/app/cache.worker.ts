/// <reference lib="webworker" />

import { IdbFs, PGlite } from '@electric-sql/pglite';
import { worker } from '@electric-sql/pglite/worker';

worker({
  async init() {
    return new PGlite({
      fs: new IdbFs('event-cache-v1'),
      relaxedDurability: true,
    });
  },
});
