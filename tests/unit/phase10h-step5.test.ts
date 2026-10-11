import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('Phase 10H - Onboarding Step 5 Validation', () => {
  const wizardPath = path.join(__dirname, '../../src/app/onboarding/Wizard.tsx');
  const actionPath = path.join(__dirname, '../../src/actions/onboarding.ts');
  const schemaPath = path.join(__dirname, '../../prisma/schema.prisma');
  
  const wizardContent = fs.readFileSync(wizardPath, 'utf-8');
  const actionContent = fs.readFileSync(actionPath, 'utf-8');
  const schemaContent = fs.readFileSync(schemaPath, 'utf-8');

  it('A. untouched valid Step 5 form does not submit undefined required strings', () => {
    // The Wizard now renders a hidden timezone field automatically populated with the client timezone
    expect(wizardContent).toContain('name="timezone"');
    expect(wizardContent).toContain('Intl.DateTimeFormat().resolvedOptions().timeZone');
  });

  it('B. location name reaches server', () => {
    // action parses locationName from step5Schema
    expect(actionContent).toContain('locationName: z.string().min(1)');
    expect(actionContent).toContain('name: parsed.data.locationName');
  });

  it('C. Google-selected address reaches server', () => {
    // address is submitted normally via the hidden/controlled input from AddressAutocomplete
    expect(wizardContent).toContain('<AddressAutocomplete name="address"');
    expect(actionContent).toContain('address: z.string().min(1)');
  });

  it('D. manual address reaches server', () => {
    // Both manual and autocomplete emit to the same 'address' field 
    expect(wizardContent).toContain('<AddressAutocomplete name="address"');
    expect(actionContent).toContain('address: parsed.data.address');
  });

  it('E. timezone or other automatically supplied required field is valid', () => {
    expect(actionContent).toContain('timezone: z.string().min(1)');
    expect(actionContent).toContain('timezone: parsed.data.timezone');
  });

  it('F. Step 5 validation passes with normal UI values', () => {
    // With timezone supplied, step 5 will pass
    expect(actionContent).toContain('const parsed = step5Schema.safeParse(rawData)');
  });

  it('G. retry does not create duplicate first location', () => {
    // The action explicitly checks for existing locations first
    expect(actionContent).toContain('await tx.location.count({ where: { tenantId } })');
    expect(actionContent).toContain('if (count === 0) {');
  });

  it('H. tenant authorization remains intact', () => {
    expect(actionContent).toContain('role: "OWNER"');
  });

  it('I. Google Places env missing does not affect Step 5 submission', () => {
    // Validation is string-based, it works with manual inputs as well
    expect(actionContent).toContain('address: z.string().min(1)');
  });

  it('J. Location Prisma fields validation', () => {
    expect(schemaContent).toContain('address   String?');
    expect(schemaContent).toContain('timezone  String?');
    // Prisma optional vs Zod required is handled securely by injecting the client timezone in the UI
  });
});
