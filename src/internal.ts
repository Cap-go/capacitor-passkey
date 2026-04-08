import type {
  PasskeyAuthenticationCredential,
  PasskeyRegistrationCredential,
  PasskeySupportResult,
} from './definitions';

export interface NativePasskeyRequest {
  requestJson: string;
  origin?: string;
}

export interface NativeCapacitorPasskeyPlugin {
  createCredential(options: NativePasskeyRequest): Promise<PasskeyRegistrationCredential>;
  getCredential(options: NativePasskeyRequest): Promise<PasskeyAuthenticationCredential>;
  isSupported(): Promise<PasskeySupportResult>;
  getPluginVersion(): Promise<{ version: string }>;
}
