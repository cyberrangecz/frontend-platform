import { describe, expect, it } from 'vitest';
import { GroupDTO } from '../DTO/group/group-dto.model';
import { GroupMapper } from './group.mapper';

function groupDtoExpiringAt(expirationDate: string | undefined): GroupDTO {
    const dto = new GroupDTO();
    dto.id = 1;
    dto.name = 'group';
    dto.description = 'description';
    dto.can_be_deleted = true;
    dto.roles = [];
    dto.users = [];
    dto.expiration_date = expirationDate as string;
    return dto;
}

describe('GroupMapper expiration date', () => {
    it('keeps the UTC calendar day of a Z-designated ISO string as the local calendar day', () => {
        const group = GroupMapper.mapGroupDTOToGroup(groupDtoExpiringAt('2026-10-06T00:00:00.000Z'));

        expect(group.expirationDate.getFullYear()).toBe(2026);
        expect(group.expirationDate.getMonth()).toBe(9);
        expect(group.expirationDate.getDate()).toBe(6);
    });

    it('keeps the UTC calendar day when the time of day is late in the day', () => {
        const group = GroupMapper.mapGroupDTOToGroup(groupDtoExpiringAt('2026-10-06T23:59:59.999Z'));

        expect(group.expirationDate.getDate()).toBe(6);
    });

    it('leaves the expiration date unset when the DTO carries none', () => {
        const group = GroupMapper.mapGroupDTOToGroup(groupDtoExpiringAt(undefined));

        expect(group.expirationDate).toBeUndefined();
    });
});
