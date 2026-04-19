import { registerPlugin } from '@capacitor/core';

import type { CapacitorPasskeyPlugin, PasskeyRuntimeConfiguration, ShimWebAuthnOptions } from './definitions.js';
import type { NativeCapacitorPasskeyPlugin } from './internal.js';
import { installWebAuthnShim } from './shim.js';
import { createNativeRequest } from './webauthn.js';

const NativeCapacitorPasskey = registerPlugin<NativeCapacitorPasskeyPlugin>('CapacitorPasskey', {
  web: () => import('./web.js').then((module) => new module.CapacitorPasskeyWeb()),
});

let configurationPromise: Promise<PasskeyRuntimeConfiguration> | undefined;
let cachedConfiguration: PasskeyRuntimeConfiguration | undefined;

function mergeShimOptions(
  configuration: PasskeyRuntimeConfiguration | undefined,
  options: ShimWebAuthnOptions | undefined,
): ShimWebAuthnOptions | undefined {
  const origin = options?.origin ?? configuration?.origin;
  const force = options?.force;

  if (!origin && force === undefined) {
    return undefined;
  }

  return {
    force,
    origin,
  };
}

function mergeRuntimeConfiguration(
  configuration: PasskeyRuntimeConfiguration,
  options: ShimWebAuthnOptions | undefined,
): PasskeyRuntimeConfiguration {
  const origin = options?.origin ?? configuration.origin;
  const domains = new Set(configuration.domains);

  if (origin) {
    try {
      domains.add(new URL(origin).hostname);
    } catch {
      // Ignore invalid override values here and let native APIs validate later.
    }
  }

  return {
    ...configuration,
    domains: [...domains],
    origin,
  };
}

async function loadConfiguration(): Promise<PasskeyRuntimeConfiguration> {
  try {
    const configuration = await NativeCapacitorPasskey.getConfiguration();
    cachedConfiguration = configuration;
    return configuration;
  } catch (error) {
    configurationPromise = undefined;
    throw error;
  }
}

const CapacitorPasskey: CapacitorPasskeyPlugin = {
  async autoShimWebAuthn(options) {
    const configuration = await CapacitorPasskey.getConfiguration();
    if (!configuration.autoShim && !options?.force) {
      return configuration;
    }

    const effectiveConfiguration = mergeRuntimeConfiguration(configuration, options);
    cachedConfiguration = effectiveConfiguration;

    installWebAuthnShim({
      options: mergeShimOptions(effectiveConfiguration, options),
      plugin: CapacitorPasskey,
    });

    return effectiveConfiguration;
  },
  async createCredential(options) {
    return NativeCapacitorPasskey.createCredential(createNativeRequest(options));
  },
  async getConfiguration() {
    if (!configurationPromise) {
      configurationPromise = loadConfiguration();
    }

    return configurationPromise;
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
      options: mergeShimOptions(cachedConfiguration, options),
      plugin: CapacitorPasskey,
    });
  },
};

export * from './definitions.js';
export { CapacitorPasskey };
