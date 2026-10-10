import dns from 'dns/promises'

export function validateDomainClaimInput(input: string): string {
  let cleaned = input.toLowerCase().trim()

  if (/\s/.test(cleaned)) {
    throw new Error('Domain cannot contain whitespace')
  }

  // Reject URLs explicitly
  if (cleaned.includes('://') || cleaned.includes('/') || cleaned.includes('?') || cleaned.includes('#')) {
    throw new Error('Invalid domain: must be a hostname only, without schemes, paths, or query parameters')
  }

  // Strip trailing dot if present
  cleaned = cleaned.replace(/\.$/, '')

  // Basic regex for valid hostname (including IDN support by accepting broader character classes, but preventing obvious non-hostname chars)
  const isValid = /^([a-z0-9-]+\.)*[a-z0-9-]+\.[a-z]{2,}$/i.test(cleaned)
  if (!isValid && !cleaned.includes('localhost')) {
    throw new Error('Invalid domain format')
  }

  // Reserved hosts
  const reserved = ['vela.app', 'www.vela.app', 'app.vela.app']
  if (reserved.includes(cleaned) || cleaned.endsWith('.vela.app')) {
    throw new Error('Reserved platform domain')
  }

  return cleaned
}

export function normalizeRequestHost(hostHeader: string): string {
  // Extract hostname ignoring port if present
  let host = hostHeader.toLowerCase().trim()
  if (host.includes(':')) {
    host = host.split(':')[0]
  }
  return host
}

export async function verifyDomainDNS(hostname: string, expectedToken: string): Promise<boolean> {
  try {
    const records = await dns.resolveTxt(hostname)
    // records is an array of arrays of strings
    for (const recordArray of records) {
      for (const record of recordArray) {
        if (record.includes(expectedToken)) {
          return true
        }
      }
    }
    return false
  } catch (err: any) {
    if (err.code === 'ENOTFOUND' || err.code === 'ENODATA') {
      return false
    }
    throw new Error(`DNS resolution failed: ${err.message}`)
  }
}
