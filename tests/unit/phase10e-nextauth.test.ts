import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('Phase 10E - NextAuth API Route Verification', () => {
  it('NextAuth catch-all API route exists', () => {
    const routePath = path.join(__dirname, '../../src/app/api/auth/[...nextauth]/route.ts');
    expect(fs.existsSync(routePath)).toBe(true);
  });

  it('NextAuth route exports GET and POST handlers', () => {
    const routePath = path.join(__dirname, '../../src/app/api/auth/[...nextauth]/route.ts');
    const routeContent = fs.readFileSync(routePath, 'utf-8');
    
    expect(routeContent).toContain('export { handler as GET, handler as POST }');
  });

  it('Auth config signIn page is set to /auth/login', () => {
    const configPath = path.join(__dirname, '../../src/lib/auth/config.ts');
    const configContent = fs.readFileSync(configPath, 'utf-8');
    
    expect(configContent).toContain('signIn: "/auth/login"');
  });

  it('Auth config uses CredentialsProvider', () => {
    const configPath = path.join(__dirname, '../../src/lib/auth/config.ts');
    const configContent = fs.readFileSync(configPath, 'utf-8');
    
    expect(configContent).toContain('CredentialsProvider({');
  });
});
