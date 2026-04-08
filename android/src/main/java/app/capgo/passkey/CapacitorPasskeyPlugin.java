package app.capgo.passkey;

import android.app.Activity;
import android.os.Build;
import androidx.core.content.ContextCompat;
import androidx.credentials.CreateCredentialResponse;
import androidx.credentials.CreatePublicKeyCredentialRequest;
import androidx.credentials.CreatePublicKeyCredentialResponse;
import androidx.credentials.Credential;
import androidx.credentials.CredentialManager;
import androidx.credentials.CredentialManagerCallback;
import androidx.credentials.GetCredentialRequest;
import androidx.credentials.GetCredentialResponse;
import androidx.credentials.GetPublicKeyCredentialOption;
import androidx.credentials.PublicKeyCredential;
import androidx.credentials.exceptions.CreateCredentialException;
import androidx.credentials.exceptions.GetCredentialException;
import androidx.credentials.exceptions.NoCredentialException;
import androidx.credentials.exceptions.domerrors.DomError;
import androidx.credentials.exceptions.publickeycredential.CreatePublicKeyCredentialDomException;
import androidx.credentials.exceptions.publickeycredential.GetPublicKeyCredentialDomException;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.util.List;
import org.json.JSONException;
import org.json.JSONObject;

@CapacitorPlugin(name = "CapacitorPasskey")
public class CapacitorPasskeyPlugin extends Plugin {

    private final CapacitorPasskey implementation = new CapacitorPasskey();
    private CredentialManager credentialManager;

    @Override
    public void load() {
        super.load();
        try {
            credentialManager = CredentialManager.create(getContext());
        } catch (Exception exception) {
            credentialManager = null;
        }
    }

    @PluginMethod
    public void createCredential(final PluginCall call) {
        if (!isCredentialManagerAvailable(call)) {
            return;
        }

        final String requestJson = call.getString("requestJson");
        if (requestJson == null || requestJson.isBlank()) {
            rejectDom(call, "DataError", "requestJson is required.", null);
            return;
        }

        try {
            implementation.validateCreationRequestJson(requestJson);
        } catch (Exception exception) {
            rejectDom(call, "SyntaxError", "Invalid passkey registration request JSON.", exception);
            return;
        }

        final CreatePublicKeyCredentialRequest request;
        try {
            request = new CreatePublicKeyCredentialRequest(requestJson);
        } catch (Exception exception) {
            rejectDom(call, "SyntaxError", "Could not create the native registration request.", exception);
            return;
        }

        bridge.executeOnMainThread(() -> {
            Activity activity = getActivity();
            if (activity == null) {
                rejectDom(call, "NotAllowedError", "Activity not available.", null);
                return;
            }

            credentialManager.createCredentialAsync(
                activity,
                request,
                null,
                ContextCompat.getMainExecutor(getContext()),
                new CredentialManagerCallback<CreateCredentialResponse, CreateCredentialException>() {
                    @Override
                    public void onResult(CreateCredentialResponse response) {
                        if (!(response instanceof CreatePublicKeyCredentialResponse)) {
                            rejectDom(call, "UnknownError", "Unexpected native registration response.", null);
                            return;
                        }

                        resolveJson(call, ((CreatePublicKeyCredentialResponse) response).getRegistrationResponseJson());
                    }

                    @Override
                    public void onError(CreateCredentialException exception) {
                        rejectCreateException(call, exception);
                    }
                }
            );
        });
    }

    @PluginMethod
    public void getCredential(final PluginCall call) {
        if (!isCredentialManagerAvailable(call)) {
            return;
        }

        final String requestJson = call.getString("requestJson");
        if (requestJson == null || requestJson.isBlank()) {
            rejectDom(call, "DataError", "requestJson is required.", null);
            return;
        }

        try {
            implementation.validateAssertionRequestJson(requestJson);
        } catch (Exception exception) {
            rejectDom(call, "SyntaxError", "Invalid passkey authentication request JSON.", exception);
            return;
        }

        final GetCredentialRequest request;
        try {
            request = new GetCredentialRequest(List.of(new GetPublicKeyCredentialOption(requestJson)));
        } catch (Exception exception) {
            rejectDom(call, "SyntaxError", "Could not create the native authentication request.", exception);
            return;
        }

        bridge.executeOnMainThread(() -> {
            Activity activity = getActivity();
            if (activity == null) {
                rejectDom(call, "NotAllowedError", "Activity not available.", null);
                return;
            }

            credentialManager.getCredentialAsync(
                activity,
                request,
                null,
                ContextCompat.getMainExecutor(getContext()),
                new CredentialManagerCallback<GetCredentialResponse, GetCredentialException>() {
                    @Override
                    public void onResult(GetCredentialResponse response) {
                        Credential credential = response.getCredential();
                        if (!(credential instanceof PublicKeyCredential)) {
                            rejectDom(call, "UnknownError", "Unexpected native authentication response.", null);
                            return;
                        }

                        resolveJson(call, ((PublicKeyCredential) credential).getAuthenticationResponseJson());
                    }

                    @Override
                    public void onError(GetCredentialException exception) {
                        rejectGetException(call, exception);
                    }
                }
            );
        });
    }

    @PluginMethod
    public void isSupported(final PluginCall call) {
        JSObject result = new JSObject();
        result.put("available", credentialManager != null && Build.VERSION.SDK_INT >= Build.VERSION_CODES.P);
        result.put("conditionalMediation", false);
        result.put("platform", "android");
        call.resolve(result);
    }

    @PluginMethod
    public void getPluginVersion(final PluginCall call) {
        JSObject result = new JSObject();
        result.put("version", implementation.getPluginVersion());
        call.resolve(result);
    }

    private boolean isCredentialManagerAvailable(PluginCall call) {
        if (credentialManager == null) {
            rejectDom(call, "NotSupportedError", "Credential Manager is not available on this device.", null);
            return false;
        }

        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.P) {
            rejectDom(call, "NotSupportedError", "Passkeys require Android API level 28 or higher.", null);
            return false;
        }

        return true;
    }

    private void resolveJson(PluginCall call, String json) {
        try {
            call.resolve(JSObject.fromJSONObject(new JSONObject(json)));
        } catch (JSONException exception) {
            rejectDom(call, "UnknownError", "Native passkey response was not valid JSON.", exception);
        }
    }

    private void rejectCreateException(PluginCall call, CreateCredentialException exception) {
        if (exception instanceof CreatePublicKeyCredentialDomException) {
            DomError domError = ((CreatePublicKeyCredentialDomException) exception).getDomError();
            rejectDom(call, domError.getClass().getSimpleName(), messageFor(exception, "Passkey registration failed."), exception);
            return;
        }

        rejectDom(call, "UnknownError", messageFor(exception, "Passkey registration failed."), exception);
    }

    private void rejectGetException(PluginCall call, GetCredentialException exception) {
        if (exception instanceof GetPublicKeyCredentialDomException) {
            DomError domError = ((GetPublicKeyCredentialDomException) exception).getDomError();
            rejectDom(call, domError.getClass().getSimpleName(), messageFor(exception, "Passkey authentication failed."), exception);
            return;
        }

        if (exception instanceof NoCredentialException) {
            rejectDom(call, "NotFoundError", "No matching passkey was found.", exception);
            return;
        }

        rejectDom(call, "UnknownError", messageFor(exception, "Passkey authentication failed."), exception);
    }

    private String messageFor(CreateCredentialException exception, String fallback) {
        CharSequence message = exception.getErrorMessage();
        return message != null ? message.toString() : fallback;
    }

    private String messageFor(GetCredentialException exception, String fallback) {
        CharSequence message = exception.getErrorMessage();
        return message != null ? message.toString() : fallback;
    }

    private void rejectDom(PluginCall call, String name, String message, Exception exception) {
        JSObject data = new JSObject();
        data.put("name", name);
        call.reject(message, name, exception, data);
    }
}
