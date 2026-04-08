import './style.css';
import { CapacitorPasskey } from '@capgo/capacitor-passkey';

const output = document.getElementById('plugin-output');
const statusPill = document.getElementById('status-pill');

const originInput = document.getElementById('origin');
const rpIdInput = document.getElementById('rp-id');
const rpNameInput = document.getElementById('rp-name');
const userNameInput = document.getElementById('user-name');
const displayNameInput = document.getElementById('display-name');
const allowCredentialIdInput = document.getElementById('allow-credential-id');

const installShimButton = document.getElementById('install-shim');
const checkSupportButton = document.getElementById('check-support');
const registerButton = document.getElementById('register-passkey');
const authenticateButton = document.getElementById('authenticate-passkey');
const versionButton = document.getElementById('plugin-version');

const setStatus = (value) => {
  statusPill.textContent = value;
};

const setOutput = (value) => {
  output.textContent = typeof value === 'string' ? value : JSON.stringify(value, null, 2);
};

const randomBytes = (length) => {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return bytes;
};

const toBase64Url = (bytes) => {
  const binary = String.fromCharCode(...bytes);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/u, '');
};

const fromBase64Url = (value) => {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padding = normalized.length % 4 === 0 ? '' : '='.repeat(4 - (normalized.length % 4));
  const binary = atob(`${normalized}${padding}`);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
};

const currentOrigin = () => originInput.value.trim() || undefined;
const currentRpId = () => rpIdInput.value.trim() || undefined;

const installShim = () => {
  CapacitorPasskey.shimWebAuthn({
    origin: currentOrigin(),
  });
  setStatus('Shim installed');
};

const registrationOptions = () => ({
  challenge: randomBytes(32),
  rp: {
    id: currentRpId(),
    name: rpNameInput.value.trim() || 'Example Inc',
  },
  user: {
    id: randomBytes(32),
    name: userNameInput.value.trim() || 'ada@example.com',
    displayName: displayNameInput.value.trim() || userNameInput.value.trim() || 'Ada Lovelace',
  },
  pubKeyCredParams: [
    { type: 'public-key', alg: -7 },
    { type: 'public-key', alg: -257 },
  ],
  authenticatorSelection: {
    authenticatorAttachment: 'platform',
    residentKey: 'preferred',
    userVerification: 'preferred',
  },
  timeout: 60_000,
  attestation: 'none',
});

const authenticationOptions = () => {
  const allowCredentialId = allowCredentialIdInput.value.trim();

  return {
    challenge: randomBytes(32),
    rpId: currentRpId(),
    allowCredentials: allowCredentialId
      ? [
          {
            id: fromBase64Url(allowCredentialId),
            type: 'public-key',
          },
        ]
      : undefined,
    userVerification: 'preferred',
  };
};

installShimButton.addEventListener('click', () => {
  installShim();
  setOutput({
    origin: currentOrigin(),
    rpId: currentRpId(),
    status: 'shim-installed',
  });
});

checkSupportButton.addEventListener('click', async () => {
  try {
    setStatus('Checking support');
    const result = await CapacitorPasskey.isSupported();
    setStatus(result.available ? 'Supported' : 'Unavailable');
    setOutput(result);
  } catch (error) {
    setStatus('Support failed');
    setOutput(`Error: ${error?.message ?? error}`);
  }
});

registerButton.addEventListener('click', async () => {
  try {
    installShim();
    setStatus('Creating passkey');

    const credential = await navigator.credentials.create({
      publicKey: registrationOptions(),
    });

    const json = credential?.toJSON ? credential.toJSON() : { id: credential?.id };
    if (json?.rawId) {
      allowCredentialIdInput.value = json.rawId;
    }

    setStatus('Passkey created');
    setOutput({
      flow: 'navigator.credentials.create',
      note: 'Use a backend-issued challenge for a real registration ceremony.',
      result: json,
    });
  } catch (error) {
    setStatus('Registration failed');
    setOutput(`Error: ${error?.message ?? error}`);
  }
});

authenticateButton.addEventListener('click', async () => {
  try {
    installShim();
    setStatus('Getting passkey');

    const credential = await navigator.credentials.get({
      publicKey: authenticationOptions(),
    });

    setStatus('Passkey returned');
    setOutput({
      flow: 'navigator.credentials.get',
      note: 'Android responses use the app-signature origin on the backend.',
      result: credential?.toJSON ? credential.toJSON() : { id: credential?.id },
    });
  } catch (error) {
    setStatus('Authentication failed');
    setOutput(`Error: ${error?.message ?? error}`);
  }
});

versionButton.addEventListener('click', async () => {
  try {
    setStatus('Reading version');
    const result = await CapacitorPasskey.getPluginVersion();
    setStatus('Version ready');
    setOutput(result);
  } catch (error) {
    setStatus('Version failed');
    setOutput(`Error: ${error?.message ?? error}`);
  }
});

setOutput({
  hint: 'Set your relying-party domain, install the shim, then try create/get.',
  previewChallenge: toBase64Url(randomBytes(16)),
});
