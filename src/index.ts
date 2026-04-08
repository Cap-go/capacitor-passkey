import { registerPlugin } from '@capacitor/core';

import type { CapacitorPasskeyPlugin } from './definitions';
import type { NativeCapacitorPasskeyPlugin } from './internal';
import { installWebAuthnShim } from './shim';
import { createNativeRequest } from './webauthn';

const NativeCapacitorPasskey = registerPlugin<NativeCapacitorPasskeyPlugin>('CapacitorPasskey', {
  web: () => import('./web').then((module) => new module.CapacitorPasskeyWeb()),
});

const CapacitorPasskey: CapacitorPasskeyPlugin = {
  async createCredential(options) {
    return NativeCapacitorPasskey.createCredential(createNativeRequest(options));
  },
  async getCredential(options) {
    return NativeCapacitorPasskey.getCredential(createNativeRequest(options));
  },
  async getPluginVersion() {
    return NativeCapacitorPasskey.getPluginVersion();
  },
  async isSupported() {
    return NativeCapacitorPasskey.isSupported();
  },
  shimWebAuthn(options) {
    installWebAuthnShim({
      options,
      plugin: CapacitorPasskey,
    });
  },
};

export * from './definitions';
export { CapacitorPasskey };
