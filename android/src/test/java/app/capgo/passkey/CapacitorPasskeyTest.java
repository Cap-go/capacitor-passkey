package app.capgo.passkey;

import static org.junit.Assert.assertEquals;

import androidx.credentials.exceptions.CreateCredentialCancellationException;
import androidx.credentials.exceptions.CreateCredentialUnknownException;
import androidx.credentials.exceptions.GetCredentialCancellationException;
import androidx.credentials.exceptions.GetCredentialUnknownException;
import androidx.credentials.exceptions.NoCredentialException;
import org.junit.Test;

public class CapacitorPasskeyTest {

    @Test
    public void errorNameForCreateException_mapsCancellationToNotAllowedError() {
        assertEquals(
            "NotAllowedError",
            CapacitorPasskey.errorNameForCreateException(new CreateCredentialCancellationException("User cancelled the selector"))
        );
    }

    @Test
    public void errorNameForCreateException_mapsUnknownFailuresToUnknownError() {
        assertEquals("UnknownError", CapacitorPasskey.errorNameForCreateException(new CreateCredentialUnknownException("failed")));
    }

    @Test
    public void errorNameForGetException_mapsCancellationToNotAllowedError() {
        assertEquals(
            "NotAllowedError",
            CapacitorPasskey.errorNameForGetException(new GetCredentialCancellationException("User cancelled the selector"))
        );
    }

    @Test
    public void errorNameForGetException_mapsNoCredentialToNotFoundError() {
        assertEquals("NotFoundError", CapacitorPasskey.errorNameForGetException(new NoCredentialException("No credentials")));
    }

    @Test
    public void errorMessageForGetException_usesEstablishedMessageForNoCredential() {
        assertEquals(
            "No matching passkey was found.",
            CapacitorPasskey.errorMessageForGetException(new NoCredentialException("native credential message"))
        );
    }

    @Test
    public void errorMessageForGetException_usesFallbackWhenCancellationMessageIsEmpty() {
        assertEquals(
            "Passkey authentication was cancelled.",
            CapacitorPasskey.errorMessageForGetException(new GetCredentialCancellationException(""))
        );
    }

    @Test
    public void errorMessageForCreateException_usesFallbackWhenCancellationMessageIsEmpty() {
        assertEquals(
            "Passkey registration was cancelled.",
            CapacitorPasskey.errorMessageForCreateException(new CreateCredentialCancellationException(""))
        );
    }

    @Test
    public void errorNameForGetException_mapsUnknownFailuresToUnknownError() {
        assertEquals("UnknownError", CapacitorPasskey.errorNameForGetException(new GetCredentialUnknownException("failed")));
    }
}
