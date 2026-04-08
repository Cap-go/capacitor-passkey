import Foundation

@objc public class CapacitorPasskey: NSObject {
    @objc public func getPluginVersion() -> String {
        Self.pluginVersion
    }

    static let pluginVersion = "8.0.0"

    static func encodeBase64URL(_ data: Data) -> String {
        data
            .base64EncodedString()
            .replacingOccurrences(of: "+", with: "-")
            .replacingOccurrences(of: "/", with: "_")
            .replacingOccurrences(of: "=", with: "")
    }

    static func decodeBase64URL(_ value: String) throws -> Data {
        var normalized = value
            .replacingOccurrences(of: "-", with: "+")
            .replacingOccurrences(of: "_", with: "/")

        let remainder = normalized.count % 4
        if remainder > 0 {
            normalized += String(repeating: "=", count: 4 - remainder)
        }

        guard let data = Data(base64Encoded: normalized) else {
            throw PasskeyPluginError(name: "DataError", message: "Invalid base64url value.")
        }

        return data
    }
}

struct PasskeyPluginError: Error {
    let name: String
    let message: String
}
