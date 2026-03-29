import SwiftUI

/// CCConfig 状态栏应用入口
///
/// 使用 MenuBarExtra 在 macOS 状态栏显示配置切换菜单。
/// 应用不显示 Dock 图标（通过 Info.plist 的 LSUIElement 控制）。
@main
struct CCConfigApp: App {
    @StateObject private var manager = ProfileManager()

    var body: some Scene {
        // 状态栏菜单
        MenuBarExtra {
            MenuBarView()
                .environmentObject(manager)
        } label: {
            menuBarLabel
        }
        .menuBarExtraStyle(.window)

        // 独立配置管理窗口（通过 openWindow(id:) 打开）
        Window("CCConfig 配置管理", id: "settings") {
            SettingsView()
                .environmentObject(manager)
                .frame(minWidth: 560, minHeight: 420)
        }
        .windowResizability(.contentSize)
    }

    /// 状态栏图标和文字
    private var menuBarLabel: some View {
        HStack(spacing: 4) {
            Image(systemName: "bolt.fill")
            if let profile = manager.activeProfile {
                Text(profile.name)
                    .font(.system(.caption2))
            } else {
                Text("Default")
                    .font(.system(.caption2))
            }
        }
    }
}
