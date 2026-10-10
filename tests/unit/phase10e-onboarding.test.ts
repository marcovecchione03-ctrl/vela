import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { BRANDING_PRESETS } from '../../src/modules/tenant/presets';

describe('Phase 10E - Onboarding Step 3 Validation', () => {
  const wizardPath = path.join(__dirname, '../../src/app/onboarding/Wizard.tsx');
  const wizardContent = fs.readFileSync(wizardPath, 'utf-8');

  it('Exactly six onboarding branding presets exist', () => {
    expect(Object.keys(BRANDING_PRESETS).length).toBe(6);
    expect(BRANDING_PRESETS).toHaveProperty('Essential');
    expect(BRANDING_PRESETS).toHaveProperty('Bold');
    expect(BRANDING_PRESETS).toHaveProperty('Soft');
    expect(BRANDING_PRESETS).toHaveProperty('Elegant');
    expect(BRANDING_PRESETS).toHaveProperty('Fresh');
    expect(BRANDING_PRESETS).toHaveProperty('Urban');
  });

  it('Every preset resolves to all four required color strings', () => {
    Object.values(BRANDING_PRESETS).forEach(preset => {
      expect(preset.primaryColor).toMatch(/^#[0-9a-fA-F]{6}$/);
      expect(preset.secondaryColor).toMatch(/^#[0-9a-fA-F]{6}$/);
      expect(preset.bgColor).toMatch(/^#[0-9a-fA-F]{6}$/);
      expect(preset.textColor).toMatch(/^#[0-9a-fA-F]{6}$/);
    });
  });

  it('Essential is the default for fresh onboarding', () => {
    expect(wizardContent).toContain('if (!t || !t.primaryColor) return "Essential" // Fresh default');
  });

  it('Manual color inputs are no longer rendered in onboarding', () => {
    expect(wizardContent).not.toContain('<Input type="color"');
  });

  it('Selecting a preset submits primaryColor, secondaryColor, bgColor, textColor via hidden inputs', () => {
    expect(wizardContent).toContain('type="hidden" name="primaryColor"');
    expect(wizardContent).toContain('type="hidden" name="secondaryColor"');
    expect(wizardContent).toContain('type="hidden" name="bgColor"');
    expect(wizardContent).toContain('type="hidden" name="textColor"');
  });

  it('Persisted custom colors are not destroyed merely by loading Step 3', () => {
    expect(wizardContent).toContain('value={selectedTheme === "Custom" ? initialState.tenant?.primaryColor : BRANDING_PRESETS[selectedTheme]?.primaryColor}');
    expect(wizardContent).toContain('return "Custom" // Persisted custom styling');
  });

  it('Wizard uses useFormStatus for immediate loading state', () => {
    expect(wizardContent).toContain('const { pending } = useFormStatus()');
    expect(wizardContent).toContain('disabled={pending}');
    expect(wizardContent).toContain('{pending ? "Saving..."');
  });
});
