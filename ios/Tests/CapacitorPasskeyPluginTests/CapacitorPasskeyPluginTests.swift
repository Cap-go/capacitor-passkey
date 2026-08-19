import AuthenticationServices
import XCTest
@testable import CapacitorPasskeyPlugin

class CapacitorPasskeyPluginTests: XCTestCase {
    func testGetPluginVersion() {
        let implementation = CapacitorPasskey()
        XCTAssertEqual("8.0.0", implementation.getPluginVersion())
    }

    func testBase64URLRoundTrip() throws {
        let input = Data("capgo-passkey".utf8)
        let encoded = CapacitorPasskey.encodeBase64URL(input)
        let decoded = try CapacitorPasskey.decodeBase64URL(encoded)

        XCTAssertEqual(input, decoded)
    }

    func testErrorNameMatrix() {
        let cases: [(ASAuthorizationError.Code, String)] = [
            (.canceled, "NotAllowedError"),
            (.failed, "NotAllowedError"),
            (.notHandled, "NotAllowedError"),
        ]

        for (code, expected) in cases {
            XCTAssertEqual(
                CapacitorPasskey.errorName(for: code),
                expected,
                "ASAuthorizationError.Code rawValue \(code.rawValue)"
            )
        }

        if #available(iOS 18.0, *) {
            XCTAssertEqual(
                CapacitorPasskey.errorName(for: .matchedExcludedCredential),
                "InvalidStateError"
            )
        }
    }

    func testNativeErrorDetailsMatrix() throws {
        let associationFailure = NSError(
            domain: ASAuthorizationError.errorDomain,
            code: ASAuthorizationError.Code.failed.rawValue,
            userInfo: [NSLocalizedFailureReasonErrorKey: "Unable to verify webcredentials association"]
        )
        let associationDetails = try XCTUnwrap(CapacitorPasskey.nativeErrorDetails(from: associationFailure))
        XCTAssertEqual(associationDetails["code"] as? Int, 1004)
        XCTAssertEqual(associationDetails["platform"] as? String, "ios")
        XCTAssertEqual(associationDetails["domain"] as? String, ASAuthorizationError.errorDomain)
        XCTAssertEqual(
            associationDetails["failureReason"] as? String,
            "Unable to verify webcredentials association"
        )

        let canceled = NSError(
            domain: ASAuthorizationError.errorDomain,
            code: ASAuthorizationError.Code.canceled.rawValue,
            userInfo: [:]
        )
        let canceledDetails = try XCTUnwrap(CapacitorPasskey.nativeErrorDetails(from: canceled))
        XCTAssertEqual(canceledDetails["code"] as? Int, 1001)
        XCTAssertEqual(canceledDetails["platform"] as? String, "ios")
        XCTAssertNil(canceledDetails["failureReason"])

        let unrelated = NSError(domain: NSURLErrorDomain, code: NSURLErrorTimedOut, userInfo: nil)
        XCTAssertNil(CapacitorPasskey.nativeErrorDetails(from: unrelated))
    }
}
