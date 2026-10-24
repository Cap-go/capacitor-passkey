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

    public static String errorMessageForGetException(GetCredentialException exception) {
        String name = errorNameForGetException(exception);
        String fallback;
        if (exception instanceof GetCredentialCancellationException) {
            fallback = "Passkey authentication was cancelled.";
        } else if ("NotFoundError".equals(name)) {
            fallback = "No matching passkey was found.";
        } else {
            fallback = "Passkey authentication failed.";
        }
        if ("NotFoundError".equals(name)) {
            return fallback;
        }
        return credentialErrorMessage(exception.getErrorMessage(), fallback);
    }

    public static String errorMessageForCreateException(CreateCredentialException exception) {
        String fallback =
            exception instanceof CreateCredentialCancellationException
                ? "Passkey registration was cancelled."
                : "Passkey registration failed.";
        return credentialErrorMessage(exception.getErrorMessage(), fallback);
    }

    static String credentialErrorMessage(CharSequence message, String fallback) {
        if (message == null || message.toString().isBlank()) {
            return fallback;
        }
        return message.toString();
    }
}
