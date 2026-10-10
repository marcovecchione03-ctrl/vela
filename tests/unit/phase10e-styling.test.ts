import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('Phase 10E - Global Styling Verification', () => {
  it('Root layout imports globals.css', () => {
    const layoutPath = path.join(__dirname, '../../src/app/layout.tsx');
    const layoutContent = fs.readFileSync(layoutPath, 'utf-8');
    
    // Verify that the global stylesheet is imported in the root layout
    expect(layoutContent).toContain('import "./globals.css"');
  });

  it('Login page uses Tailwind utility classes and component system', () => {
    const loginPagePath = path.join(__dirname, '../../src/app/auth/login/page.tsx');
    const loginPageContent = fs.readFileSync(loginPagePath, 'utf-8');
    
    // Verify the presence of specific Tailwind classes and Shadcn components
    // rather than raw unstyled HTML
    expect(loginPageContent).toContain('min-h-screen');
    expect(loginPageContent).toContain('justify-center');
    expect(loginPageContent).toContain('bg-neutral-50');
    expect(loginPageContent).toContain('className="w-full max-w-md"');
    
    // Verify it imports internal components, not just using native tags
    expect(loginPageContent).toContain('import { Button } from "@/components/ui/button"');
    expect(loginPageContent).toContain('import { Card,');
  });

  it('No Next.js default starter code remains in root layout or page', () => {
    const layoutPath = path.join(__dirname, '../../src/app/layout.tsx');
    const layoutContent = fs.readFileSync(layoutPath, 'utf-8');
    
    const rootPagePath = path.join(__dirname, '../../src/app/page.tsx');
    let rootPageContent = '';
    try {
      rootPageContent = fs.readFileSync(rootPagePath, 'utf-8');
    } catch (e) {
      // It's okay if page.tsx doesn't exist, but it should not have the default code if it does
    }
    
    expect(layoutContent).not.toContain('Create Next App');
    expect(rootPageContent).not.toContain('To get started, edit the');
    expect(rootPageContent).not.toContain('next.svg');
    expect(rootPageContent).not.toContain('vercel.svg');
  });
});
