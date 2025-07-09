import {ChangeDetectorRef} from '@angular/core';
import {ComponentFixture, fakeAsync, flush, TestBed, waitForAsync} from '@angular/core/testing';
import {By} from '@angular/platform-browser';
import {NoopAnimationsModule} from '@angular/platform-browser/animations';
import {ActivatedRoute, Router} from '@angular/router';
import {SentinelControlsComponent} from '@sentinel/components/controls';
import {Group} from 'libs/model/user-and-group-model/src';
import {BehaviorSubject, of} from 'rxjs';
import {GroupChangedEvent} from '../model/group-changed-event';
import {GroupEditService} from '../services/state/group-edit.service';
import {
    createErrorHandlerSpy,
    createGroupApiSpy,
    createNavigatorSpy,
    createNotificationSpy,
    createRouterSpy,
    createSentinelControlsOverride
} from '../../../internal/src/testing/testing-commons.spec';
import {GroupEditMaterialModule} from './group-edit-material.module';
import {GroupEditOverviewComponent} from './group-edit-overview.component';
import {GroupEditComponent} from './group-edit/group-edit.component';
import {GroupRoleAssignComponent} from './group-role-assign/group-role-assign.component';
import {GroupUserAssignComponent} from './group-user-assign/group-user-assign.component';
import {GroupApi} from 'libs/api/user-and-group-api/src';
import {UserAndGroupErrorHandler, UserAndGroupNavigator, UserAndGroupNotificationService} from '../index';

describe('GroupEditOverviewComponent', () => {
    let component: GroupEditOverviewComponent;
    let fixture: ComponentFixture<GroupEditOverviewComponent>;
    let cd: ChangeDetectorRef;

    let editServiceSpy: jasmine.SpyObj<GroupEditService>;
    let activatedRouteSpy: jasmine.SpyObj<ActivatedRoute>;
    let apiSpy: jasmine.SpyObj<GroupApi>;
    let routerSpy: jasmine.SpyObj<Router>;
    let notificationSpy: jasmine.SpyObj<UserAndGroupNotificationService>;
    let navigatorSpy: jasmine.SpyObj<UserAndGroupNavigator>;
    let errorHandlerSpy: jasmine.SpyObj<UserAndGroupErrorHandler>;

    const editModeSubject$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);

    beforeEach(waitForAsync(() => {
        activatedRouteSpy = jasmine.createSpyObj('ActivatedRoute', ['x']);
        editServiceSpy = jasmine.createSpyObj('GroupEditService', ['set', 'save', 'createAndEdit', 'change']);
        activatedRouteSpy.data = of({group: createGroup()});
        editServiceSpy.editMode$ = editModeSubject$.asObservable();
        apiSpy = createGroupApiSpy();
        routerSpy = createRouterSpy();
        navigatorSpy = createNavigatorSpy();
        errorHandlerSpy = createErrorHandlerSpy();
        notificationSpy = createNotificationSpy();

        TestBed.configureTestingModule({
            imports: [GroupEditMaterialModule, NoopAnimationsModule],
            declarations: [GroupEditOverviewComponent],
            providers: [
                {provide: GroupApi, useValue: apiSpy},
                {provide: Router, useValue: routerSpy},
                {provide: GroupEditService, useValue: editServiceSpy},
                {provide: ActivatedRoute, useValue: activatedRouteSpy},
                {provide: UserAndGroupNavigator, useValue: navigatorSpy},
                {provide: UserAndGroupErrorHandler, useValue: errorHandlerSpy},
                {provide: UserAndGroupNotificationService, useValue: notificationSpy}
            ]
        })
            .overrideComponent(SentinelControlsComponent, createSentinelControlsOverride())
            .overrideComponent(GroupEditComponent, {
                set: {
                    selector: 'crczp-group-overview-state',
                    inputs: ['group'],
                    outputs: ['onGroupChanged']
                }
            })
            .overrideComponent(GroupUserAssignComponent, {
                set: {
                    selector: 'crczp-group-overview-user-assign',
                    inputs: ['resource'],
                    outputs: ['hasUnsavedChanges']
                }
            })
            .overrideComponent(GroupRoleAssignComponent, {
                set: {
                    selector: 'crczp-group-overview-user-assign',
                    inputs: ['resource'],
                    outputs: ['hasUnsavedChanges']
                }
            })
            .compileComponents();
    }));

    beforeEach(() => {
        fixture = TestBed.createComponent(GroupEditOverviewComponent);
        component = fixture.componentInstance;
        cd = fixture.componentRef.injector.get(ChangeDetectorRef);
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
    /**
     * TODO repair tests for this component - currently failing because edit service is now provided by component
     * update - failing tests with editModeSubject$ - changes are somehow not propagated
     *        - tests testing ng-reflect-expanded not working because ng-reflect-expanded stays set to true always.
     */
    // it('should init controls on state mode true', fakeAsync(() => {
    //   editModeSubject$.next(true);
    //   expect(component.controls).toBeTruthy();
    //   expect(component.controls.length).toBe(1);
    // }));

    // it('should init controls on state mode false', () => {
    //   editModeSubject$.next(false);
    //   expect(component.controls).toBeTruthy();
    //   expect(component.controls.length).toBe(2);
    // });

    // it('should init service', () => {
    //   expect(activatedRouteSpy.data).toBeTruthy();
    //   expect(editServiceSpy.set).toHaveBeenCalledTimes(1);
    // });

    it('should return true on can deactivate after no changes', () => {
        expect(component.canDeactivate()).toBeTruthy();
    });
    //
    it('should return false on can deactivate after group-overview changed', () => {
        expect(component.canDeactivate()).toBeTruthy();
        component.onGroupChanged(new GroupChangedEvent(new Group(), true));
        expect(component.canDeactivate()).toBeFalsy();
    });

    it('should return false on can deactivate after roles changed', () => {
        expect(component.canDeactivate()).toBeTruthy();
        component.onUnsavedRolesChange(true);
        expect(component.canDeactivate()).toBeFalsy();
    });

    it('should return false on can deactivate after members changed', () => {
        expect(component.canDeactivate()).toBeTruthy();
        component.onUnsavedMembersChange(true);
        expect(component.canDeactivate()).toBeFalsy();
    });

    // it('should call service on group-overview changed', () => {
    //   expect(editServiceSpy.change).toHaveBeenCalledTimes(0);
    //   const expectedEvent = new GroupChangedEvent(new Group(), true);
    //
    //   component.onGroupChanged(expectedEvent);
    //
    //   expect(editServiceSpy.change).toHaveBeenCalledTimes(1);
    //   expect(editServiceSpy.change).toHaveBeenCalledWith(expectedEvent);
    // });
    //
    // it('should call service on save control action in state mode', () => {
    //   editServiceSpy.save.and.returnValue(of(true));
    //   expect(editServiceSpy.save).toHaveBeenCalledTimes(0);
    //   editModeSubject$.next(true);
    //   const expectedAction = component.controls.find((control) => control.id === SaveControlItem.ID);
    //
    //   component.onControlAction(expectedAction);
    //
    //   expect(editServiceSpy.save).toHaveBeenCalledTimes(1);
    // });
    //
    // it('should call service on save control action not in state mode', () => {
    //   editServiceSpy.save.and.returnValue(of(true));
    //   expect(editServiceSpy.save).toHaveBeenCalledTimes(0);
    //   editModeSubject$.next(false);
    //   const expectedAction = component.controls.find((control) => control.id === SaveControlItem.ID);
    //
    //   component.onControlAction(expectedAction);
    //
    //   expect(editServiceSpy.save).toHaveBeenCalledTimes(1);
    // });
    //
    // it('should call service on save and stay control action not in state mode', () => {
    //   editServiceSpy.createAndEdit.and.returnValue(of(true));
    //   expect(editServiceSpy.createAndEdit).toHaveBeenCalledTimes(0);
    //   editModeSubject$.next(false);
    //   const expectedAction = component.controls.find((control) => control.id === 'save_and_stay');
    //
    //   component.onControlAction(expectedAction);
    //
    //   expect(editServiceSpy.createAndEdit).toHaveBeenCalledTimes(1);
    // });
    //
    // it('should set can deactivate to true after save control in state mode', () => {
    //   editServiceSpy.save.and.returnValue(of(true));
    //   editModeSubject$.next(true);
    //   const expectedAction = component.controls.find((control) => control.id === SaveControlItem.ID);
    //
    //   expect(component.canDeactivate()).toBeTruthy();
    //   component.onGroupChanged(new GroupChangedEvent(new Group(), true));
    //   expect(component.canDeactivate()).toBeFalsy();
    //   component.onControlAction(expectedAction);
    //
    //   expect(component.canDeactivate()).toBeTruthy();
    // });
    //
    // it('should set can deactivate to true after save control not in state mode', () => {
    //   editServiceSpy.save.and.returnValue(of(true));
    //   editModeSubject$.next(false);
    //   const expectedAction = component.controls.find((control) => control.id === SaveControlItem.ID);
    //
    //   expect(component.canDeactivate()).toBeTruthy();
    //   component.onGroupChanged(new GroupChangedEvent(new Group(), true));
    //   expect(component.canDeactivate()).toBeFalsy();
    //   component.onControlAction(expectedAction);
    //
    //   expect(component.canDeactivate()).toBeTruthy();
    // });
    //
    // it('should set can deactivate to true after save and stay control not in state mode', () => {
    //   editServiceSpy.createAndEdit.and.returnValue(of(true));
    //   editModeSubject$.next(false);
    //   const expectedAction = component.controls.find((control) => control.id === 'save_and_stay');
    //
    //   expect(component.canDeactivate()).toBeTruthy();
    //   component.onGroupChanged(new GroupChangedEvent(new Group(), true));
    //   expect(component.canDeactivate()).toBeFalsy();
    //   component.onControlAction(expectedAction);
    //
    //   expect(component.canDeactivate()).toBeTruthy();
    // });

    it('should display correct title in state mode', () => {
        editModeSubject$.next(true);
        fixture.detectChanges();

        const titleEl = fixture.debugElement.query(By.css('.group-edit-title'));

        expect(titleEl).toBeTruthy();
        expect(titleEl.nativeElement.innerHTML).toContain('Edit Group');
    });

    // it('should display correct title not in state mode', () => {
    //   editModeSubject$.next(false);
    //   fixture.detectChanges();
    //
    //   const titleEl = fixture.debugElement.query(By.css('.group-edit-title'));
    //
    //   expect(titleEl).toBeTruthy();
    //   expect(titleEl.nativeElement.innerHTML).toContain('Create Group');
    // });

    it('should display group-overview state component', () => {
        const groupEditComponentEl = fixture.debugElement.query(By.css('crczp-group-edit'));
        expect(groupEditComponentEl).toBeTruthy();
    });

    it('should display group-overview user assign component', () => {
        const groupUserAssignComponentEl = fixture.debugElement.query(By.css('crczp-group-user-assign'));
        expect(groupUserAssignComponentEl).toBeTruthy();
    });

    it('should display group-overview role assign component', () => {
        const groupRoleAssignComponentEl = fixture.debugElement.query(By.css('crczp-group-role-assign'));
        expect(groupRoleAssignComponentEl).toBeTruthy();
    });

    it('should collapse group-overview roles panel in state mode', () => {
        editModeSubject$.next(true);
        fixture.detectChanges();

        const groupMembersPanelEl = fixture.debugElement.query(By.css('.group-edit-panel'));
        expect(groupMembersPanelEl).toBeTruthy();
        expect(groupMembersPanelEl.attributes['ng-reflect-expanded']).toEqual('false');
    });

    // it('should expand group-overview roles panel if not in state mode', () => {
    //   editModeSubject$.next(false);
    //   fixture.detectChanges();
    //
    //   const groupMembersPanelEl = fixture.debugElement.query(By.css('.group-edit-panel'));
    //   expect(groupMembersPanelEl).toBeTruthy();
    //   expect(groupMembersPanelEl.attributes['ng-reflect-expanded']).toEqual('true');
    // });

    // it('should disable group-overview members panel if not in state mode', () => {
    //   editModeSubject$.next(false);
    //   fixture.detectChanges();
    //
    //   const groupMembersPanelEl = fixture.debugElement.query(By.css('.group-members-panel'));
    //   expect(groupMembersPanelEl).toBeTruthy();
    //   expect(groupMembersPanelEl.attributes['ng-reflect-disabled']).toEqual('true');
    // });

    it('should not disable group-overview members panel in state mode', () => {
        editModeSubject$.next(true);
        fixture.detectChanges();

        const groupMembersPanelEl = fixture.debugElement.query(By.css('.group-members-panel'));
        expect(groupMembersPanelEl).toBeTruthy();
        expect(groupMembersPanelEl.attributes['ng-reflect-disabled']).toEqual('false');
        expect(groupMembersPanelEl.attributes['ng-reflect-expanded']).toEqual('true');
    });

    // it('should collapse group-overview members panel if not in state mode', fakeAsync(() => {
    //   editModeSubject$.next(false);
    //   fixture.detectChanges();
    //
    //   const groupMembersPanelEl = fixture.debugElement.query(By.css('.group-members-panel'));
    //   expect(groupMembersPanelEl).toBeTruthy();
    //   expect(groupMembersPanelEl.attributes['ng-reflect-disabled']).toEqual('false');
    //   expect(groupMembersPanelEl.attributes['ng-reflect-expanded']).toEqual('false');
    // }));

    it('should expand group-overview members panel in state mode', () => {
        editModeSubject$.next(true);
        fixture.detectChanges();

        const groupMembersPanelEl = fixture.debugElement.query(By.css('.group-members-panel'));
        expect(groupMembersPanelEl).toBeTruthy();
        expect(groupMembersPanelEl.attributes['ng-reflect-expanded']).toEqual('true');
    });

    // it('should disable group-overview roles panel if not in state mode', () => {
    //   editModeSubject$.next(false);
    //   fixture.detectChanges();
    //
    //   const groupMembersPanelEl = fixture.debugElement.query(By.css('.group-roles-panel'));
    //   expect(groupMembersPanelEl).toBeTruthy();
    //   expect(groupMembersPanelEl.attributes['ng-reflect-disabled']).toEqual('true');
    // });

    it('should not disable group-overview roles panel in state mode', () => {
        editModeSubject$.next(true);
        fixture.detectChanges();

        const groupMembersPanelEl = fixture.debugElement.query(By.css('.group-roles-panel'));
        expect(groupMembersPanelEl).toBeTruthy();
        expect(groupMembersPanelEl.attributes['ng-reflect-disabled']).toEqual('false');
    });

    // it('should collapse group-overview roles panel if not in state mode', () => {
    //   editModeSubject$.next(false);
    //   fixture.detectChanges();
    //
    //   const groupMembersPanelEl = fixture.debugElement.query(By.css('.group-roles-panel'));
    //   expect(groupMembersPanelEl).toBeTruthy();
    //   expect(groupMembersPanelEl.attributes['ng-reflect-expanded']).toEqual('false');
    // });

    it('should expand group-overview roles panel in state mode', () => {
        editModeSubject$.next(true);
        fixture.detectChanges();

        const groupMembersPanelEl = fixture.debugElement.query(By.css('.group-roles-panel'));
        expect(groupMembersPanelEl).toBeTruthy();
        expect(groupMembersPanelEl.attributes['ng-reflect-expanded']).toEqual('true');
    });

    it('should display warning if group-overview members has unsaved changes', fakeAsync(() => {
        editModeSubject$.next(true);
        fixture.detectChanges();
        let warningEl = fixture.debugElement.query(By.css('.group-members-unsaved'));
        expect(warningEl).toBeFalsy();

        component.onUnsavedMembersChange(true);
        detectChanges();
        warningEl = fixture.debugElement.query(By.css('.group-members-unsaved'));

        expect(warningEl).toBeTruthy();
    }));

    it('should display warning if group-overview roles has unsaved changes', fakeAsync(() => {
        editModeSubject$.next(true);
        fixture.detectChanges();
        let warningEl = fixture.debugElement.query(By.css('.group-roles-unsaved'));
        expect(warningEl).toBeFalsy();

        component.onUnsavedRolesChange(true);
        detectChanges();
        warningEl = fixture.debugElement.query(By.css('.group-roles-unsaved'));

        expect(warningEl).toBeTruthy();
    }));

    function detectChanges() {
        cd.markForCheck();
        fixture.autoDetectChanges();
        flush();
    }

    function createGroup(): Group {
        const group = new Group();
        group.id = 1;
        group.name = 'name';
        group.description = 'description';
        group.expirationDate = new Date();
        group.roles = [];
        group.members = [];
        return group;
    }
});
