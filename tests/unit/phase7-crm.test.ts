import { describe, it, expect } from 'vitest';
import { canManageBlacklist, canManageTags, canAddNote, canDeleteNote } from '../../src/lib/logic/crm';
import { toPublicCustomerDTO } from '../../src/lib/crm/dto';

describe('Phase 7 CRM Logic (Unit)', () => {
  describe('RBAC for Blacklist', () => {
    it('1. Owner and Admin can manage blacklist', () => {
      expect(canManageBlacklist('OWNER')).toBe(true);
      expect(canManageBlacklist('ADMIN')).toBe(true);
    });
    it('2. Employee and Customer cannot manage blacklist', () => {
      expect(canManageBlacklist('EMPLOYEE')).toBe(false);
      expect(canManageBlacklist('CUSTOMER')).toBe(false);
    });
  });

  describe('RBAC for Tags & Notes', () => {
    it('3. Owner and Admin can manage tags', () => {
      expect(canManageTags('OWNER')).toBe(true);
      expect(canManageTags('ADMIN')).toBe(true);
    });
    it('4. Employee and Customer cannot manage tags', () => {
      expect(canManageTags('EMPLOYEE')).toBe(false);
      expect(canManageTags('CUSTOMER')).toBe(false);
    });
    it('5. Employee can add notes but not delete them', () => {
      expect(canAddNote('EMPLOYEE')).toBe(true);
      expect(canDeleteNote('EMPLOYEE')).toBe(false);
    });
    it('6. Customer is entirely blocked from notes', () => {
      expect(canAddNote('CUSTOMER')).toBe(false);
      expect(canDeleteNote('CUSTOMER')).toBe(false);
    });
  });

  describe('Customer DTO', () => {
    it('7. Public DTO excludes score, events, tags, and blockReason', () => {
      const dbProfile = {
        id: "cust-1",
        firstName: "John",
        lastName: "Doe",
        phone: "123",
        createdAt: new Date(),
        score: 80,
        isBlocked: true,
        blockReason: "bad",
        tags: [],
        scoreEvents: []
      };

      const dto = toPublicCustomerDTO(dbProfile);
      
      expect(dto).toHaveProperty('id');
      expect(dto).toHaveProperty('firstName');
      expect(dto).not.toHaveProperty('score');
      expect(dto).not.toHaveProperty('isBlocked');
      expect(dto).not.toHaveProperty('blockReason');
      expect(dto).not.toHaveProperty('tags');
      expect(dto).not.toHaveProperty('scoreEvents');
    });
  });
});
