import type {
  PasskeyAuthenticationCredential,
  PasskeyRuntimeConfiguration,
  PasskeyRegistrationCredential,
  PasskeySupportResult,
} from './definitions.js';

export interface NativePasskeyRequest {
  requestJson: string;
  origin?: string;
}

export interface NativeCapacitorPasskeyPlugin {
  createCredential(options: NativePasskeyRequest): Promise<PasskeyRegistrationCredential>;
  getCredential(options: NativePasskeyRequest): Promise<PasskeyAuthenticationCredential>;
  getConfiguration(): Promise<PasskeyRuntimeConfiguration>;
  isSupported(): Promise<PasskeySupportResult>;
  getPluginVersion(): Promise<{ version: string }>;
}
