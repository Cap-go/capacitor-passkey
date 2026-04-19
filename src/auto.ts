import { CapacitorPasskey } from './index.js';

async function installAutoShim(): Promise<void> {
  try {
    await CapacitorPasskey.autoShimWebAuthn();
  } catch (error) {
    console.warn('[CapacitorPasskey] Failed to install the automatic WebAuthn shim.', error);
  }
}

if (typeof globalThis.window !== 'undefined' && typeof globalThis.navigator !== 'undefined') {
  void Promise.resolve().then(installAutoShim);
}

export { CapacitorPasskey };
