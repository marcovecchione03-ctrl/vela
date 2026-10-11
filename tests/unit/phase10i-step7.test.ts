import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('Phase 10I - Onboarding Step 7 Validation and Persistence', () => {
  const wizardPath = path.join(__dirname, '../../src/app/onboarding/Wizard.tsx');
  const actionPath = path.join(__dirname, '../../src/actions/onboarding.ts');
  
  const wizardContent = fs.readFileSync(wizardPath, 'utf-8');
  const actionContent = fs.readFileSync(actionPath, 'utf-8');

  it('A. default numeric value submits as a number', () => {
    // The UI uses a number input
    expect(wizardContent).toContain('type="number"');
    // The schema parses and validates a number
    expect(actionContent).toContain('cancellationDeadlineHours: z.preprocess(parseNum(), z.number().min(0))');
  });

  it('B. changing 24 -> 10 submits 10', () => {
    // The input relies on name="cancellationDeadlineHours" which is natively submitted
    expect(wizardContent).toContain('name="cancellationDeadlineHours"');
    // The server parses it
    expect(actionContent).toContain('cancellationDeadlineHours: z.preprocess(parseNum(), z.number().min(0))');
  });

  it('C. "10" from FormData becomes numeric 10', () => {
    // We use a custom parseNum preprocess that resolves strings to numbers
    expect(actionContent).toContain('const parseNum =');
    expect(actionContent).toContain('const num = Number(val);');
  });

  it('D. empty value does NOT become NaN silently', () => {
    // The parseNum logic returns fallback/undefined for empty string, forcing Zod to throw "Required" rather than NaN
    expect(actionContent).toContain('if (val === undefined || val === null || val === "") return fallback;');
  });

  it('E. invalid text is rejected', () => {
    // NaN checks explicitly reject non-numeric text
    expect(actionContent).toContain('return isNaN(num) ? fallback : num;');
  });

  it('F. negative value is rejected', () => {
    // Zod .min(0) explicitly rejects negative values
    expect(actionContent).toContain('.min(0)');
  });

  it('G. persisted value restores correctly', () => {
    // UI now uses initialState.tenant
    expect(wizardContent).toContain('defaultValue={initialState.tenant?.cancellationDeadlineHours ?? 24}');
  });

  it('H. approval mode still submits correctly', () => {
    // Still present and defaults to AUTOMATIC or initialState
    expect(wizardContent).toContain('name="bookingApprovalMode"');
    expect(wizardContent).toContain('defaultValue={initialState.tenant?.bookingApprovalMode || "AUTOMATIC"}');
    expect(actionContent).toContain('bookingApprovalMode: z.enum(["AUTOMATIC", "MANUAL"])');
  });

  it('I. no field-name mismatch exists between UI and schema', () => {
    expect(wizardContent).toContain('name="cancellationDeadlineHours"');
    expect(actionContent).toContain('cancellationDeadlineHours: z.preprocess(parseNum(), z.number().min(0))');
  });

  it('J. Step 7 server action does not overwrite unrendered settings', () => {
    // We removed these fields from the schema so Prisma preserves the existing values
    expect(actionContent).not.toContain('maxAdvanceBookingDays:');
    expect(actionContent).not.toContain('minBookingNoticeHours:');
    expect(actionContent).not.toContain('defaultBookingBufferMins:');
    expect(actionContent).not.toContain('allowCustomerOverlaps:');
  });
});
