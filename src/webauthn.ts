import type {
  CreateCredentialOptions,
  GetCredentialOptions,
  PasskeyAuthenticationCredential,
  PasskeyAuthenticatorAssertionResponseJSON,
  PasskeyAuthenticatorAttestationResponseJSON,
  PasskeyCredentialDescriptor,
  PasskeyPublicKeyCredentialCreationOptionsJSON,
  PasskeyPublicKeyCredentialRequestOptionsJSON,
  PasskeyRegistrationCredential,
} from './definitions';
import type { NativePasskeyRequest } from './internal';

type BufferLike = BufferSource | ArrayLike<number>;
type JsonRecord = Record<string, unknown>;
type CredentialJson = PasskeyRegistrationCredential | PasskeyAuthenticationCredential;

const PASSKEY_TYPE = 'public-key';

export function createNativeRequest(options: CreateCredentialOptions | GetCredentialOptions): NativePasskeyRequest {
  if ('mediation' in options) {
    const getOptions = options as GetCredentialOptions;
    return {
      origin: resolveOrigin(getOptions.origin, getOptions.publicKey.rpId),
      requestJson: JSON.stringify(normalizeRequestOptionsJSON(getOptions.publicKey, getOptions.origin)),
    };
  }

  const createOptions = options as CreateCredentialOptions;
  return {
    origin: resolveOrigin(createOptions.origin, createOptions.publicKey.rp.id),
    requestJson: JSON.stringify(normalizeCreationOptionsJSON(createOptions.publicKey, createOptions.origin)),
  };
}

export function webAuthnCreationOptionsToJSON(
  options: PublicKeyCredentialCreationOptions,
  origin?: string,
): PasskeyPublicKeyCredentialCreationOptionsJSON {
  return normalizeCreationOptionsJSON(
    {
      attestation: options.attestation,
      authenticatorSelection: options.authenticatorSelection
        ? {
            authenticatorAttachment: options.authenticatorSelection.authenticatorAttachment,
            requireResidentKey: options.authenticatorSelection.requireResidentKey,
            residentKey: options.authenticatorSelection.residentKey,
            userVerification: options.authenticatorSelection.userVerification,
          }
        : undefined,
      challenge: encodeBase64Url(options.challenge),
      excludeCredentials: options.excludeCredentials?.map(descriptorToJSON),
      extensions: cloneExtensions(options.extensions),
      pubKeyCredParams: options.pubKeyCredParams.map((entry) => ({
        alg: entry.alg,
        type: entry.type,
      })),
      rp: {
        id: options.rp.id,
        name: options.rp.name,
      },
      timeout: options.timeout,
      user: {
        displayName: options.user.displayName,
        id: encodeBase64Url(options.user.id),
        name: options.user.name,
      },
    },
    origin,
  );
}

export function webAuthnRequestOptionsToJSON(
  options: PublicKeyCredentialRequestOptions,
  origin?: string,
): PasskeyPublicKeyCredentialRequestOptionsJSON {
  return normalizeRequestOptionsJSON(
    {
      allowCredentials: options.allowCredentials?.map(descriptorToJSON),
      challenge: encodeBase64Url(options.challenge),
      extensions: cloneExtensions(options.extensions),
      rpId: options.rpId,
      timeout: options.timeout,
      userVerification: options.userVerification,
    },
    origin,
  );
}

export function normalizeCreationOptionsJSON(
  options: PasskeyPublicKeyCredentialCreationOptionsJSON,
  origin?: string,
): PasskeyPublicKeyCredentialCreationOptionsJSON {
  const rpId = options.rp.id ?? deriveRpId(resolveOrigin(origin, options.rp.id));

  if (!rpId) {
    throw createPasskeyDomException('DataError', 'A relying party id or HTTPS origin is required.');
  }

  return {
    ...options,
    excludeCredentials: options.excludeCredentials?.map(descriptorToJSON),
    pubKeyCredParams: options.pubKeyCredParams.map((entry) => ({
      alg: entry.alg,
      type: entry.type ?? PASSKEY_TYPE,
    })),
    rp: {
      ...options.rp,
      id: rpId,
    },
  };
}

export function normalizeRequestOptionsJSON(
  options: PasskeyPublicKeyCredentialRequestOptionsJSON,
  origin?: string,
): PasskeyPublicKeyCredentialRequestOptionsJSON {
  const rpId = options.rpId ?? deriveRpId(resolveOrigin(origin, options.rpId));

  return {
    ...options,
    allowCredentials: options.allowCredentials?.map(descriptorToJSON),
    rpId,
  };
}

export function browserCreationOptionsFromJSON(
  options: PasskeyPublicKeyCredentialCreationOptionsJSON,
): PublicKeyCredentialCreationOptions {
  return {
    attestation: options.attestation,
    authenticatorSelection: options.authenticatorSelection
      ? {
          authenticatorAttachment: options.authenticatorSelection.authenticatorAttachment,
          requireResidentKey: options.authenticatorSelection.requireResidentKey,
          residentKey: options.authenticatorSelection.residentKey,
          userVerification: options.authenticatorSelection.userVerification,
        }
      : undefined,
    challenge: decodeBase64Url(options.challenge),
    excludeCredentials: options.excludeCredentials?.map(jsonDescriptorToBrowser),
    extensions: cloneExtensions(options.extensions),
    pubKeyCredParams: options.pubKeyCredParams.map((entry) => ({
      alg: entry.alg,
      type: entry.type ?? PASSKEY_TYPE,
    })),
    rp: {
      id: options.rp.id,
      name: options.rp.name,
    },
    timeout: options.timeout,
    user: {
      displayName: options.user.displayName ?? options.user.name,
      id: decodeBase64Url(options.user.id),
      name: options.user.name,
    },
  };
}

export function browserRequestOptionsFromJSON(
  options: PasskeyPublicKeyCredentialRequestOptionsJSON,
): PublicKeyCredentialRequestOptions {
  return {
    allowCredentials: options.allowCredentials?.map(jsonDescriptorToBrowser),
    challenge: decodeBase64Url(options.challenge),
    extensions: cloneExtensions(options.extensions),
    rpId: options.rpId,
    timeout: options.timeout,
    userVerification: options.userVerification,
  };
}

export async function browserRegistrationToJSON(credential: Credential | null): Promise<PasskeyRegistrationCredential> {
  const publicKeyCredential = expectPublicKeyCredential(credential, 'registration');
  const response = publicKeyCredential.response as AuthenticatorAttestationResponse;
  const nativeJson = credentialWithToJSON(publicKeyCredential);

  if (nativeJson && 'attestationObject' in nativeJson.response) {
    return normalizeRegistrationCredential(nativeJson as PasskeyRegistrationCredential);
  }

  return {
    authenticatorAttachment: normalizeAttachment(publicKeyCredential.authenticatorAttachment),
    clientExtensionResults: clientExtensionResultsToRecord(publicKeyCredential.getClientExtensionResults?.()),
    id: publicKeyCredential.id,
    rawId: encodeBase64Url(publicKeyCredential.rawId),
    response: {
      attestationObject: encodeBase64Url(response.attestationObject),
      clientDataJSON: encodeBase64Url(response.clientDataJSON),
      publicKey: response.getPublicKey ? nullableBufferToOptionalBase64Url(response.getPublicKey()) : undefined,
      publicKeyAlgorithm: response.getPublicKeyAlgorithm ? response.getPublicKeyAlgorithm() : undefined,
      transports: response.getTransports ? response.getTransports() : undefined,
    },
    type: PASSKEY_TYPE,
  };
}

export async function browserAuthenticationToJSON(
  credential: Credential | null,
): Promise<PasskeyAuthenticationCredential> {
  const publicKeyCredential = expectPublicKeyCredential(credential, 'authentication');
  const response = publicKeyCredential.response as AuthenticatorAssertionResponse;
  const nativeJson = credentialWithToJSON(publicKeyCredential);

  if (nativeJson && 'authenticatorData' in nativeJson.response) {
    return normalizeAuthenticationCredential(nativeJson as PasskeyAuthenticationCredential);
  }

  return {
    authenticatorAttachment: normalizeAttachment(publicKeyCredential.authenticatorAttachment),
    clientExtensionResults: clientExtensionResultsToRecord(publicKeyCredential.getClientExtensionResults?.()),
    id: publicKeyCredential.id,
    rawId: encodeBase64Url(publicKeyCredential.rawId),
    response: {
      authenticatorData: encodeBase64Url(response.authenticatorData),
      clientDataJSON: encodeBase64Url(response.clientDataJSON),
      signature: encodeBase64Url(response.signature),
      userHandle: nullableBufferToBase64Url(response.userHandle),
    },
    type: PASSKEY_TYPE,
  };
}

export function credentialFromJSON(credential: CredentialJson): PublicKeyCredential {
  const shimCredential = new PasskeyPublicKeyCredential(credential) as unknown as PublicKeyCredential;

  if (typeof globalThis.PublicKeyCredential === 'function') {
    Object.setPrototypeOf(shimCredential, globalThis.PublicKeyCredential.prototype);
  }

  return shimCredential;
}

export function parseCreationOptionsFromJSON(
  options: PasskeyPublicKeyCredentialCreationOptionsJSON,
): PublicKeyCredentialCreationOptions {
  return browserCreationOptionsFromJSON(normalizeCreationOptionsJSON(options));
}

export function parseRequestOptionsFromJSON(
  options: PasskeyPublicKeyCredentialRequestOptionsJSON,
): PublicKeyCredentialRequestOptions {
  return browserRequestOptionsFromJSON(normalizeRequestOptionsJSON(options));
}

export function decodeBase64Url(value: string): ArrayBuffer {
  const bytes = base64UrlToBytes(value);
  return bytes.slice().buffer;
}

export function encodeBase64Url(value: BufferLike | null | undefined): string {
  if (typeof value === 'undefined' || value === null) {
    return '';
  }

  const bytes = toUint8Array(value);
  let binary = '';

  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });

  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/u, '');
}

export function resolveOrigin(explicitOrigin?: string, rpId?: string): string | undefined {
  if (explicitOrigin) {
    return explicitOrigin;
  }

  if (typeof globalThis.location !== 'undefined' && /^https?:$/u.test(globalThis.location.protocol)) {
    return globalThis.location.origin;
  }

  if (rpId) {
    return `https://${rpId}`;
  }

  return undefined;
}

export function createPasskeyDomException(name: string, message: string): Error {
  if (typeof DOMException !== 'undefined') {
    return new DOMException(message, name);
  }

  const error = new Error(message);
  error.name = name;
  return error;
}

export function abortIfNeeded(signal?: AbortSignal | null): void {
  if (signal?.aborted) {
    throw createPasskeyDomException('AbortError', 'The passkey request was aborted.');
  }
}

export function normalizePluginError(error: unknown): Error {
  if (error instanceof Error) {
    return error;
  }

  const message = typeof error === 'object' && error && 'message' in error ? String(error.message) : String(error);
  const name = resolveErrorName(error);

  return createPasskeyDomException(name, message);
}

function credentialWithToJSON(credential: PublicKeyCredential): CredentialJson | null {
  const toJSON = (credential as PublicKeyCredential & { toJSON?: () => unknown }).toJSON;

  if (typeof toJSON !== 'function') {
    return null;
  }

  const json = toJSON();

  if (!json || typeof json !== 'object') {
    return null;
  }

  const response = (json as { response?: JsonRecord }).response;
  if (!response) {
    return null;
  }

  if ('attestationObject' in response) {
    return normalizeRegistrationCredential(json as Partial<PasskeyRegistrationCredential>);
  }

  if ('authenticatorData' in response) {
    return normalizeAuthenticationCredential(json as Partial<PasskeyAuthenticationCredential>);
  }

  return null;
}

function normalizeRegistrationCredential(
  credential: Partial<PasskeyRegistrationCredential>,
): PasskeyRegistrationCredential {
  return {
    authenticatorAttachment: normalizeAttachment(credential.authenticatorAttachment),
    clientExtensionResults: credential.clientExtensionResults ?? {},
    id: String(credential.id ?? ''),
    rawId: String(credential.rawId ?? credential.id ?? ''),
    response: normalizeAttestationResponse(credential.response ?? {}),
    type: PASSKEY_TYPE,
  };
}

function normalizeAuthenticationCredential(
  credential: Partial<PasskeyAuthenticationCredential>,
): PasskeyAuthenticationCredential {
  return {
    authenticatorAttachment: normalizeAttachment(credential.authenticatorAttachment),
    clientExtensionResults: credential.clientExtensionResults ?? {},
    id: String(credential.id ?? ''),
    rawId: String(credential.rawId ?? credential.id ?? ''),
    response: normalizeAssertionResponse(credential.response ?? {}),
    type: PASSKEY_TYPE,
  };
}

function normalizeAttestationResponse(
  response: Partial<PasskeyAuthenticatorAttestationResponseJSON>,
): PasskeyAuthenticatorAttestationResponseJSON {
  return {
    attestationObject: String(response.attestationObject ?? ''),
    clientDataJSON: String(response.clientDataJSON ?? ''),
    publicKey: response.publicKey,
    publicKeyAlgorithm: response.publicKeyAlgorithm,
    transports: response.transports,
  };
}

function normalizeAssertionResponse(
  response: Partial<PasskeyAuthenticatorAssertionResponseJSON>,
): PasskeyAuthenticatorAssertionResponseJSON {
  return {
    authenticatorData: String(response.authenticatorData ?? ''),
    clientDataJSON: String(response.clientDataJSON ?? ''),
    signature: String(response.signature ?? ''),
    userHandle: typeof response.userHandle === 'undefined' ? null : response.userHandle,
  };
}

function expectPublicKeyCredential(credential: Credential | null, flow: string): PublicKeyCredential {
  if (!credential || !(credential instanceof PublicKeyCredential)) {
    throw createPasskeyDomException('InvalidStateError', `The browser did not return a ${flow} credential.`);
  }

  return credential;
}

function descriptorToJSON(
  descriptor: PublicKeyCredentialDescriptor | PasskeyCredentialDescriptor,
): PasskeyCredentialDescriptor {
  return {
    id: typeof descriptor.id === 'string' ? descriptor.id : encodeBase64Url(descriptor.id),
    transports: descriptor.transports ? [...descriptor.transports] : undefined,
    type: descriptor.type ?? PASSKEY_TYPE,
  };
}

function jsonDescriptorToBrowser(descriptor: PasskeyCredentialDescriptor): PublicKeyCredentialDescriptor {
  return {
    id: decodeBase64Url(descriptor.id),
    transports: descriptor.transports as AuthenticatorTransport[] | undefined,
    type: descriptor.type ?? PASSKEY_TYPE,
  };
}

function cloneExtensions(
  extensions: AuthenticationExtensionsClientInputs | JsonRecord | undefined,
): JsonRecord | undefined {
  if (!extensions) {
    return undefined;
  }

  return JSON.parse(JSON.stringify(extensions)) as JsonRecord;
}

function nullableBufferToBase64Url(value: ArrayBuffer | null): string | null;
function nullableBufferToBase64Url(value: ArrayBuffer | BufferSource | null | undefined): string | null | undefined;
function nullableBufferToBase64Url(value: ArrayBuffer | BufferSource | null | undefined): string | null | undefined {
  if (typeof value === 'undefined') {
    return undefined;
  }

  if (value === null) {
    return null;
  }

  return encodeBase64Url(value);
}

function nullableBufferToOptionalBase64Url(value: ArrayBuffer | BufferSource | null | undefined): string | undefined {
  const encoded = nullableBufferToBase64Url(value);
  return encoded ?? undefined;
}

function deriveRpId(origin?: string): string | undefined {
  if (!origin) {
    return undefined;
  }

  try {
    return new URL(origin).hostname;
  } catch {
    return undefined;
  }
}

function base64UrlToBytes(value: string): Uint8Array {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padding = normalized.length % 4 === 0 ? '' : '='.repeat(4 - (normalized.length % 4));
  const binary = atob(`${normalized}${padding}`);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes;
}

function toUint8Array(value: BufferLike): Uint8Array {
  if (Array.isArray(value)) {
    return Uint8Array.from(value);
  }

  if (ArrayBuffer.isView(value)) {
    return new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
  }

  return new Uint8Array(value);
}

function normalizeAttachment(value: string | null | undefined) {
  if (value === 'platform' || value === 'cross-platform') {
    return value;
  }

  return undefined;
}

function clientExtensionResultsToRecord(
  value: AuthenticationExtensionsClientOutputs | undefined,
): Record<string, unknown> {
  if (!value) {
    return {};
  }

  return JSON.parse(JSON.stringify(value)) as Record<string, unknown>;
}

class PasskeyAuthenticatorAttestationResponse {
  public readonly clientDataJSON: ArrayBuffer;
  public readonly attestationObject: ArrayBuffer;

  constructor(private readonly json: PasskeyAuthenticatorAttestationResponseJSON) {
    this.clientDataJSON = decodeBase64Url(json.clientDataJSON);
    this.attestationObject = decodeBase64Url(json.attestationObject);
  }

  getPublicKey(): ArrayBuffer | null {
    return this.json.publicKey ? decodeBase64Url(this.json.publicKey) : null;
  }

  getPublicKeyAlgorithm(): number {
    return this.json.publicKeyAlgorithm ?? -7;
  }

  getTransports(): string[] {
    return this.json.transports ? [...this.json.transports] : [];
  }

  toJSON(): PasskeyAuthenticatorAttestationResponseJSON {
    return { ...this.json };
  }
}

class PasskeyAuthenticatorAssertionResponse {
  public readonly clientDataJSON: ArrayBuffer;
  public readonly authenticatorData: ArrayBuffer;
  public readonly signature: ArrayBuffer;
  public readonly userHandle: ArrayBuffer | null;

  constructor(private readonly json: PasskeyAuthenticatorAssertionResponseJSON) {
    this.clientDataJSON = decodeBase64Url(json.clientDataJSON);
    this.authenticatorData = decodeBase64Url(json.authenticatorData);
    this.signature = decodeBase64Url(json.signature);
    this.userHandle = json.userHandle ? decodeBase64Url(json.userHandle) : null;
  }

  toJSON(): PasskeyAuthenticatorAssertionResponseJSON {
    return { ...this.json };
  }
}

class PasskeyPublicKeyCredential {
  public readonly id: string;
  public readonly rawId: ArrayBuffer;
  public readonly type: PublicKeyCredentialType = PASSKEY_TYPE;
  public readonly authenticatorAttachment: string | null;
  public readonly response: PasskeyAuthenticatorAttestationResponse | PasskeyAuthenticatorAssertionResponse;

  constructor(private readonly json: CredentialJson) {
    this.id = json.id;
    this.rawId = decodeBase64Url(json.rawId);
    this.authenticatorAttachment = json.authenticatorAttachment ?? null;
    this.response =
      'attestationObject' in json.response
        ? new PasskeyAuthenticatorAttestationResponse(json.response)
        : new PasskeyAuthenticatorAssertionResponse(json.response);
  }

  getClientExtensionResults(): AuthenticationExtensionsClientOutputs {
    return (this.json.clientExtensionResults ?? {}) as AuthenticationExtensionsClientOutputs;
  }

  toJSON(): CredentialJson {
    return JSON.parse(JSON.stringify(this.json)) as CredentialJson;
  }
}

function resolveErrorName(error: unknown): string {
  if (typeof error === 'object' && error) {
    if ('code' in error && typeof error.code === 'string') {
      return error.code;
    }

    if ('data' in error && error.data && typeof error.data === 'object' && 'name' in error.data) {
      const candidate = error.data.name;
      if (typeof candidate === 'string') {
        return candidate;
      }
    }
  }

  return 'UnknownError';
}
