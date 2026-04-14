#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const ROOT_DIR = process.env.CAPACITOR_ROOT_DIR;
const PLATFORM = process.env.CAPACITOR_PLATFORM_NAME;
const CONFIG_JSON = process.env.CAPACITOR_CONFIG;
const ANDROID_META_BLOCK = `        <!-- CapacitorPasskey auto-configuration -->\n        <meta-data\n            android:name="asset_statements"\n            android:resource="@string/capacitor_passkey_asset_statements" />`;

function log(message) {
  console.log(`[CapacitorPasskey] ${message}`);
}

function warn(message) {
  console.warn(`[CapacitorPasskey] ${message}`);
}

function parseConfig() {
  if (!CONFIG_JSON) {
    return {
      autoShim: true,
      domains: [],
      origin: undefined,
    };
  }

  try {
    const config = JSON.parse(CONFIG_JSON);
    const pluginConfig = config?.plugins?.CapacitorPasskey ?? {};
    const origin = normalizeOrigin(pluginConfig.origin);
    return {
      autoShim: pluginConfig.autoShim !== false,
      domains: collectDomains(pluginConfig.domains, origin),
      origin,
    };
  } catch (error) {
    warn(`Could not parse CAPACITOR_CONFIG: ${error.message}`);
    return {
      autoShim: true,
      domains: [],
      origin: undefined,
    };
  }
}

function normalizeOrigin(value) {
  if (typeof value !== 'string' || value.trim() === '') {
    return undefined;
  }

  try {
    const parsed = new URL(value);
    if (parsed.protocol !== 'https:') {
      warn(`Ignoring non-HTTPS origin "${value}". Passkey origin should be HTTPS.`);
      return undefined;
    }

    return parsed.origin;
  } catch {
    warn(`Ignoring invalid origin "${value}".`);
    return undefined;
  }
}

function normalizeDomain(value) {
  if (typeof value !== 'string' || value.trim() === '') {
    return undefined;
  }

  try {
    return new URL(value).hostname || undefined;
  } catch {
    return value.trim();
  }
}

function collectDomains(configuredDomains, origin) {
  const domains = new Set();

  if (Array.isArray(configuredDomains)) {
    for (const domain of configuredDomains) {
      const normalized = normalizeDomain(domain);
      if (normalized) {
        domains.add(normalized);
      }
    }
  }

  if (origin) {
    domains.add(new URL(origin).hostname);
  }

  return [...domains];
}

function ensureParentDirectory(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function escapeXml(value) {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function writeFileIfChanged(filePath, nextContent) {
  const previousContent = fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf8') : undefined;
  if (previousContent === nextContent) {
    return false;
  }

  ensureParentDirectory(filePath);
  fs.writeFileSync(filePath, nextContent, 'utf8');
  return true;
}

function removeManagedAndroidMetadata(content) {
  return content.replace(
    /\n?\s*<!-- CapacitorPasskey auto-configuration -->\n\s*<meta-data\s+android:name="asset_statements"\s+android:resource="@string\/capacitor_passkey_asset_statements"\s*\/>\n?/m,
    '\n',
  );
}

function configureAndroid(rootDir, domains) {
  const manifestPath = path.join(rootDir, 'android', 'app', 'src', 'main', 'AndroidManifest.xml');
  const valuesPath = path.join(rootDir, 'android', 'app', 'src', 'main', 'res', 'values', 'capacitor-passkey.xml');

  if (!fs.existsSync(manifestPath)) {
    log('Skipping Android auto-configuration because AndroidManifest.xml was not found.');
    return;
  }

  let manifest = fs.readFileSync(manifestPath, 'utf8');
  manifest = removeManagedAndroidMetadata(manifest);

  if (domains.length > 0) {
    if (!manifest.includes('@string/capacitor_passkey_asset_statements')) {
      manifest = manifest.replace('</application>', `${ANDROID_META_BLOCK}\n    </application>`);
    }

    const includes = domains.map((domain) => ({
      include: `https://${domain}/.well-known/assetlinks.json`,
    }));
    const xml = `<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <string name="capacitor_passkey_asset_statements" translatable="false">${escapeXml(JSON.stringify(includes))}</string>\n</resources>\n`;

    const valuesChanged = writeFileIfChanged(valuesPath, xml);
    const manifestChanged = writeFileIfChanged(manifestPath, manifest);

    if (manifestChanged || valuesChanged) {
      log(`Updated Android passkey wiring for ${domains.join(', ')}.`);
    }
    return;
  }

  const manifestChanged = writeFileIfChanged(manifestPath, manifest);
  if (fs.existsSync(valuesPath)) {
    fs.unlinkSync(valuesPath);
  }

  if (manifestChanged) {
    log('Removed Android passkey auto-configuration because no domains are configured.');
  }
}

function createEntitlementsPlist() {
  return `<?xml version="1.0" encoding="UTF-8"?>\n<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">\n<plist version="1.0">\n<dict>\n</dict>\n</plist>\n`;
}

function ensureIosEntitlementsReference(projectContent, entitlementsRelativePath) {
  if (projectContent.includes('CODE_SIGN_ENTITLEMENTS =')) {
    return projectContent;
  }

  return projectContent.replace(
    /(\s*INFOPLIST_FILE = App\/Info\.plist;\n)/g,
    `\t\t\t\tCODE_SIGN_ENTITLEMENTS = ${entitlementsRelativePath};\n$1`,
  );
}

function findExistingEntitlementsPath(projectContent) {
  const match = projectContent.match(/CODE_SIGN_ENTITLEMENTS = ([^;]+);/);
  return match?.[1]?.trim();
}

function parseAssociatedDomains(content) {
  const match = content.match(
    /^(\s*)<key>com\.apple\.developer\.associated-domains<\/key>\s*<array>([\s\S]*?)<\/array>/m,
  );

  if (!match) {
    return undefined;
  }

  const [fullMatch, indent, body] = match;
  const items = [];
  const itemRegex = /<string>([^<]+)<\/string>/g;
  let itemMatch;
  while ((itemMatch = itemRegex.exec(body))) {
    items.push(itemMatch[1].trim());
  }

  return { fullMatch, indent: indent ?? '\t', items };
}

function buildAssociatedDomainsBlock(indent, items) {
  const childIndent = indent.includes('\t') || indent === '' ? '\t' : '    ';
  const arrayIndent = `${indent}${childIndent}`;
  const lines = [
    `${indent}<key>com.apple.developer.associated-domains</key>`,
    `${indent}<array>`,
    ...items.map((item) => `${arrayIndent}<string>${item}</string>`),
    `${indent}</array>`,
  ];

  return `${lines.join('\n')}\n`;
}

function upsertAssociatedDomains(content, webCredentialEntries) {
  const parsed = parseAssociatedDomains(content);
  const webCredentialSet = new Set(webCredentialEntries);

  if (parsed) {
    const preserved = parsed.items.filter((item) => !item.startsWith('webcredentials:'));
    const merged = [...preserved, ...webCredentialSet];
    const nextBlock = buildAssociatedDomainsBlock(parsed.indent, merged);
    return content.replace(parsed.fullMatch, nextBlock);
  }

  if (webCredentialEntries.length === 0) {
    return content;
  }

  const indent = '\t';
  const nextBlock = buildAssociatedDomainsBlock(indent, [...webCredentialSet]);
  return content.replace('</dict>', `${nextBlock}</dict>`);
}

function configureIOS(rootDir, domains) {
  const iosProjectRoot = path.join(rootDir, 'ios', 'App');
  const pbxprojPath = path.join(iosProjectRoot, 'App.xcodeproj', 'project.pbxproj');

  if (!fs.existsSync(pbxprojPath)) {
    log('Skipping iOS auto-configuration because App.xcodeproj was not found.');
    return;
  }

  let projectContent = fs.readFileSync(pbxprojPath, 'utf8');
  const entitlementsRelativePath = findExistingEntitlementsPath(projectContent) ?? 'App/App.entitlements';
  const entitlementsPath = path.join(iosProjectRoot, entitlementsRelativePath);
  const associatedDomains = domains.map((domain) => `webcredentials:${domain}`);

  const originalEntitlements = fs.existsSync(entitlementsPath)
    ? fs.readFileSync(entitlementsPath, 'utf8')
    : createEntitlementsPlist();
  const nextEntitlements = upsertAssociatedDomains(
    originalEntitlements.includes('<dict>') ? originalEntitlements : createEntitlementsPlist(),
    associatedDomains,
  );
  const entitlementsChanged = writeFileIfChanged(entitlementsPath, nextEntitlements);

  projectContent = ensureIosEntitlementsReference(projectContent, entitlementsRelativePath);
  const projectChanged = writeFileIfChanged(pbxprojPath, projectContent);

  if (entitlementsChanged || projectChanged) {
    if (domains.length > 0) {
      log(`Updated iOS associated domains for ${domains.join(', ')}.`);
    } else {
      log('Removed iOS associated domains because no passkey domains are configured.');
    }
  }
}

function run() {
  if (!ROOT_DIR) {
    warn('CAPACITOR_ROOT_DIR is not set. Skipping automatic native configuration.');
    return;
  }

  const config = parseConfig();
  if (config.autoShim === false) {
    log('Native auto-configuration disabled via plugins.CapacitorPasskey.autoShim = false.');
    return;
  }

  if (config.domains.length === 0) {
    log(
      'No passkey domains configured. Add plugins.CapacitorPasskey.origin or domains in capacitor.config.* to enable automatic native wiring.',
    );
    return;
  }
  const shouldConfigureAndroid = !PLATFORM || PLATFORM === 'android';
  const shouldConfigureIOS = !PLATFORM || PLATFORM === 'ios';

  if (shouldConfigureAndroid) {
    configureAndroid(ROOT_DIR, config.domains);
  }

  if (shouldConfigureIOS) {
    configureIOS(ROOT_DIR, config.domains);
  }
}

run();
