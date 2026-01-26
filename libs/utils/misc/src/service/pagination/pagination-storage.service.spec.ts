import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import {
    PaginationRegistryService,
    PaginationStorageService,
} from './pagination-storage.service';
import { TestBed } from '@angular/core/testing';
import { runInInjectionContext } from '@angular/core';
import { PortalConfig } from '../../types/config';

describe('Pagination should load', () => {
    let createComponent: () => PaginationStorageService;

    beforeEach(() => {
        localStorage.clear();
        TestBed.configureTestingModule({
            providers: [
                {
                    provide: PortalConfig,
                    useValue: {
                        DEFAULT_PAGE_SIZE: 10,
                    },
                },
            ],
        });

        createComponent = () =>
            runInInjectionContext(
                TestBed,
                () =>
                    new PaginationStorageService(
                        'key',
                        new PaginationRegistryService(),
                        10,
                    ),
            );
    });

    afterAll(() => {
        localStorage.clear();
    });

    it('should be able to create paginated component', () => {
        const component = createComponent();
        expect(component).toBeDefined();
        expect(component.loadPageSize()).toBeDefined();
        expect(component.savePageSize).toBeDefined();
        expect(component.DEFAULT_PAGE_SIZE).toBeDefined();
    });

    it('should return default page size', () => {
        const component = createComponent();
        expect(component.loadPageSize()).toBe(component.DEFAULT_PAGE_SIZE);
    });

    it('should set and get page size', () => {
        const component = createComponent();
        const newPageSize = 20;
        component.savePageSize(newPageSize);
        expect(component.loadPageSize()).toBe(newPageSize);
    });
});
