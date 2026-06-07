import type { CapacitorConfig } from '@capacitor/cli';

import pkg from './package.json';

const config: CapacitorConfig = {
  "appId": "app.capgo.passkey.example",
  "appName": "Capgo Passkey Demo",
  "webDir": "dist",
  "plugins": {
    "CapacitorPasskey": {
      "origin": "https://signin.example.com",
      "autoShim": true
    },
    "SplashScreen": {
      "launchAutoHide": false
    },
    "CapacitorUpdater": {
      "appId": "app.capgo.passkey.example",
      "autoUpdate": true,
      "autoSplashscreen": true,
      "directUpdate": "always",
      "defaultChannel": "production",
      "version": pkg.version
    }
  }
};

export default config;
