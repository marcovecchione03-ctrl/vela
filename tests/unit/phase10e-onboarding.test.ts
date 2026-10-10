import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('Phase 10E - Onboarding Step 3 Validation', () => {
  const wizardPath = path.join(__dirname, '../../src/app/onboarding/Wizard.tsx');
  const wizardContent = fs.readFileSync(wizardPath, 'utf-8');

  it('Wizard Step 3 has primaryColor input with valid string fallback', () => {
    expect(wizardContent).toContain('name="primaryColor"');
    expect(wizardContent).toContain('defaultValue={initialState.tenant?.primaryColor || "#000000"}');
  });

  it('Wizard Step 3 has secondaryColor input with valid string fallback', () => {
    expect(wizardContent).toContain('name="secondaryColor"');
    expect(wizardContent).toContain('defaultValue={initialState.tenant?.secondaryColor || "#666666"}');
  });

  it('Wizard Step 3 has bgColor input with valid string fallback', () => {
    expect(wizardContent).toContain('name="bgColor"');
    expect(wizardContent).toContain('defaultValue={initialState.tenant?.bgColor || "#ffffff"}');
  });

  it('Wizard Step 3 has textColor input with valid string fallback', () => {
    expect(wizardContent).toContain('name="textColor"');
    expect(wizardContent).toContain('defaultValue={initialState.tenant?.textColor || "#000000"}');
  });
});
