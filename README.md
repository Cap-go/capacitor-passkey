# @capgo/capacitor-passkey
 <a href="https://capgo.app/"><img src='https://raw.githubusercontent.com/Cap-go/capgo/main/assets/capgo_banner.png' alt='Capgo - Instant updates for capacitor'/></a>

<div align="center">
  <h2><a href="https://capgo.app/?ref=plugin_passkey"> ➡️ Get Instant updates for your App with Capgo</a></h2>
  <h2><a href="https://capgo.app/consulting/?ref=plugin_passkey"> Missing a feature? We’ll build the plugin for you 💪</a></h2>
</div>

Passkeys for Capacitor with a browser-style WebAuthn shim.

## Why this plugin

Most Capacitor apps already have browser-oriented passkey code based on:

```ts
await navigator.credentials.create({ publicKey: registrationOptions });
await navigator.credentials.get({ publicKey: requestOptions });
```

This plugin keeps that shape in a Capacitor app:

- It patches `navigator.credentials.create/get` for `publicKey` requests.
- It forwards the call to native passkey APIs on iOS and Android.
- It returns browser-like credential objects so existing code can keep working.
- It also exposes direct JSON-safe methods when your backend already returns WebAuthn JSON.

What it does not do:

- It does not generate backend challenges for you.
- It does not replace Associated Domains or Digital Asset Links setup.
- It does not make Android native passkeys report your website's HTTPS origin to the server. On Android, normal apps use the app origin (`android:apk-key-hash:...`).

## Documentation

The most complete doc is available here: https://capgo.app/docs/plugins/passkey/

## Compatibility

| Plugin version | Capacitor compatibility | Maintained |
| -------------- | ----------------------- | ---------- |
| v8.\*.\*       | v8.\*.\*                | ✅          |
| v7.\*.\*       | v7.\*.\*                | On demand   |
| v6.\*.\*       | v6.\*.\*                | ❌          |
| v5.\*.\*       | v5.\*.\*                | ❌          |

> **Note:** The major version of this plugin follows the major version of Capacitor. Use the version that matches your Capacitor installation.

## Install

```bash
bun add @capgo/capacitor-passkey
bunx cap sync
```

## Quick Start

Install the shim once during app bootstrap, then keep using browser-style WebAuthn calls:

```ts
import { CapacitorPasskey } from '@capgo/capacitor-passkey';

CapacitorPasskey.shimWebAuthn({
  origin: 'https://signin.example.com',
});

const registration = await navigator.credentials.create({
  publicKey: {
    challenge: crypto.getRandomValues(new Uint8Array(32)),
    rp: {
      id: 'signin.example.com',
      name: 'Example Inc',
    },
    user: {
      id: crypto.getRandomValues(new Uint8Array(32)),
      name: 'ada@example.com',
      displayName: 'Ada Lovelace',
    },
    pubKeyCredParams: [
      { type: 'public-key', alg: -7 },
      { type: 'public-key', alg: -257 },
    ],
  },
});

const authentication = await navigator.credentials.get({
  publicKey: {
    challenge: crypto.getRandomValues(new Uint8Array(32)),
    rpId: 'signin.example.com',
  },
});
```

### Direct JSON-safe API

If your backend already returns `PublicKeyCredentialCreationOptionsJSON` or `PublicKeyCredentialRequestOptionsJSON`, you can call the plugin directly:

```ts
import { CapacitorPasskey } from '@capgo/capacitor-passkey';

const registration = await CapacitorPasskey.createCredential({
  origin: 'https://signin.example.com',
  publicKey: registrationOptionsFromBackend,
});

const authentication = await CapacitorPasskey.getCredential({
  origin: 'https://signin.example.com',
  publicKey: requestOptionsFromBackend,
});
```

## Native Configuration

Passkeys only work when your app is associated with the same relying-party domain as your website.

### iOS

1. Open your Capacitor iOS app target in Xcode.
2. Enable the `Associated Domains` capability.
3. Add a `webcredentials:` entry for your sign-in domain:

```xml
<key>com.apple.developer.associated-domains</key>
<array>
  <string>webcredentials:signin.example.com</string>
</array>
```

4. Host an `apple-app-site-association` file on that domain at:

```text
https://signin.example.com/.well-known/apple-app-site-association
```

Example:

```json
{
  "webcredentials": {
    "apps": [
      "ABCDE12345.app.capgo.passkey.example"
    ]
  }
}
```

Notes:

- The file must be served with HTTP `200`.
- Do not add a `.json` extension.
- The `webcredentials` domain must match the relying-party id you use for passkeys.
- When the app runs from `capacitor://localhost`, pass `origin` to `shimWebAuthn()` if your backend expects a specific HTTPS origin.
- On iOS 17.4 and newer, the plugin uses the browser-style client-data API so the supplied HTTPS origin is reflected in `clientDataJSON`.

### Android

1. Create and host a Digital Asset Links file at:

```text
https://signin.example.com/.well-known/assetlinks.json
```

Example:

```json
[
  {
    "relation": [
      "delegate_permission/common.handle_all_urls",
      "delegate_permission/common.get_login_creds"
    ],
    "target": {
      "namespace": "android_app",
      "package_name": "app.capgo.passkey.example",
      "sha256_cert_fingerprints": [
        "AA:BB:CC:DD:EE:FF:00:11:22:33:44:55:66:77:88:99:AA:BB:CC:DD:EE:FF:00:11:22:33:44:55:66:77:88:99"
      ]
    }
  }
]
```

2. In your Android app manifest, add the `asset_statements` metadata under `<application>`:

```xml
<meta-data
  android:name="asset_statements"
  android:resource="@string/asset_statements" />
```

3. In `android/app/src/main/res/values/strings.xml`, point that metadata to your hosted file:

```xml
<string name="asset_statements" translatable="false">[{\"include\":\"https://signin.example.com/.well-known/assetlinks.json\"}]</string>
```

Notes:

- Use the same domain as your relying-party id.
- Include every signing certificate fingerprint you need, including debug builds if you test them.
- The plugin cannot write these values for you because they belong to the host app, not the plugin.

## Backend Notes

This plugin preserves the front-end WebAuthn API shape, but native platforms are not identical to a browser backend contract.

- iOS 17.4+ can encode the HTTPS origin you pass to the shim or direct API.
- Android Credential Manager does **not** act like a privileged browser app. The native response origin is tied to the Android app signature (`android:apk-key-hash:...`), not automatically to your website.
- With Digital Asset Links configured, Android can still use the same relying party and passkeys as your website. The part that differs is the literal `clientDataJSON.origin` string.
- If your server strictly validates `clientDataJSON.origin`, allow the Android app origin alongside your web origin.
- Your backend still needs the normal WebAuthn challenge lifecycle and signature verification.

## Web Behavior

- On the web, the plugin forwards to the real browser WebAuthn API.
- On native Capacitor, the shim returns browser-like credential objects backed by native APIs.
- Conditional mediation currently returns `false`.

## Example App

The `example-app/` folder demonstrates the shim flow with `navigator.credentials.create/get` and lets you set the relying-party origin used by the native bridge.

## API

<docgen-index>

* [`shimWebAuthn(...)`](#shimwebauthn)
* [`createCredential(...)`](#createcredential)
* [`getCredential(...)`](#getcredential)
* [`isSupported()`](#issupported)
* [`getPluginVersion()`](#getpluginversion)
* [Interfaces](#interfaces)
* [Type Aliases](#type-aliases)

</docgen-index>

<docgen-api>
<!--Update the source file JSDoc comments and rerun docgen to update the docs below-->

Capacitor Passkey plugin.

Use `shimWebAuthn()` to keep existing `navigator.credentials.create/get`
code working inside a Capacitor app.

### shimWebAuthn(...)

```typescript
shimWebAuthn(options?: ShimWebAuthnOptions | undefined) => void
```

Install a browser-style WebAuthn shim on top of the native plugin.

The shim patches `navigator.credentials.create/get` for `publicKey`
requests and returns browser-like credential objects.

| Param         | Type                                                                |
| ------------- | ------------------------------------------------------------------- |
| **`options`** | <code><a href="#shimwebauthnoptions">ShimWebAuthnOptions</a></code> |

**Since:** 1.0.0

--------------------


### createCredential(...)

```typescript
createCredential(options: CreateCredentialOptions) => Promise<PasskeyRegistrationCredential>
```

Register a passkey from a JSON-safe WebAuthn request.

This method is useful when your backend already returns the
`PublicKeyCredentialCreationOptionsJSON` form.

| Param         | Type                                                                        |
| ------------- | --------------------------------------------------------------------------- |
| **`options`** | <code><a href="#createcredentialoptions">CreateCredentialOptions</a></code> |

**Returns:** <code>Promise&lt;<a href="#passkeyregistrationcredential">PasskeyRegistrationCredential</a>&gt;</code>

**Since:** 1.0.0

--------------------


### getCredential(...)

```typescript
getCredential(options: GetCredentialOptions) => Promise<PasskeyAuthenticationCredential>
```

Authenticate with an existing passkey from a JSON-safe WebAuthn request.

This method is useful when your backend already returns the
`PublicKeyCredentialRequestOptionsJSON` form.

| Param         | Type                                                                  |
| ------------- | --------------------------------------------------------------------- |
| **`options`** | <code><a href="#getcredentialoptions">GetCredentialOptions</a></code> |

**Returns:** <code>Promise&lt;<a href="#passkeyauthenticationcredential">PasskeyAuthenticationCredential</a>&gt;</code>

**Since:** 1.0.0

--------------------


### isSupported()

```typescript
isSupported() => Promise<PasskeySupportResult>
```

Report whether passkeys are available in the current runtime.

**Returns:** <code>Promise&lt;<a href="#passkeysupportresult">PasskeySupportResult</a>&gt;</code>

**Since:** 1.0.0

--------------------


### getPluginVersion()

```typescript
getPluginVersion() => Promise<PluginVersionResult>
```

Returns the current platform implementation version marker.

**Returns:** <code>Promise&lt;<a href="#pluginversionresult">PluginVersionResult</a>&gt;</code>

**Since:** 1.0.0

--------------------


### Interfaces


#### ShimWebAuthnOptions

Options used when installing the browser-style shim.

| Prop         | Type                 | Description                                                                                                                                                                                    |
| ------------ | -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **`origin`** | <code>string</code>  | Optional HTTPS origin to encode into iOS 17.4+ clientDataJSON. Use this when your Capacitor app runs from `capacitor://localhost` but your relying party expects `https://signin.example.com`. |
| **`force`**  | <code>boolean</code> | Force the shim even if the runtime already exposes `navigator.credentials`. Defaults to `false`.                                                                                               |


#### PasskeyRegistrationCredential

JSON-safe registration credential returned by the plugin.

| Prop                          | Type                                                                                                                | Description                                                 |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| **`id`**                      | <code>string</code>                                                                                                 | Base64url-encoded credential identifier.                    |
| **`rawId`**                   | <code>string</code>                                                                                                 | Base64url-encoded raw credential identifier.                |
| **`type`**                    | <code><a href="#passkeycredentialtype">PasskeyCredentialType</a></code>                                             | Credential type. Always `public-key`.                       |
| **`authenticatorAttachment`** | <code><a href="#passkeyauthenticatorattachment">PasskeyAuthenticatorAttachment</a></code>                           | Optional authenticator attachment reported by the platform. |
| **`clientExtensionResults`**  | <code><a href="#record">Record</a>&lt;string, unknown&gt;</code>                                                    | Client extension results returned by the platform.          |
| **`response`**                | <code><a href="#passkeyauthenticatorattestationresponsejson">PasskeyAuthenticatorAttestationResponseJSON</a></code> | Registration response payload.                              |


#### PasskeyAuthenticatorAttestationResponseJSON

JSON-safe attestation response payload.

All binary fields are base64url encoded.

| Prop                     | Type                  | Description                                                          |
| ------------------------ | --------------------- | -------------------------------------------------------------------- |
| **`clientDataJSON`**     | <code>string</code>   | Base64url-encoded clientDataJSON.                                    |
| **`attestationObject`**  | <code>string</code>   | Base64url-encoded attestation object.                                |
| **`publicKey`**          | <code>string</code>   | Optional base64url-encoded public key when provided by the platform. |
| **`publicKeyAlgorithm`** | <code>number</code>   | Optional public key algorithm when provided by the platform.         |
| **`transports`**         | <code>string[]</code> | Optional transport list when provided by the platform.               |


#### CreateCredentialOptions

Direct registration request for the plugin transport.

| Prop            | Type                                                                                                                    | Description                                                              |
| --------------- | ----------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| **`publicKey`** | <code><a href="#passkeypublickeycredentialcreationoptionsjson">PasskeyPublicKeyCredentialCreationOptionsJSON</a></code> | JSON-safe registration request.                                          |
| **`origin`**    | <code>string</code>                                                                                                     | Optional HTTPS origin to use for iOS 17.4+ browser-style clientDataJSON. |


#### PasskeyPublicKeyCredentialCreationOptionsJSON

JSON-safe registration request options.

All binary fields must be base64url encoded.

| Prop                         | Type                                                                                    | Description                                                                |
| ---------------------------- | --------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| **`challenge`**              | <code>string</code>                                                                     | Base64url-encoded challenge.                                               |
| **`rp`**                     | <code><a href="#passkeyrelyingparty">PasskeyRelyingParty</a></code>                     | Relying party information.                                                 |
| **`user`**                   | <code><a href="#passkeyuserentity">PasskeyUserEntity</a></code>                         | User information.                                                          |
| **`pubKeyCredParams`**       | <code>PasskeyCredentialParameter[]</code>                                               | Supported credential algorithms.                                           |
| **`timeout`**                | <code>number</code>                                                                     | Optional timeout hint in milliseconds.                                     |
| **`excludeCredentials`**     | <code>PasskeyCredentialDescriptor[]</code>                                              | Optional credentials that must be excluded during registration.            |
| **`authenticatorSelection`** | <code><a href="#passkeyauthenticatorselection">PasskeyAuthenticatorSelection</a></code> | Optional authenticator preferences.                                        |
| **`attestation`**            | <code><a href="#passkeyattestation">PasskeyAttestation</a></code>                       | Optional attestation preference.                                           |
| **`hints`**                  | <code>string[]</code>                                                                   | Optional hints copied from the JSON form used by modern WebAuthn toolkits. |
| **`extensions`**             | <code><a href="#record">Record</a>&lt;string, unknown&gt;</code>                        | Optional extensions copied as-is into the request JSON.                    |


#### PasskeyRelyingParty

JSON-safe relying party information.

| Prop       | Type                | Description                                                                                         |
| ---------- | ------------------- | --------------------------------------------------------------------------------------------------- |
| **`id`**   | <code>string</code> | Relying party identifier. If omitted, the shim derives it from the configured origin when possible. |
| **`name`** | <code>string</code> | Human-readable relying party name.                                                                  |


#### PasskeyUserEntity

JSON-safe WebAuthn user entity.

Binary identifiers must be base64url encoded.

| Prop              | Type                | Description                                       |
| ----------------- | ------------------- | ------------------------------------------------- |
| **`id`**          | <code>string</code> | Base64url-encoded user handle.                    |
| **`name`**        | <code>string</code> | User name shown by the authenticator.             |
| **`displayName`** | <code>string</code> | Optional display name shown by the authenticator. |


#### PasskeyCredentialParameter

JSON-safe credential parameter entry.

| Prop       | Type                                                                    | Description                                      |
| ---------- | ----------------------------------------------------------------------- | ------------------------------------------------ |
| **`type`** | <code><a href="#passkeycredentialtype">PasskeyCredentialType</a></code> | Credential type. Only `public-key` is supported. |
| **`alg`**  | <code>number</code>                                                     | COSE algorithm identifier.                       |


#### PasskeyCredentialDescriptor

JSON-safe representation of a public key credential descriptor.

Binary identifiers must be base64url encoded.

| Prop             | Type                                                                    | Description                                      |
| ---------------- | ----------------------------------------------------------------------- | ------------------------------------------------ |
| **`id`**         | <code>string</code>                                                     | Base64url-encoded credential identifier.         |
| **`type`**       | <code><a href="#passkeycredentialtype">PasskeyCredentialType</a></code> | Credential type. Only `public-key` is supported. |
| **`transports`** | <code>string[]</code>                                                   | Optional transport hints copied from WebAuthn.   |


#### PasskeyAuthenticatorSelection

JSON-safe authenticator selection options.

| Prop                          | Type                                                                                      | Description                             |
| ----------------------------- | ----------------------------------------------------------------------------------------- | --------------------------------------- |
| **`authenticatorAttachment`** | <code><a href="#passkeyauthenticatorattachment">PasskeyAuthenticatorAttachment</a></code> | Optional authenticator attachment hint. |
| **`residentKey`**             | <code><a href="#passkeyresidentkey">PasskeyResidentKey</a></code>                         | Optional resident key preference.       |
| **`requireResidentKey`**      | <code>boolean</code>                                                                      | Legacy resident key requirement flag.   |
| **`userVerification`**        | <code><a href="#passkeyuserverification">PasskeyUserVerification</a></code>               | Optional user verification preference.  |


#### PasskeyAuthenticationCredential

JSON-safe authentication credential returned by the plugin.

| Prop                          | Type                                                                                                            | Description                                                 |
| ----------------------------- | --------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| **`id`**                      | <code>string</code>                                                                                             | Base64url-encoded credential identifier.                    |
| **`rawId`**                   | <code>string</code>                                                                                             | Base64url-encoded raw credential identifier.                |
| **`type`**                    | <code><a href="#passkeycredentialtype">PasskeyCredentialType</a></code>                                         | Credential type. Always `public-key`.                       |
| **`authenticatorAttachment`** | <code><a href="#passkeyauthenticatorattachment">PasskeyAuthenticatorAttachment</a></code>                       | Optional authenticator attachment reported by the platform. |
| **`clientExtensionResults`**  | <code><a href="#record">Record</a>&lt;string, unknown&gt;</code>                                                | Client extension results returned by the platform.          |
| **`response`**                | <code><a href="#passkeyauthenticatorassertionresponsejson">PasskeyAuthenticatorAssertionResponseJSON</a></code> | Assertion response payload.                                 |


#### PasskeyAuthenticatorAssertionResponseJSON

JSON-safe assertion response payload.

All binary fields are base64url encoded.

| Prop                    | Type                        | Description                             |
| ----------------------- | --------------------------- | --------------------------------------- |
| **`clientDataJSON`**    | <code>string</code>         | Base64url-encoded clientDataJSON.       |
| **`authenticatorData`** | <code>string</code>         | Base64url-encoded authenticator data.   |
| **`signature`**         | <code>string</code>         | Base64url-encoded signature.            |
| **`userHandle`**        | <code>string \| null</code> | Optional base64url-encoded user handle. |


#### GetCredentialOptions

Direct authentication request for the plugin transport.

| Prop            | Type                                                                                                                  | Description                                                                        |
| --------------- | --------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| **`publicKey`** | <code><a href="#passkeypublickeycredentialrequestoptionsjson">PasskeyPublicKeyCredentialRequestOptionsJSON</a></code> | JSON-safe authentication request.                                                  |
| **`mediation`** | <code>string</code>                                                                                                   | Optional mediation hint. `conditional` currently falls back to an explicit prompt. |
| **`origin`**    | <code>string</code>                                                                                                   | Optional HTTPS origin to use for iOS 17.4+ browser-style clientDataJSON.           |


#### PasskeyPublicKeyCredentialRequestOptionsJSON

JSON-safe authentication request options.

All binary fields must be base64url encoded.

| Prop                   | Type                                                                        | Description                                                                                                  |
| ---------------------- | --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| **`challenge`**        | <code>string</code>                                                         | Base64url-encoded challenge.                                                                                 |
| **`timeout`**          | <code>number</code>                                                         | Optional timeout hint in milliseconds.                                                                       |
| **`rpId`**             | <code>string</code>                                                         | Optional relying party identifier. If omitted, the shim derives it from the configured origin when possible. |
| **`allowCredentials`** | <code>PasskeyCredentialDescriptor[]</code>                                  | Optional allow list copied from WebAuthn.                                                                    |
| **`userVerification`** | <code><a href="#passkeyuserverification">PasskeyUserVerification</a></code> | Optional user verification preference.                                                                       |
| **`hints`**            | <code>string[]</code>                                                       | Optional hints copied from the JSON form used by modern WebAuthn toolkits.                                   |
| **`extensions`**       | <code><a href="#record">Record</a>&lt;string, unknown&gt;</code>            | Optional extensions copied as-is into the request JSON.                                                      |


#### PasskeySupportResult

Passkey support status for the current runtime.

| Prop                       | Type                                     | Description                                            |
| -------------------------- | ---------------------------------------- | ------------------------------------------------------ |
| **`available`**            | <code>boolean</code>                     | Whether passkeys are available on the current runtime. |
| **`conditionalMediation`** | <code>boolean</code>                     | Whether conditional mediation is available.            |
| **`platform`**             | <code>'ios' \| 'android' \| 'web'</code> | Current platform identifier.                           |


#### PluginVersionResult

Plugin version payload.

| Prop          | Type                | Description                                                         |
| ------------- | ------------------- | ------------------------------------------------------------------- |
| **`version`** | <code>string</code> | Version identifier reported by the current platform implementation. |


### Type Aliases


#### PasskeyCredentialType

Supported WebAuthn credential type.

<code>'public-key'</code>


#### PasskeyAuthenticatorAttachment

Supported authenticator attachment values.

<code>'platform' | 'cross-platform'</code>


#### Record

Construct a type with a set of properties K of type T

<code>{ [P in K]: T; }</code>


#### PasskeyResidentKey

Supported resident key preferences.

<code>'discouraged' | 'preferred' | 'required'</code>


#### PasskeyUserVerification

Supported user verification preferences.

<code>'discouraged' | 'preferred' | 'required'</code>


#### PasskeyAttestation

Supported attestation preferences.

<code>'none' | 'indirect' | 'direct' | 'enterprise'</code>

</docgen-api>
