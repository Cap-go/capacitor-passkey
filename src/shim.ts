import type {
  CapacitorPasskeyPlugin,
  PasskeyAuthenticationCredential,
  PasskeyRegistrationCredential,
  ShimWebAuthnOptions,
} from './definitions.js';
import {
  abortIfNeeded,
  createPasskeyDomException,
  credentialFromJSON,
  normalizePluginError,
  parseCreationOptionsFromJSON,
  parseRequestOptionsFromJSON,
  webAuthnCreationOptionsToJSON,
  webAuthnRequestOptionsToJSON,
} from './webauthn.js';

type CredentialsContainerLike = Pick<CredentialsContainer, 'create' | 'get' | 'preventSilentAccess' | 'store'>;

type ShimRoot = typeof globalThis & {
  navigator: Navigator & { credentials?: CredentialsContainerLike };
  __capgoPasskeyShimInstalled?: boolean;
  __capgoPasskeyShimConfig?: ShimWebAuthnOptions;
};

interface InstallWebAuthnShimOptions {
  root?: typeof globalThis;
  plugin: CapacitorPasskeyPlugin;
  options?: ShimWebAuthnOptions;
}

export function installWebAuthnShim({ root = globalThis, plugin, options }: InstallWebAuthnShimOptions): void {
  const shimRoot = root as ShimRoot;
  const config = {
    ...(shimRoot.__capgoPasskeyShimConfig ?? {}),
    ...(options ?? {}),
  };

  shimRoot.__capgoPasskeyShimConfig = config;

  if (shimRoot.__capgoPasskeyShimInstalled && !config.force) {
    return;
  }

  const originalCredentials = shimRoot.navigator.credentials;
  const patchedCredentials: CredentialsContainerLike = {
    create: async (request?: CredentialCreationOptions): Promise<Credential | null> => {
      const currentConfig = shimRoot.__capgoPasskeyShimConfig ?? {};

      if (!request?.publicKey) {
        if (originalCredentials?.create) {
          return originalCredentials.create.call(originalCredentials, request);
        }

        throw createPasskeyDomException('NotSupportedError', 'Only public-key credential creation is supported.');
      }

      abortIfNeeded(request.signal);
      const response = (await plugin.createCredential({
        origin: currentConfig.origin,
        publicKey: webAuthnCreationOptionsToJSON(request.publicKey, currentConfig.origin),
      })) as PasskeyRegistrationCredential;

      return credentialFromJSON(response) as unknown as Credential;
    },
    get: async (request?: CredentialRequestOptions): Promise<Credential | null> => {
      const currentConfig = shimRoot.__capgoPasskeyShimConfig ?? {};

      if (!request?.publicKey) {
        if (originalCredentials?.get) {
          return originalCredentials.get.call(originalCredentials, request);
        }

        throw createPasskeyDomException('NotSupportedError', 'Only public-key credential requests are supported.');
      }

      abortIfNeeded(request.signal);
      if (request.mediation === 'conditional') {
        throw createPasskeyDomException(
          'NotSupportedError',
          'Conditional mediation is not available through the Capacitor passkey shim.',
        );
      }

      const response = (await plugin.getCredential({
        mediation: request.mediation,
        origin: currentConfig.origin,
        publicKey: webAuthnRequestOptionsToJSON(request.publicKey, currentConfig.origin),
      })) as PasskeyAuthenticationCredential;

      return credentialFromJSON(response) as unknown as Credential;
    },
    preventSilentAccess: async (): Promise<void> => {
      if (originalCredentials?.preventSilentAccess) {
        await originalCredentials.preventSilentAccess.call(originalCredentials);
      }
    },
    store: async (credential?: Credential): Promise<void> => {
      if (originalCredentials?.store && credential) {
        await originalCredentials.store.call(originalCredentials, credential);
      }
    },
  };

  try {
    Object.defineProperty(shimRoot.navigator, 'credentials', {
      configurable: true,
      value: patchedCredentials,
      writable: false,
    });
  } catch {
    (shimRoot.navigator as Navigator & { credentials?: CredentialsContainerLike }).credentials = patchedCredentials;
  }

  installPublicKeyCredentialStatics(shimRoot, plugin);
  shimRoot.__capgoPasskeyShimInstalled = true;
}

function installPublicKeyCredentialStatics(root: ShimRoot, plugin: CapacitorPasskeyPlugin): void {
  const nativePublicKeyCredential = root.PublicKeyCredential ?? class {};
  const supportRequest = async () => {
    try {
      return await plugin.isSupported();
    } catch (error) {
      throw normalizePluginError(error);
    }
  };

  defineStatic(nativePublicKeyCredential, 'isUserVerifyingPlatformAuthenticatorAvailable', async () => {
    const support = await supportRequest();
    return support.available;
  });

  defineStatic(nativePublicKeyCredential, 'isConditionalMediationAvailable', async () => {
    const support = await supportRequest();
    return support.conditionalMediation;
  });

  defineStatic(nativePublicKeyCredential, 'parseCreationOptionsFromJSON', parseCreationOptionsFromJSON);
  defineStatic(nativePublicKeyCredential, 'parseRequestOptionsFromJSON', parseRequestOptionsFromJSON);

  root.PublicKeyCredential = nativePublicKeyCredential as typeof PublicKeyCredential;
}

function defineStatic(target: object, key: string, value: unknown): void {
  try {
    Object.defineProperty(target, key, {
      configurable: true,
      value,
      writable: true,
    });
  } catch {
    Reflect.set(target, key, value);
  }
}
