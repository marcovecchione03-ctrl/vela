import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('Phase 10E - Button UX Validation', () => {
  const buttonPath = path.join(__dirname, '../../src/components/ui/button.tsx');
  const buttonContent = fs.readFileSync(buttonPath, 'utf-8');

  it('Button includes cursor-pointer', () => {
    expect(buttonContent).toContain('cursor-pointer');
  });

  it('Button disabled state includes cursor-not-allowed', () => {
    expect(buttonContent).toContain('disabled:cursor-not-allowed');
  });

  it('Button disabled state no longer uses pointer-events-none to ensure cursor-not-allowed works', () => {
    expect(buttonContent).not.toContain('disabled:pointer-events-none');
  });
});
