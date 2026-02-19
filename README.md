# @capgo/capacitor-plugin-template
 <a href="https://capgo.app/"><img src='https://raw.githubusercontent.com/Cap-go/capgo/main/assets/capgo_banner.png' alt='Capgo - Instant updates for capacitor'/></a>

<div align="center">
  <h2><a href="https://capgo.app/?ref=plugin_{{PLUGIN_REF_SLUG}}"> ➡️ Get Instant updates for your App with Capgo</a></h2>
  <h2><a href="https://capgo.app/consulting/?ref=plugin_{{PLUGIN_REF_SLUG}}"> Missing a feature? We’ll build the plugin for you 💪</a></h2>
</div>

> Template README. Replace every `{{PLACEHOLDER}}` value before releasing.

## Snapshot

- **Plugin name:** `{{PLUGIN_DISPLAY_NAME}}`
- **One-line value:** `{{PLUGIN_TAGLINE}}`
- **Maintainer:** `{{MAINTAINER_OR_TEAM}}`
- **Status:** `{{alpha|beta|stable}}`

## Pre-Release Checklist

- [ ] Replace all `{{PLACEHOLDER}}` values in this README.
- [ ] Replace `{{PLUGIN_REF_SLUG}}` in Capgo CTA links (example: `native_audio`).
- [ ] Replace all `__AI_KEYWORD_*__` entries in `package.json`.
- [ ] Change git remote away from this template before first push:
  `git remote set-url origin git@github.com:Cap-go/capacitor-{{PLUGIN_SLUG}}.git`
- [ ] Remove bootstrap-only init script from generated plugin copy:
  delete `scripts/init-plugin.sh` and remove `"init-plugin"` from `package.json` scripts.
- [ ] Update the compatibility table for this plugin.
- [ ] Update `src/definitions.ts` with the real public API and JSDoc.
- [ ] Run `bun run docgen` and review generated API docs below.
- [ ] Confirm examples in this file run against the real implementation.
- [ ] Set GitHub repo description to start with `Capacitor plugin for ...`.
- [ ] Set GitHub repo homepage to `https://capgo.app/docs/plugins/{{PLUGIN_SLUG}}/`.
- [ ] Open docs/website PR and follow the complete website integration checklist in section **3) Open docs/website pull request**.
- [ ] Run `bun run verify` before publishing.

## Problem & Scope

### Why this plugin exists

`{{WHAT_PAIN_POINT_IT_SOLVES}}`

## Capgo Links

- **Plugin docs URL:** `https://capgo.app/docs/plugins/{{PLUGIN_SLUG}}/`
- **Plugin tutorial URL:** `{{PLUGIN_TUTORIAL_URL}}`
- **Website/docs repo:** `https://github.com/Cap-go/website`

### What it does

- `{{CAPABILITY_1}}`
- `{{CAPABILITY_2}}`
- `{{CAPABILITY_3}}`

### What it does not do

- `{{OUT_OF_SCOPE_1}}`
- `{{OUT_OF_SCOPE_2}}`

## Compatibility

| Plugin version | Capacitor compatibility | Maintained |
| -------------- | ----------------------- | ---------- |
| v8.\*.\*       | v8.\*.\*                | ✅          |
| v7.\*.\*       | v7.\*.\*                | On demand   |
| v6.\*.\*       | v6.\*.\*                | On demand   |

Policy:

- New plugins start at version `8.0.0` (Capacitor 8 baseline).
- Backward compatibility for older Capacitor majors is supported on demand.

## Quick Start (Template Authors)

```bash
bun install
bun run init-plugin your-plugin YourPlugin app.capgo.yourplugin
bun run verify
```

The `init-plugin` command updates package names, native class names, iOS/Android identifiers, and the local example app wiring.

After running `init-plugin` in your new plugin copy:

```bash
git remote set-url origin git@github.com:Cap-go/capacitor-your-plugin.git
rm scripts/init-plugin.sh
```

Then remove `"init-plugin"` from the `scripts` section in `package.json` before publishing.

## Public Launch (Required)

### 1) Publish in Capgo GitHub org as public

```bash
gh repo create Cap-go/capacitor-{{PLUGIN_SLUG}} --public --source=. --remote=origin --push
```

If the repo already exists and is private:

```bash
gh repo edit Cap-go/capacitor-{{PLUGIN_SLUG}} --visibility public --accept-visibility-change-consequences
```

### 2) Set GitHub description and homepage

Description must always start with: `Capacitor plugin for ...`

```bash
gh repo edit Cap-go/capacitor-{{PLUGIN_SLUG}} \
  --description "Capacitor plugin for {{SHORT_USE_CASE}}." \
  --homepage "https://capgo.app/docs/plugins/{{PLUGIN_SLUG}}/"
```

### 3) Open docs/website pull request

Create a PR on `https://github.com/Cap-go/website` (or the local `landing/` folder in the monorepo) with all of the following:

1. Add the plugin entry in `src/config/plugins.ts`.
2. Add a plugin `LinkCard` in `src/content/docs/docs/plugins/index.mdx`.
3. Create docs pages in `src/content/docs/docs/plugins/<plugin-doc-slug>/`:
   `index.mdx`, `getting-started.mdx`, and optionally `ios.mdx` + `android.mdx` when platform setup differs.
4. Update `astro.config.mjs`:
   add `docs/plugins/<plugin-doc-slug>/**` in pagefind path buckets and add a sidebar section for the plugin pages.
5. Add the SEO tutorial page in `src/content/plugins-tutorials/en/<plugin-repo-slug>.md`.
6. Add icon asset `public/icons/plugins/<plugin-doc-slug>.svg` if the docs hero uses a plugin icon.
7. Cross-link docs and tutorial pages.

Slug mapping rules:

- `<plugin-doc-slug>` is the docs route slug used under `/docs/plugins/<plugin-doc-slug>/`.
- `<plugin-repo-slug>` is extracted from the GitHub repo URL in `src/config/plugins.ts` and is used by `/plugins/<slug>/`.
- Example: repo `https://github.com/Cap-go/capacitor-app-attest/` requires tutorial file
  `src/content/plugins-tutorials/en/capacitor-app-attest.md`.

Starter snippets:

`src/config/plugins.ts`

```ts
{
  name: '@capgo/capacitor-{{PLUGIN_SLUG}}',
  author: 'github.com/Cap-go',
  description: 'Capacitor plugin for {{SHORT_USE_CASE}}',
  href: 'https://github.com/Cap-go/capacitor-{{PLUGIN_SLUG}}/',
  title: '{{PLUGIN_DISPLAY_NAME}}',
  icon: ShieldCheckIcon,
},
```

`astro.config.mjs` sidebar entry

```ts
{
  label: '{{PLUGIN_DISPLAY_NAME}}',
  items: [
    { label: 'Overview', link: '/docs/plugins/<plugin-doc-slug>/' },
    { label: 'Getting started', link: '/docs/plugins/<plugin-doc-slug>/getting-started' },
    { label: 'iOS setup', link: '/docs/plugins/<plugin-doc-slug>/ios' },
    { label: 'Android setup', link: '/docs/plugins/<plugin-doc-slug>/android' },
  ],
  collapsed: true,
},
```

Required docs files:

- `src/content/docs/docs/plugins/<plugin-doc-slug>/index.mdx`
- `src/content/docs/docs/plugins/<plugin-doc-slug>/getting-started.mdx`
- `src/content/docs/docs/plugins/<plugin-doc-slug>/ios.mdx` (if iOS-specific setup exists)
- `src/content/docs/docs/plugins/<plugin-doc-slug>/android.mdx` (if Android-specific setup exists)
- `src/content/plugins-tutorials/en/<plugin-repo-slug>.md`

## Install

```bash
bun add @capgo/capacitor-plugin-template
bunx cap sync
```

## Minimal Usage

```typescript
import { PluginTemplate } from '@capgo/capacitor-plugin-template';

const result = await PluginTemplate.echo({ value: 'Hello from Capgo' });
console.log(result.value);
```

## Integration Notes

- **iOS:** `{{IOS_NOTES_OR_PERMISSIONS}}`
- **Android:** `{{ANDROID_NOTES_OR_PERMISSIONS}}`
- **Web:** `{{WEB_LIMITATIONS_OR_BEHAVIOR}}`

## Example App

The `example-app/` folder is linked via `file:..` and is intended for validating native wiring during development.

## API

<docgen-index>

* [`echo(...)`](#echo)
* [`getPluginVersion()`](#getpluginversion)
* [Interfaces](#interfaces)

</docgen-index>

<docgen-api>
<!--Update the source file JSDoc comments and rerun docgen to update the docs below-->

Base API used by the template plugin.

### echo(...)

```typescript
echo(options: EchoOptions) => Promise<EchoResult>
```

Echo a string to validate JS &lt;-&gt; native wiring.

| Param         | Type                                                |
| ------------- | --------------------------------------------------- |
| **`options`** | <code><a href="#echooptions">EchoOptions</a></code> |

**Returns:** <code>Promise&lt;<a href="#echoresult">EchoResult</a>&gt;</code>

--------------------

### getPluginVersion()

```typescript
getPluginVersion() => Promise<PluginVersionResult>
```

Returns the platform implementation version marker.

**Returns:** <code>Promise&lt;<a href="#pluginversionresult">PluginVersionResult</a>&gt;</code>

--------------------

### Interfaces

#### EchoResult

Echo response payload.

| Prop        | Type                | Description                      |
| ----------- | ------------------- | -------------------------------- |
| **`value`** | <code>string</code> | The same value passed to `echo`. |

#### EchoOptions

Input payload for the echo call.

| Prop        | Type                | Description                                                           |
| ----------- | ------------------- | --------------------------------------------------------------------- |
| **`value`** | <code>string</code> | Arbitrary text that should be returned by native/web implementations. |

#### PluginVersionResult

Plugin version payload.

| Prop          | Type                | Description                                                 |
| ------------- | ------------------- | ----------------------------------------------------------- |
| **`version`** | <code>string</code> | Version identifier returned by the platform implementation. |

</docgen-api>
