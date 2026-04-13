import AuthenticationServices
import Capacitor
import Foundation

private struct PasskeyRelyingParty: Decodable {
    let id: String?
    let name: String
}

private struct PasskeyUserEntity: Decodable {
    let id: String
    let name: String
    let displayName: String?
}

private struct PasskeyCredentialDescriptor: Decodable {
    let id: String
}

private struct PasskeyAuthenticatorSelection: Decodable {
    let userVerification: String?
}

private struct PasskeyRegistrationRequestJSON: Decodable {
    let challenge: String
    let relyingParty: PasskeyRelyingParty
    let user: PasskeyUserEntity
    let excludeCredentials: [PasskeyCredentialDescriptor]?
    let authenticatorSelection: PasskeyAuthenticatorSelection?
    let attestation: String?

    private enum CodingKeys: String, CodingKey {
        case attestation
        case authenticatorSelection
        case challenge
        case excludeCredentials
        case relyingParty = "rp"
        case user
    }
}

private struct PasskeyAssertionRequestJSON: Decodable {
    let challenge: String
    let rpId: String?
    let allowCredentials: [PasskeyCredentialDescriptor]?
    let userVerification: String?
}

private enum PasskeyOperation {
    case registration
    case assertion
}

private func userVerificationPreference(_ value: String?) -> ASAuthorizationPublicKeyCredentialUserVerificationPreference {
    switch value {
    case "required":
        return .required
    case "discouraged":
        return .discouraged
    default:
        return .preferred
    }
}

private func attestationPreference(_ value: String?) -> ASAuthorizationPublicKeyCredentialAttestationKind {
    switch value {
    case "direct":
        return .direct
    case "enterprise":
        return .enterprise
    case "indirect":
        return .indirect
    default:
        return .none
    }
}

private func normalizedOrigin(_ explicitOrigin: String?, rpId: String?) -> String? {
    if let explicitOrigin, !explicitOrigin.isEmpty {
        return explicitOrigin
    }

    if let rpId, !rpId.isEmpty {
        return "https://\(rpId)"
    }

    return nil
}

private func derivedRPID(from origin: String?) -> String? {
    guard let origin, let host = URL(string: origin)?.host, !host.isEmpty else {
        return nil
    }

    return host
}

private func normalizeConfiguredDomains(_ values: [String], origin: String?) -> [String] {
    var domains = values.compactMap { normalizeDomain($0) }

    if let originDomain = normalizeDomain(origin), !domains.contains(originDomain) {
        domains.append(originDomain)
    }

    return domains
}

private func normalizeDomain(_ value: String?) -> String? {
    guard let value, !value.isEmpty else {
        return nil
    }

    if let host = URL(string: value)?.host, !host.isEmpty {
        return host
    }

    return value
}

@objc(CapacitorPasskeyPlugin)
public class CapacitorPasskeyPlugin: CAPPlugin,
    CAPBridgedPlugin,
    ASAuthorizationControllerDelegate,
    ASAuthorizationControllerPresentationContextProviding {
    public let identifier = "CapacitorPasskeyPlugin"
    public let jsName = "CapacitorPasskey"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "createCredential", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getCredential", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getConfiguration", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "isSupported", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getPluginVersion", returnType: CAPPluginReturnPromise)
    ]

    private let implementation = CapacitorPasskey()
    private var pendingCall: CAPPluginCall?
    private var pendingOperation: PasskeyOperation?

    @objc func createCredential(_ call: CAPPluginCall) {
        guard pendingCall == nil else {
            reject(call, name: "InvalidStateError", message: "Another passkey request is already in progress.")
            return
        }

        do {
            let requestJson = try requestJSON(from: call)
            let registrationRequest = try JSONDecoder().decode(PasskeyRegistrationRequestJSON.self, from: requestJson)
            let origin = normalizedOrigin(call.getString("origin"), rpId: registrationRequest.relyingParty.id)
            let authorizationRequest = try buildRegistrationRequest(from: registrationRequest, origin: origin)
            performAuthorization(call: call, request: authorizationRequest, operation: .registration)
        } catch let error as PasskeyPluginError {
            reject(call, error: error)
        } catch {
            reject(call, name: "UnknownError", message: error.localizedDescription, error: error)
        }
    }

    @objc func getCredential(_ call: CAPPluginCall) {
        guard pendingCall == nil else {
            reject(call, name: "InvalidStateError", message: "Another passkey request is already in progress.")
            return
        }

        do {
            let requestJson = try requestJSON(from: call)
            let assertionRequest = try JSONDecoder().decode(PasskeyAssertionRequestJSON.self, from: requestJson)
            let origin = normalizedOrigin(call.getString("origin"), rpId: assertionRequest.rpId)
            let authorizationRequest = try buildAssertionRequest(from: assertionRequest, origin: origin)
            performAuthorization(call: call, request: authorizationRequest, operation: .assertion)
        } catch let error as PasskeyPluginError {
            reject(call, error: error)
        } catch {
            reject(call, name: "UnknownError", message: error.localizedDescription, error: error)
        }
    }

    @objc func isSupported(_ call: CAPPluginCall) {
        call.resolve([
            "available": true,
            "conditionalMediation": false,
            "platform": "ios"
        ])
    }

    @objc func getConfiguration(_ call: CAPPluginCall) {
        let config = getConfig()
        let origin = normalizedOrigin(config.getString("origin"), rpId: nil)
        let configuredDomains = (config.getArray("domains") as? [String]) ?? []

        call.resolve([
            "autoShim": config.getBoolean("autoShim", true),
            "domains": normalizeConfiguredDomains(configuredDomains, origin: origin),
            "origin": origin ?? NSNull(),
            "platform": "ios"
        ])
    }

    @objc func getPluginVersion(_ call: CAPPluginCall) {
        call.resolve([
            "version": implementation.getPluginVersion()
        ])
    }

    public func authorizationController(controller: ASAuthorizationController, didCompleteWithAuthorization authorization: ASAuthorization) {
        guard let call = pendingCall, let operation = pendingOperation else {
            clearPendingRequest()
            return
        }

        switch operation {
        case .registration:
            guard let credential = authorization.credential as? ASAuthorizationPlatformPublicKeyCredentialRegistration else {
                clearPendingRequest()
                reject(call, name: "UnknownError", message: "Unexpected registration credential type.")
                return
            }

            clearPendingRequest()
            call.resolve(serializeRegistration(credential))
        case .assertion:
            guard let credential = authorization.credential as? ASAuthorizationPlatformPublicKeyCredentialAssertion else {
                clearPendingRequest()
                reject(call, name: "UnknownError", message: "Unexpected assertion credential type.")
                return
            }

            clearPendingRequest()
            call.resolve(serializeAssertion(credential))
        }
    }

    public func authorizationController(controller: ASAuthorizationController, didCompleteWithError error: Error) {
        guard let call = pendingCall else {
            clearPendingRequest()
            return
        }

        clearPendingRequest()
        if let authorizationError = error as? ASAuthorizationError {
            switch authorizationError.code {
            case .canceled, .failed, .notHandled:
                reject(call, name: "NotAllowedError", message: authorizationError.localizedDescription, error: error)
            case .matchedExcludedCredential:
                reject(call, name: "InvalidStateError", message: authorizationError.localizedDescription, error: error)
            default:
                reject(call, name: "UnknownError", message: authorizationError.localizedDescription, error: error)
            }
            return
        }

        reject(call, name: "UnknownError", message: error.localizedDescription, error: error)
    }

    public func presentationAnchor(for controller: ASAuthorizationController) -> ASPresentationAnchor {
        bridge?.viewController?.view.window ?? ASPresentationAnchor()
    }

    private func performAuthorization(call: CAPPluginCall, request: ASAuthorizationRequest, operation: PasskeyOperation) {
        pendingCall = call
        pendingOperation = operation

        DispatchQueue.main.async {
            let controller = ASAuthorizationController(authorizationRequests: [request])
            controller.delegate = self
            controller.presentationContextProvider = self
            controller.performRequests()
        }
    }

    private func buildRegistrationRequest(
        from request: PasskeyRegistrationRequestJSON,
        origin: String?
    ) throws -> ASAuthorizationPlatformPublicKeyCredentialRegistrationRequest {
        guard let rpId = request.relyingParty.id ?? derivedRPID(from: origin) else {
            throw PasskeyPluginError(name: "DataError", message: "A relying party id or HTTPS origin is required.")
        }

        let challenge = try CapacitorPasskey.decodeBase64URL(request.challenge)
        let userID = try CapacitorPasskey.decodeBase64URL(request.user.id)
        let provider = ASAuthorizationPlatformPublicKeyCredentialProvider(relyingPartyIdentifier: rpId)

        let credentialRequest: ASAuthorizationPlatformPublicKeyCredentialRegistrationRequest
        if #available(iOS 17.4, *), let origin {
            let clientData = ASPublicKeyCredentialClientData(challenge: challenge, origin: origin)
            credentialRequest = provider.createCredentialRegistrationRequest(clientData: clientData, name: request.user.name, userID: userID)
            if let excludedCredentials = request.excludeCredentials, !excludedCredentials.isEmpty {
                credentialRequest.excludedCredentials = try excludedCredentials.map {
                    ASAuthorizationPlatformPublicKeyCredentialDescriptor(credentialID: try CapacitorPasskey.decodeBase64URL($0.id))
                }
            }
        } else {
            credentialRequest = provider.createCredentialRegistrationRequest(challenge: challenge, name: request.user.name, userID: userID)
        }

        credentialRequest.displayName = request.user.displayName
        credentialRequest.userVerificationPreference = userVerificationPreference(request.authenticatorSelection?.userVerification)
        credentialRequest.attestationPreference = attestationPreference(request.attestation)

        return credentialRequest
    }

    private func buildAssertionRequest(
        from request: PasskeyAssertionRequestJSON,
        origin: String?
    ) throws -> ASAuthorizationPlatformPublicKeyCredentialAssertionRequest {
        guard let rpId = request.rpId ?? derivedRPID(from: origin) else {
            throw PasskeyPluginError(name: "DataError", message: "A relying party id or HTTPS origin is required.")
        }

        let challenge = try CapacitorPasskey.decodeBase64URL(request.challenge)
        let provider = ASAuthorizationPlatformPublicKeyCredentialProvider(relyingPartyIdentifier: rpId)

        let credentialRequest: ASAuthorizationPlatformPublicKeyCredentialAssertionRequest
        if #available(iOS 17.4, *), let origin {
            let clientData = ASPublicKeyCredentialClientData(challenge: challenge, origin: origin)
            credentialRequest = provider.createCredentialAssertionRequest(clientData: clientData)
        } else {
            credentialRequest = provider.createCredentialAssertionRequest(challenge: challenge)
        }

        credentialRequest.userVerificationPreference = userVerificationPreference(request.userVerification)
        if let allowedCredentials = request.allowCredentials, !allowedCredentials.isEmpty {
            credentialRequest.allowedCredentials = try allowedCredentials.map {
                ASAuthorizationPlatformPublicKeyCredentialDescriptor(credentialID: try CapacitorPasskey.decodeBase64URL($0.id))
            }
        }

        return credentialRequest
    }

    private func requestJSON(from call: CAPPluginCall) throws -> Data {
        guard let requestJson = call.getString("requestJson"), !requestJson.isEmpty else {
            throw PasskeyPluginError(name: "DataError", message: "requestJson is required.")
        }

        guard let data = requestJson.data(using: .utf8) else {
            throw PasskeyPluginError(name: "DataError", message: "requestJson must be valid UTF-8.")
        }

        return data
    }

    private func serializeRegistration(_ credential: ASAuthorizationPlatformPublicKeyCredentialRegistration) -> JSObject {
        [
            "id": CapacitorPasskey.encodeBase64URL(credential.credentialID),
            "rawId": CapacitorPasskey.encodeBase64URL(credential.credentialID),
            "type": "public-key",
            "authenticatorAttachment": "platform",
            "clientExtensionResults": JSObject(),
            "response": [
                "clientDataJSON": CapacitorPasskey.encodeBase64URL(credential.rawClientDataJSON),
                "attestationObject": CapacitorPasskey.encodeBase64URL(credential.rawAttestationObject ?? Data())
            ]
        ]
    }

    private func serializeAssertion(_ credential: ASAuthorizationPlatformPublicKeyCredentialAssertion) -> JSObject {
        let response: JSObject = [
            "clientDataJSON": CapacitorPasskey.encodeBase64URL(credential.rawClientDataJSON),
            "authenticatorData": CapacitorPasskey.encodeBase64URL(credential.rawAuthenticatorData),
            "signature": CapacitorPasskey.encodeBase64URL(credential.signature),
            "userHandle": credential.userID.isEmpty ? NSNull() : CapacitorPasskey.encodeBase64URL(credential.userID)
        ]

        return [
            "id": CapacitorPasskey.encodeBase64URL(credential.credentialID),
            "rawId": CapacitorPasskey.encodeBase64URL(credential.credentialID),
            "type": "public-key",
            "authenticatorAttachment": "platform",
            "clientExtensionResults": JSObject(),
            "response": response
        ]
    }

    private func clearPendingRequest() {
        pendingCall = nil
        pendingOperation = nil
    }

    private func reject(_ call: CAPPluginCall, error: PasskeyPluginError) {
        reject(call, name: error.name, message: error.message)
    }

    private func reject(_ call: CAPPluginCall, name: String, message: String, error: Error? = nil) {
        let data: JSObject = ["name": name]
        call.reject(message, name, error, data)
    }
}
