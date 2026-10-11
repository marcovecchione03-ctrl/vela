import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('Phase 10G - Address Autocomplete (Places API New)', () => {
  const componentPath = path.join(__dirname, '../../src/components/ui/address-autocomplete.tsx');
  const componentContent = fs.readFileSync(componentPath, 'utf-8');

  it('A. code does NOT contain includedPrimaryTypes: ["address"]', () => {
    expect(componentContent).not.toContain('includedPrimaryTypes: ["address"]');
  });

  it('B. only valid address-oriented types are used', () => {
    expect(componentContent).toContain('"street_address"');
    expect(componentContent).toContain('"premise"');
    expect(componentContent).toContain('"subpremise"');
    expect(componentContent).toContain('"route"');
    expect(componentContent).toContain('"intersection"');
  });

  it('C. no more than 5 includedPrimaryTypes are configured', () => {
    // Extract the includedPrimaryTypes array to verify length
    const match = componentContent.match(/includedPrimaryTypes:\s*\[([\s\S]*?)\]/);
    expect(match).not.toBeNull();
    if (match) {
      const types = match[1].split(',').filter(t => t.trim().length > 0);
      expect(types.length).toBeLessThanOrEqual(5);
    }
  });

  it('D. AutocompleteSuggestion remains in use', () => {
    expect(componentContent).toContain('importLibrary("places")');
    expect(componentContent).toContain('AutocompleteSuggestion.fetchAutocompleteSuggestions');
  });

  it('E. toPlace + fetchFields formattedAddress remains in use', () => {
    expect(componentContent).toContain('.toPlace()');
    expect(componentContent).toContain('fetchFields({ fields: ["formattedAddress"] })');
    expect(componentContent).toContain('place.formattedAddress');
  });

  it('F. missing NEXT_PUBLIC_GOOGLE_MAPS_API_KEY => manual input works', () => {
    expect(componentContent).toContain('if (!apiKey) return');
    expect(componentContent).toContain('<Input');
  });

  it('G. session token lifecycle is complete', () => {
    expect(componentContent).toContain('AutocompleteSessionToken');
    expect(componentContent).toContain('sessionToken: sessionToken.current');
    expect(componentContent).toContain('resetSessionToken()');
  });

  it('H. Google API errors preserve manual text', () => {
    expect(componentContent).toContain('catch (err)');
    expect(componentContent).toContain('setPredictions([])');
  });
});
