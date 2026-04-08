// swift-tools-version: 5.9
import PackageDescription

let package = Package(
    name: "CapgoCapacitorPasskey",
    platforms: [.iOS(.v15)],
    products: [
        .library(
            name: "CapgoCapacitorPasskey",
            targets: ["CapacitorPasskeyPlugin"])
    ],
    dependencies: [
        .package(url: "https://github.com/ionic-team/capacitor-swift-pm.git", from: "8.0.0")
    ],
    targets: [
        .target(
            name: "CapacitorPasskeyPlugin",
            dependencies: [
                .product(name: "Capacitor", package: "capacitor-swift-pm"),
                .product(name: "Cordova", package: "capacitor-swift-pm")
            ],
            path: "ios/Sources/CapacitorPasskeyPlugin"),
        .testTarget(
            name: "CapacitorPasskeyPluginTests",
            dependencies: ["CapacitorPasskeyPlugin"],
            path: "ios/Tests/CapacitorPasskeyPluginTests")
    ]
)
