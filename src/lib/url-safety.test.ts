import { describe, expect, it } from 'vitest';
import { isPrivateOrLoopbackHost, resolvesToPrivateHost } from './url-safety';

describe('isPrivateOrLoopbackHost', () => {
  it('flags loopback and localhost', () => {
    expect(isPrivateOrLoopbackHost('localhost')).toBe(true);
    expect(isPrivateOrLoopbackHost('127.0.0.1')).toBe(true);
    expect(isPrivateOrLoopbackHost('::1')).toBe(true);
  });

  it('flags private IPv4 ranges', () => {
    expect(isPrivateOrLoopbackHost('10.0.0.5')).toBe(true);
    expect(isPrivateOrLoopbackHost('172.16.0.5')).toBe(true);
    expect(isPrivateOrLoopbackHost('172.31.255.255')).toBe(true);
    expect(isPrivateOrLoopbackHost('192.168.1.1')).toBe(true);
    expect(isPrivateOrLoopbackHost('169.254.169.254')).toBe(true);
  });

  it('flags link-local IPv6 and unique-local ranges', () => {
    expect(isPrivateOrLoopbackHost('fe80::1')).toBe(true);
    expect(isPrivateOrLoopbackHost('fd00::1')).toBe(true);
  });

  it('does not flag ordinary public hostnames or IPs', () => {
    expect(isPrivateOrLoopbackHost('example.com')).toBe(false);
    expect(isPrivateOrLoopbackHost('8.8.8.8')).toBe(false);
    expect(isPrivateOrLoopbackHost('172.32.0.1')).toBe(false);
  });
});

describe('resolvesToPrivateHost', () => {
  it('fails closed for a hostname that cannot be resolved', async () => {
    await expect(resolvesToPrivateHost('this-domain-should-not-exist-roavaa-test.invalid')).resolves.toBe(true);
  });

  it('shortcuts to true for a literal private IP without a DNS lookup', async () => {
    await expect(resolvesToPrivateHost('10.1.2.3')).resolves.toBe(true);
  });
});
