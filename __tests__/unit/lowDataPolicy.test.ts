/**
 * Unit lane — low-data mode policy (Task 10.3).
 *
 * Covers the Req 10.6 policy: when low-data mode is enabled, defer non-essential
 * downloads, prefer cached content, and restrict network use to active
 * uploads/submissions. Pure + offline.
 *
 * _Requirements: 10.6_
 */
import { createLowDataPolicy } from '../../src/foundation/audio/outbox';

describe('low-data mode policy (Req 10.6)', () => {
  it('when enabled: defers non-essential downloads and prefers cache', () => {
    const p = createLowDataPolicy(true);
    expect(p.enabled).toBe(true);
    expect(p.shouldDownload('essential')).toBe(true);
    expect(p.shouldDownload('non-essential')).toBe(false); // deferred
    expect(p.preferCache()).toBe(true);
  });

  it('when enabled: restricts network to active uploads/submissions', () => {
    const p = createLowDataPolicy(true);
    expect(p.allowsNetwork('upload')).toBe(true);
    expect(p.allowsNetwork('submission')).toBe(true);
    expect(p.allowsNetwork('other')).toBe(false); // restricted
  });

  it('when disabled: everything is permitted and cache is not forced', () => {
    const p = createLowDataPolicy(false);
    expect(p.enabled).toBe(false);
    expect(p.shouldDownload('non-essential')).toBe(true);
    expect(p.preferCache()).toBe(false);
    expect(p.allowsNetwork('other')).toBe(true);
  });
});
