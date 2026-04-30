/// <reference lib="webworker" />

import { IdbFs, PGlite } from '@electric-sql/pglite';
import { worker } from '@electric-sql/pglite/worker';

worker({
  async init() {
    const [pgliteWasmModule, initdbWasmModule] = await Promise.all([
      WebAssembly.compileStreaming(fetch('/pglite.wasm')),
      WebAssembly.compileStreaming(fetch('/initdb.wasm')),
    ]);
    return new PGlite({
      fs: new IdbFs('event-cache-v1'),
      relaxedDurability: true,
      pgliteWasmModule,
      initdbWasmModule,
    });
  },
});
