import { describe, it, expect } from 'vitest';
import { canInviteRole, validateInvitation } from '../../src/lib/logic/team';
import { validateCalendarColor, canModifyEmployee, canAdminModifyRole } from '../../src/lib/logic/employee';
import { validateServiceDuration, validateServiceConcurrency, validateCombinedComponents } from '../../src/lib/logic/services';
import { canRequestAvailability, canApproveAvailabilityRequest, canManageVacations } from '../../src/lib/logic/availability';

describe('Phase 4 Logic Tests (Unit)', () => {

  describe('Team Invitations & Roles', () => {
    it('1. OWNER may invite ADMIN.', () => {
      expect(canInviteRole('OWNER', 'ADMIN')).toBe(true);
    });
    
    it('2. ADMIN may not invite ADMIN.', () => {
      expect(canInviteRole('ADMIN', 'ADMIN')).toBe(false);
    });

    it('3. ADMIN may invite EMPLOYEE.', () => {
      expect(canInviteRole('ADMIN', 'EMPLOYEE')).toBe(true);
    });

    it('4. EMPLOYEE may not invite.', () => {
      expect(canInviteRole('EMPLOYEE', 'EMPLOYEE')).toBe(false);
    });

    it('5. expired invitation validation fails.', () => {
      const past = new Date(Date.now() - 10000);
      expect(() => validateInvitation('PENDING', past, 'a@b.com', 'a@b.com')).toThrow(/expired/);
    });

    it('6. revoked invitation validation fails.', () => {
      const future = new Date(Date.now() + 10000);
      expect(() => validateInvitation('REVOKED', future, 'a@b.com', 'a@b.com')).toThrow(/Invalid/);
    });

    it('7. accepted invitation validation fails.', () => {
      const future = new Date(Date.now() + 10000);
      expect(() => validateInvitation('ACCEPTED', future, 'a@b.com', 'a@b.com')).toThrow(/Invalid/);
    });

    it('8. invitation email mismatch fails.', () => {
      const future = new Date(Date.now() + 10000);
      expect(() => validateInvitation('PENDING', future, 'a@b.com', 'c@d.com')).toThrow(/different email/);
    });

    it('9. valid invitation email match succeeds.', () => {
      const future = new Date(Date.now() + 10000);
      expect(() => validateInvitation('PENDING', future, 'a@b.com', 'a@b.com')).not.toThrow();
    });
  });

  describe('Employee Profiles', () => {
    it('10. unsafe calendar color rejected.', () => {
      expect(() => validateCalendarColor('#ffffff')).toThrow(/Invalid/);
      expect(() => validateCalendarColor('red')).toThrow(/Invalid/);
    });

    it('11. approved calendar palette values accepted.', () => {
      expect(() => validateCalendarColor('#4f46e5')).not.toThrow();
    });

    it('12. OWNER can modify employee.', () => {
      expect(canModifyEmployee('OWNER')).toBe(true);
    });

    it('13. ADMIN cannot modify OWNER role.', () => {
      expect(canAdminModifyRole('ADMIN', 'OWNER')).toBe(false);
    });
  });

  describe('Service Management', () => {
    it('14. duration below minimum rejected.', () => {
      expect(() => validateServiceDuration(4)).toThrow(/Invalid duration/);
    });

    it('15. valid duration accepted.', () => {
      expect(() => validateServiceDuration(30)).not.toThrow();
    });

    it('16. concurrency 0 rejected.', () => {
      expect(() => validateServiceConcurrency(0)).toThrow(/Invalid concurrency/);
    });

    it('17. concurrency >=1 accepted within limit.', () => {
      expect(() => validateServiceConcurrency(5)).not.toThrow();
    });

    it('18. combined service cannot contain itself.', () => {
      expect(() => validateCombinedComponents('svc-1', [{ serviceId: 'svc-1' }], []))
        .toThrow(/cannot contain itself/);
    });

    it('19. combined service cannot contain another combined service.', () => {
      const dbChildren = [
        { id: 'svc-2', name: 'Child A', _count: { components: 1 }, durationMinutes: 30 }
      ];
      expect(() => validateCombinedComponents('svc-1', [{ serviceId: 'svc-2' }], dbChildren))
        .toThrow(/already a combined service/);
    });

    it('20. duplicate combined-service components rejected.', () => {
      expect(() => validateCombinedComponents('svc-1', [{ serviceId: 'svc-2' }, { serviceId: 'svc-2' }], []))
        .toThrow(/Duplicate/);
    });

    it('21. combined service duration equals sum of base component durations.', () => {
      const dbChildren = [
        { id: 'svc-2', name: 'Child A', _count: { components: 0 }, durationMinutes: 30 },
        { id: 'svc-3', name: 'Child B', _count: { components: 0 }, durationMinutes: 45 }
      ];
      const duration = validateCombinedComponents('svc-1', [{ serviceId: 'svc-2' }, { serviceId: 'svc-3' }], dbChildren);
      expect(duration).toBe(75);
    });
  });

  describe('Employee Availability & Requests', () => {
    it('22. employee cannot create a time block for another employee.', () => {
      expect(canRequestAvailability('EMPLOYEE', 'mem-1', 'mem-2')).toBe(false);
    });

    it('23. employee can create own time block.', () => {
      expect(canRequestAvailability('EMPLOYEE', 'mem-1', 'mem-1')).toBe(true);
    });

    it('24. OWNER/ADMIN can approve requests.', () => {
      expect(canApproveAvailabilityRequest('OWNER')).toBe(true);
      expect(canApproveAvailabilityRequest('ADMIN')).toBe(true);
      expect(canApproveAvailabilityRequest('EMPLOYEE')).toBe(false);
    });

    it('25. OWNER/ADMIN can manage vacations.', () => {
      expect(canManageVacations('OWNER')).toBe(true);
      expect(canManageVacations('ADMIN')).toBe(true);
      expect(canManageVacations('EMPLOYEE')).toBe(false);
    });
  });

});
