package app.capgo.passkey;

import androidx.credentials.webauthn.PublicKeyCredentialCreationOptions;
import androidx.credentials.webauthn.PublicKeyCredentialRequestOptions;

public class CapacitorPasskey {

    public static final String PLUGIN_VERSION = "8.0.0";

    public String getPluginVersion() {
        return PLUGIN_VERSION;
    }

    public void validateCreationRequestJson(String requestJson) {
        new PublicKeyCredentialCreationOptions(requestJson);
    }

    public void validateAssertionRequestJson(String requestJson) {
        new PublicKeyCredentialRequestOptions(requestJson);
    }
}
