import { WebPlugin } from '@capacitor/core';

import type {
  PasskeyAuthenticationCredential,
  PasskeyPublicKeyCredentialCreationOptionsJSON,
  PasskeyPublicKeyCredentialRequestOptionsJSON,
  PasskeyRuntimeConfiguration,
  PasskeyRegistrationCredential,
  PasskeySupportResult,
  PluginVersionResult,
} from './definitions.js';
import type { NativeCapacitorPasskeyPlugin, NativePasskeyRequest } from './internal.js';
import {
  browserAuthenticationToJSON,
  browserCreationOptionsFromJSON,
  browserRegistrationToJSON,
  browserRequestOptionsFromJSON,
  createPasskeyDomException,
} from './webauthn.js';

export class CapacitorPasskeyWeb extends WebPlugin implements NativeCapacitorPasskeyPlugin {
  async createCredential(options: NativePasskeyRequest): Promise<PasskeyRegistrationCredential> {
    const credentials = this.ensureCredentials();
    const parsed = JSON.parse(options.requestJson) as PasskeyPublicKeyCredentialCreationOptionsJSON;
    const credential = await credentials.create({
      publicKey: browserCreationOptionsFromJSON(parsed),
    });

    return browserRegistrationToJSON(credential);
  }

  async getCredential(options: NativePasskeyRequest): Promise<PasskeyAuthenticationCredential> {
    const credentials = this.ensureCredentials();
    const parsed = JSON.parse(options.requestJson) as PasskeyPublicKeyCredentialRequestOptionsJSON;
    const credential = await credentials.get({
      publicKey: browserRequestOptionsFromJSON(parsed),
    });

    return browserAuthenticationToJSON(credential);
  }

  async getConfiguration(): Promise<PasskeyRuntimeConfiguration> {
    const origin = this.currentOrigin();
    const domains = origin ? [new URL(origin).hostname] : [];

    return {
      autoShim: true,
      domains,
      origin,
      platform: 'web',
    };
  }

  async isSupported(): Promise<PasskeySupportResult> {
    const available =
      typeof globalThis.PublicKeyCredential !== 'undefined' &&
      typeof globalThis.navigator?.credentials?.create === 'function' &&
      typeof globalThis.navigator?.credentials?.get === 'function';

    let conditionalMediation = false;

    if (available && typeof globalThis.PublicKeyCredential.isConditionalMediationAvailable === 'function') {
      conditionalMediation = await globalThis.PublicKeyCredential.isConditionalMediationAvailable();
    }

    return {
      available,
      conditionalMediation,
      platform: 'web',
    };
  }

  async getPluginVersion(): Promise<PluginVersionResult> {
    return {
      version: 'web',
    };
  }

  private ensureCredentials(): CredentialsContainer {
    if (
      typeof globalThis.PublicKeyCredential === 'undefined' ||
      typeof globalThis.navigator?.credentials?.create !== 'function' ||
      typeof globalThis.navigator?.credentials?.get !== 'function'
    ) {
      throw createPasskeyDomException('NotSupportedError', 'WebAuthn is not available in this browser.');
    }

    return globalThis.navigator.credentials;
  }

  private currentOrigin(): string | undefined {
    if (typeof globalThis.location === 'undefined') {
      return undefined;
    }

    if (globalThis.location.protocol !== 'http:' && globalThis.location.protocol !== 'https:') {
      return undefined;
    }

    return globalThis.location.origin;
  }
}
