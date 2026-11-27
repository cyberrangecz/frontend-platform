class ResizeObserverStub implements ResizeObserver {
    observe(): void {}
    unobserve(): void {}
    disconnect(): void {}
}

globalThis.ResizeObserver ??= ResizeObserverStub;

const isInstanceOfWindow = Function.prototype[Symbol.hasInstance].bind(Window);
Object.defineProperty(Window, Symbol.hasInstance, {
    value: (candidate: unknown) => candidate === globalThis || isInstanceOfWindow(candidate),
});

import '@angular/compiler';
import '@analogjs/vitest-angular/setup-zone';

import {
    BrowserTestingModule,
    platformBrowserTesting,
} from '@angular/platform-browser/testing';
import { getTestBed } from '@angular/core/testing';

getTestBed().initTestEnvironment(
    BrowserTestingModule,
    platformBrowserTesting(),
);
