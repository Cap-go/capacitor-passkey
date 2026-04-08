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
}
