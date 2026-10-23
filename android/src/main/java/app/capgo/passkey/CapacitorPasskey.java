package app.capgo.passkey;

import androidx.credentials.exceptions.CreateCredentialCancellationException;
import androidx.credentials.exceptions.CreateCredentialException;
import androidx.credentials.exceptions.GetCredentialCancellationException;
import androidx.credentials.exceptions.GetCredentialException;
import androidx.credentials.exceptions.NoCredentialException;
import androidx.credentials.exceptions.publickeycredential.CreatePublicKeyCredentialDomException;
import androidx.credentials.exceptions.publickeycredential.GetPublicKeyCredentialDomException;
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

    public static String errorNameForCreateException(CreateCredentialException exception) {
        if (exception instanceof CreatePublicKeyCredentialDomException) {
            return ((CreatePublicKeyCredentialDomException) exception).getDomError().getClass().getSimpleName();
        }

        if (exception instanceof CreateCredentialCancellationException) {
            return "NotAllowedError";
        }

        return "UnknownError";
    }

    public static String errorNameForGetException(GetCredentialException exception) {
        if (exception instanceof GetPublicKeyCredentialDomException) {
            return ((GetPublicKeyCredentialDomException) exception).getDomError().getClass().getSimpleName();
        }

        if (exception instanceof NoCredentialException) {
            return "NotFoundError";
        }

        if (exception instanceof GetCredentialCancellationException) {
            return "NotAllowedError";
        }

        return "UnknownError";
    }
}
