import { SimpleChange, SimpleChanges } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { Group } from '@crczp/user-and-group-model';
import { GroupChangedEvent } from '../../model/group-changed-event';
import { GroupEditMaterialModule } from '../group-edit-material.module';
import { GroupEditComponent } from './group-edit.component';

describe('GroupEditComponent', () => {
    let component: GroupEditComponent;
    let fixture: ComponentFixture<GroupEditComponent>;

    beforeEach(() => {
        TestBed.configureTestingModule({
            declarations: [GroupEditComponent],
            imports: [GroupEditMaterialModule, NoopAnimationsModule]
        }).compileComponents();
    });

    beforeEach(() => {
        fixture = TestBed.createComponent(GroupEditComponent);
        component = fixture.componentInstance;
        const initGroup = createGroup();
        component.group = initGroup;
        component.ngOnChanges(createSimpleChanges(initGroup));
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should emit event on form value change', () => {
        const expectedGroup = createGroup();
        const newName = 'name';
        expectedGroup.name = newName;
        const expectedEvent = new GroupChangedEvent(expectedGroup, true);
        expect(component.edited.emit).toHaveBeenCalledTimes(0);

        component.groupEditFormGroup.formGroup.get('name').setValue(newName);
        expect(component.edited.emit).toHaveBeenCalledTimes(1);
        expect(component.edited.emit).toHaveBeenCalledWith(expectedEvent);
    });

    it('should have a name form', () => {
        const nameFormEl = fixture.debugElement.query(By.css('.name-form'));
        expect(nameFormEl).toBeTruthy();
    });

    it('should have a description form', () => {
        const nameFormEl = fixture.debugElement.query(By.css('.description-form'));
        expect(nameFormEl).toBeTruthy();
    });

    it('should have an expiration date form', () => {
        const nameFormEl = fixture.debugElement.query(By.css('.expiration-form'));
        expect(nameFormEl).toBeTruthy();
    });

    function createSimpleChanges(newValue: Group): SimpleChanges {
        const change = new SimpleChange(undefined, newValue, true);
        return { group: change } as SimpleChanges;
    }

    function createGroup(): Group {
        const group = new Group();
        group.id = 1;
        group.name = 'someGroup';
        group.description = 'someDescription';
        group.expirationDate = null;
        return group;
    }
});
