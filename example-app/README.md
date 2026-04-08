# Example App for `@capgo/capacitor-passkey`

This Vite project links directly to the local plugin source and demonstrates the intended flow:

- install the shim
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

Before a real native passkey flow succeeds, configure:

- iOS `Associated Domains` with `webcredentials:<your-domain>`
- Android `assetlinks.json` plus `asset_statements`
- a backend challenge for registration and authentication
