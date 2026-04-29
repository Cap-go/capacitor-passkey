/**
 * Supported authenticator attachment values.
 *
 * @since 1.0.0
 */
export type PasskeyAuthenticatorAttachment = 'platform' | 'cross-platform';

/**
 * Supported WebAuthn credential type.
 *
 * @since 1.0.0
 */
export type PasskeyCredentialType = 'public-key';

/**
 * Supported user verification preferences.
 *
 * @since 1.0.0
 */
export type PasskeyUserVerification = 'discouraged' | 'preferred' | 'required';

/**
 * Supported attestation preferences.
 *
 * @since 1.0.0
 */
export type PasskeyAttestation = 'none' | 'indirect' | 'direct' | 'enterprise';

/**
 * Supported resident key preferences.
 *
 * @since 1.0.0
 */
export type PasskeyResidentKey = 'discouraged' | 'preferred' | 'required';

/**
 * Options used when installing the browser-style shim.
 *
 * @since 1.0.0
 */
export interface ShimWebAuthnOptions {
  /**
   * Optional HTTPS origin to encode into iOS 17.4+ clientDataJSON.
   *
   * Use this when your Capacitor app runs from `capacitor://localhost`
   * but your relying party expects `https://signin.example.com`.
   */
  origin?: string;

  /**
   * Force the shim even if the runtime already exposes `navigator.credentials`.
   *
   * Defaults to `false`.
   */
  force?: boolean;
}

/**
 * Runtime configuration loaded from the host app's Capacitor config.
 *
 * This is the shape returned by `getConfiguration()`.
 *
 * @since 1.1.0
 */
export interface PasskeyRuntimeConfiguration {
  /**
   * Whether the native `cap sync/update` hook should wire host projects automatically.
   *
   * Defaults to `true`.
   */
  autoShim: boolean;

  /**
   * Optional HTTPS origin used by the config-driven shim install.
   *
   * On iOS 17.4+ this origin is encoded into `clientDataJSON`.
   */
  origin?: string;

  /**
   * Domains associated with the app for passkey usage.
   *
   * These come from `domains` in Capacitor config plus the hostname derived
   * from `origin` when available.
   */
  domains: string[];

  /**
   * Current runtime platform.
   */
  platform: 'ios' | 'android' | 'web';
}

/**
 * JSON-safe representation of a public key credential descriptor.
 *
 * Binary identifiers must be base64url encoded.
 *
 * @since 1.0.0
 */
export interface PasskeyCredentialDescriptor {
  /**
   * Base64url-encoded credential identifier.
   */
  id: string;

  /**
   * Credential type. Only `public-key` is supported.
   */
  type?: PasskeyCredentialType;

  /**
   * Optional transport hints copied from WebAuthn.
   */
  transports?: string[];
}

/**
 * JSON-safe relying party information.
 *
 * @since 1.0.0
 */
export interface PasskeyRelyingParty {
  /**
   * Relying party identifier.
   *
   * If omitted, the shim derives it from the configured origin when possible.
   */
  id?: string;

  /**
   * Human-readable relying party name.
   */
  name: string;
}

/**
 * JSON-safe WebAuthn user entity.
 *
 * Binary identifiers must be base64url encoded.
 *
 * @since 1.0.0
 */
export interface PasskeyUserEntity {
  /**
   * Base64url-encoded user handle.
   */
  id: string;

  /**
   * User name shown by the authenticator.
   */
  name: string;

  /**
   * Optional display name shown by the authenticator.
   */
  displayName?: string;
}

/**
 * JSON-safe credential parameter entry.
 *
 * @since 1.0.0
 */
export interface PasskeyCredentialParameter {
  /**
   * Credential type. Only `public-key` is supported.
   */
  type: PasskeyCredentialType;

  /**
   * COSE algorithm identifier.
   */
  alg: number;
}

/**
 * JSON-safe authenticator selection options.
 *
 * @since 1.0.0
 */
export interface PasskeyAuthenticatorSelection {
  /**
   * Optional authenticator attachment hint.
   */
  authenticatorAttachment?: PasskeyAuthenticatorAttachment;

  /**
   * Optional resident key preference.
   */
  residentKey?: PasskeyResidentKey;

  /**
   * Legacy resident key requirement flag.
   */
  requireResidentKey?: boolean;

  /**
   * Optional user verification preference.
   */
  userVerification?: PasskeyUserVerification;
}

/**
 * JSON-safe registration request options.
 *
 * All binary fields must be base64url encoded.
 *
 * @since 1.0.0
 */
export interface PasskeyPublicKeyCredentialCreationOptionsJSON {
  /**
   * Base64url-encoded challenge.
   */
  challenge: string;

  /**
   * Relying party information.
   */
  rp: PasskeyRelyingParty;

  /**
   * User information.
   */
  user: PasskeyUserEntity;

  /**
   * Supported credential algorithms.
   */
  pubKeyCredParams: PasskeyCredentialParameter[];

  /**
   * Optional timeout hint in milliseconds.
   */
  timeout?: number;

  /**
   * Optional credentials that must be excluded during registration.
   */
  excludeCredentials?: PasskeyCredentialDescriptor[];

  /**
   * Optional authenticator preferences.
   */
  authenticatorSelection?: PasskeyAuthenticatorSelection;

  /**
   * Optional attestation preference.
   */
  attestation?: PasskeyAttestation;

  /**
   * Optional hints copied from the JSON form used by modern WebAuthn toolkits.
   */
  hints?: string[];

  /**
   * Optional extensions copied as-is into the request JSON.
   */
  extensions?: Record<string, unknown>;
}

/**
 * Direct registration request for the plugin transport.
 *
 * @since 1.0.0
 */
export interface CreateCredentialOptions {
  /**
   * JSON-safe registration request.
   */
  publicKey: PasskeyPublicKeyCredentialCreationOptionsJSON;

  /**
   * Optional HTTPS origin to use for iOS 17.4+ browser-style clientDataJSON.
   */
  origin?: string;
}

/**
 * JSON-safe authentication request options.
 *
 * All binary fields must be base64url encoded.
 *
 * @since 1.0.0
 */
export interface PasskeyPublicKeyCredentialRequestOptionsJSON {
  /**
   * Base64url-encoded challenge.
   */
  challenge: string;

  /**
   * Optional timeout hint in milliseconds.
   */
  timeout?: number;

  /**
   * Optional relying party identifier.
   *
   * If omitted, the shim derives it from the configured origin when possible.
   */
  rpId?: string;

  /**
   * Optional allow list copied from WebAuthn.
   */
  allowCredentials?: PasskeyCredentialDescriptor[];

  /**
   * Optional user verification preference.
   */
  userVerification?: PasskeyUserVerification;

  /**
   * Optional hints copied from the JSON form used by modern WebAuthn toolkits.
   */
  hints?: string[];

  /**
   * Optional extensions copied as-is into the request JSON.
   */
  extensions?: Record<string, unknown>;
}

/**
 * Direct authentication request for the plugin transport.
 *
 * @since 1.0.0
 */
export interface GetCredentialOptions {
  /**
   * JSON-safe authentication request.
   */
  publicKey: PasskeyPublicKeyCredentialRequestOptionsJSON;

  /**
   * Optional mediation hint. `conditional` currently falls back to an explicit prompt.
   */
  mediation?: string;

  /**
   * Optional HTTPS origin to use for iOS 17.4+ browser-style clientDataJSON.
   */
  origin?: string;
}

/**
 * JSON-safe attestation response payload.
 *
 * All binary fields are base64url encoded.
 *
 * @since 1.0.0
 */
export interface PasskeyAuthenticatorAttestationResponseJSON {
  /**
   * Base64url-encoded clientDataJSON.
   */
  clientDataJSON: string;

  /**
   * Base64url-encoded attestation object.
   */
  attestationObject: string;

  /**
   * Optional base64url-encoded public key when provided by the platform.
   */
  publicKey?: string;

  /**
   * Optional public key algorithm when provided by the platform.
   */
  publicKeyAlgorithm?: number;

  /**
   * Optional transport list when provided by the platform.
   */
  transports?: string[];
}

/**
 * JSON-safe assertion response payload.
 *
 * All binary fields are base64url encoded.
 *
 * @since 1.0.0
 */
export interface PasskeyAuthenticatorAssertionResponseJSON {
  /**
   * Base64url-encoded clientDataJSON.
   */
  clientDataJSON: string;

  /**
   * Base64url-encoded authenticator data.
   */
  authenticatorData: string;

  /**
   * Base64url-encoded signature.
   */
  signature: string;

  /**
   * Optional base64url-encoded user handle.
   */
  userHandle?: string | null;
}

/**
 * JSON-safe registration credential returned by the plugin.
 *
 * @since 1.0.0
 */
export interface PasskeyRegistrationCredential {
  /**
   * Base64url-encoded credential identifier.
   */
  id: string;

  /**
   * Base64url-encoded raw credential identifier.
   */
  rawId: string;

  /**
   * Credential type. Always `public-key`.
   */
  type: PasskeyCredentialType;

  /**
   * Optional authenticator attachment reported by the platform.
   */
  authenticatorAttachment?: PasskeyAuthenticatorAttachment;

  /**
   * Client extension results returned by the platform.
   */
  clientExtensionResults: Record<string, unknown>;

  /**
   * Registration response payload.
   */
  response: PasskeyAuthenticatorAttestationResponseJSON;
}

/**
 * JSON-safe authentication credential returned by the plugin.
 *
 * @since 1.0.0
 */
export interface PasskeyAuthenticationCredential {
  /**
   * Base64url-encoded credential identifier.
   */
  id: string;

  /**
   * Base64url-encoded raw credential identifier.
   */
  rawId: string;

  /**
   * Credential type. Always `public-key`.
   */
  type: PasskeyCredentialType;

  /**
   * Optional authenticator attachment reported by the platform.
   */
  authenticatorAttachment?: PasskeyAuthenticatorAttachment;

  /**
   * Client extension results returned by the platform.
   */
  clientExtensionResults: Record<string, unknown>;

  /**
   * Assertion response payload.
   */
  response: PasskeyAuthenticatorAssertionResponseJSON;
}

/**
 * Plugin version payload.
 *
 * @since 1.0.0
 */
export interface PluginVersionResult {
  /**
   * Version identifier reported by the current platform implementation.
   */
  version: string;
}

/**
 * Passkey support status for the current runtime.
 *
 * @since 1.0.0
 */
export interface PasskeySupportResult {
  /**
   * Whether passkeys are available on the current runtime.
   */
  available: boolean;

  /**
   * Whether conditional mediation is available.
   */
  conditionalMediation: boolean;

  /**
   * Current platform identifier.
   */
  platform: 'ios' | 'android' | 'web';
}

/**
 * Capacitor Passkey plugin.
 *
 * Use `autoShimWebAuthn()` to keep existing `navigator.credentials.create/get`
 * code working inside a Capacitor app.
 *
 * @since 1.0.0
 */
export interface CapacitorPasskeyPlugin {
  /**
   * Install a browser-style WebAuthn shim on top of the native plugin.
   *
   * The shim patches `navigator.credentials.create/get` for `publicKey`
   * requests and returns browser-like credential objects.
   *
   * Use this when you want to override the auto-loaded config manually.
   *
   * @since 1.0.0
   * @example
   * ```typescript
   * import { CapacitorPasskey } from '@capgo/capacitor-passkey';
   *
   * CapacitorPasskey.shimWebAuthn({
   *   origin: 'https://signin.example.com',
   * });
   * ```
   */
  shimWebAuthn(options?: ShimWebAuthnOptions): void;

  /**
   * Load plugin configuration from the host Capacitor app.
   *
   * This reads `plugins.CapacitorPasskey` from `capacitor.config.*`.
   *
   * @since 1.1.0
   */
  getConfiguration(): Promise<PasskeyRuntimeConfiguration>;

  /**
   * Install the browser-style shim using host app configuration.
   *
   * This is the easiest way to keep existing browser WebAuthn code working:
   * configure the plugin in `capacitor.config.*`, then call this once during
   * app bootstrap.
   *
   * @since 1.1.0
   * @example
   * ```typescript
   * import { CapacitorPasskey } from '@capgo/capacitor-passkey';
   *
   * await CapacitorPasskey.autoShimWebAuthn();
   * ```
   */
  autoShimWebAuthn(options?: ShimWebAuthnOptions): Promise<PasskeyRuntimeConfiguration>;

  /**
   * Register a passkey from a JSON-safe WebAuthn request.
   *
   * This method is useful when your backend already returns the
   * `PublicKeyCredentialCreationOptionsJSON` form.
   *
   * @since 1.0.0
   */
  createCredential(options: CreateCredentialOptions): Promise<PasskeyRegistrationCredential>;

  /**
   * Authenticate with an existing passkey from a JSON-safe WebAuthn request.
   *
   * This method is useful when your backend already returns the
   * `PublicKeyCredentialRequestOptionsJSON` form.
   *
   * @since 1.0.0
   */
  getCredential(options: GetCredentialOptions): Promise<PasskeyAuthenticationCredential>;

  /**
   * Report whether passkeys are available in the current runtime.
   *
   * @since 1.0.0
   */
  isSupported(): Promise<PasskeySupportResult>;

  /**
   * Returns the current platform implementation version marker.
   *
   * @since 1.0.0
   */
  getPluginVersion(): Promise<PluginVersionResult>;
}
