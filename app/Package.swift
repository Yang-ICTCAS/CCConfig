// swift-tools-version: 5.9
import PackageDescription

let package = Package(
    name: "CCConfig",
    platforms: [.macOS(.v13)],
    targets: [
        .executableTarget(
            name: "CCConfig",
            path: "Sources/CCConfig"
        ),
    ]
)
