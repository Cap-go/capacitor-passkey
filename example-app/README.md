# Example App for `@capgo/capacitor-passkey`

This Vite project links directly to the local plugin source and demonstrates the intended flow:

- configure the plugin in `capacitor.config.json`
- import `CapacitorPasskey` from `@capgo/capacitor-passkey`
- call `CapacitorPasskey.autoShimWebAuthn()` during app bootstrap
- call `navigator.credentials.create()`
- call `navigator.credentials.get()`
- inspect the JSON result coming back from native

## Getting started

```bash
bun install
bun run start
```

To test on native shells:

```bash
bunx cap add ios
bunx cap add android
bunx cap sync
```

During `bunx cap sync`, the plugin hook updates the generated native projects for the configured passkey domain.

Before a real native passkey flow succeeds, you still need:

- `apple-app-site-association` on your iOS relying-party domain
- `assetlinks.json` on your Android relying-party domain
- a backend challenge for registration and authentication
