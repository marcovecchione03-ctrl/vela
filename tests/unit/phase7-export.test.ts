import { describe, it, expect } from 'vitest';
import { sanitizeCSV, sanitizeExcel, buildExportRow } from '../../src/lib/crm/export';

describe('Phase 7 Export & Security Logic (Unit)', () => {
  describe('CSV Export Sanitization', () => {
    it('1. should neutralize formula injection beginning with "="', () => {
      expect(sanitizeCSV("=SUM(1,1)")).toBe("\"'=SUM(1,1)\"");
    });

    it('2. should neutralize formula injection beginning with "+"', () => {
      expect(sanitizeCSV("+cmd|' /C calc'!A0")).toBe("'+cmd|' /C calc'!A0");
    });

    it('3. should neutralize formula injection beginning with "-"', () => {
      expect(sanitizeCSV("-1+2")).toBe("'-1+2");
    });

    it('4. should neutralize formula injection beginning with "@"', () => {
      expect(sanitizeCSV("@HYPERLINK(\"...\")")).toBe("\"'@HYPERLINK(\"\"...\"\")\"");
    });

    it('5. should escape quotes properly', () => {
      expect(sanitizeCSV("Hello \"World\"")).toBe("\"Hello \"\"World\"\"\"");
    });
    
    it('6. should escape commas and newlines properly', () => {
      expect(sanitizeCSV("Line1\nLine2,Line3")).toBe("\"Line1\nLine2,Line3\"");
    });

    it('7. should pass clean string unchanged', () => {
      expect(sanitizeCSV("Clean String")).toBe("Clean String");
    });
  });

  describe('Excel Export Sanitization', () => {
    it('8. should neutralize formula injection beginning with "="', () => {
      expect(sanitizeExcel("=SUM(1,1)")).toBe("'=SUM(1,1)");
    });

    it('9. should pass numbers unchanged', () => {
      expect(sanitizeExcel(123)).toBe(123);
    });

    it('10. should pass clean strings unchanged', () => {
      expect(sanitizeExcel("Normal text")).toBe("Normal text");
    });
    
    it('11. should handle null and undefined', () => {
      expect(sanitizeExcel(null)).toBe("");
      expect(sanitizeExcel(undefined)).toBe("");
    });
  });

  describe('Export Whitelist', () => {
    it('12. should exclude sensitive fields like password hashes or block reason from row', () => {
      const mockCustomer = {
        firstName: "John",
        lastName: "Doe",
        phone: "123",
        createdAt: new Date(),
        score: 80,
        isBlocked: true,
        blockReason: "Very bad customer", // Should not be exported
        tags: [{ tag: { name: "VIP" } }],
        tenantMembership: {
          user: {
            email: "john@example.com",
            passwordHash: "bcrypt_hash_secret" // Should not be exported
          }
        }
      };
      const mockStats = {
        total: 1, completed: 1, cancelled: 0, lateCancelled: 0, noShows: 0,
        lastAppointment: null, nextAppointment: null, preferredService: null,
        preferredEmployee: null, theoreticalValueMinor: 1000
      };

      const row = buildExportRow(mockCustomer, mockStats);

      expect(row).not.toHaveProperty('blockReason');
      expect(row).not.toHaveProperty('passwordHash');
      
      // Ensure only known safe fields exist
      const keys = Object.keys(row);
      expect(keys).toEqual([
        "FirstName", "LastName", "Email", "Phone", "RegistrationDate",
        "CustomerScore", "TotalBookings", "CompletedBookings", "Cancellations",
        "LateCancellations", "NoShows", "LastAppointment", "NextAppointment",
        "PreferredService", "PreferredEmployee", "TheoreticalBookingValue",
        "BlockedState", "Tags"
      ]);
    });
  });
});
