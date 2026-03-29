import Foundation
import Combine

/// 配置管理器：读写 profiles.json 和 settings.json
///
/// 作为 ObservableObject 供 SwiftUI 视图绑定
@MainActor
final class ProfileManager: ObservableObject {

    // MARK: - Published 状态

    @Published var config: CCFGConfig = CCFGConfig(activeProfile: "", profiles: [], presets: DefaultPresets.all)
    @Published var errorMessage: String?

    /// 当前是否为 Anthropic 官方默认配置
    var isDefault: Bool { config.activeProfile.isEmpty }

    /// 当前激活的 Profile
    var activeProfile: Profile? {
        config.profiles.first { $0.id == config.activeProfile }
    }

    // MARK: - 路径

    private let ccfgDir: URL
    private let profilesPath: URL
    private let claudeDir: URL
    private let settingsPath: URL

    // MARK: - 文件监听

    private var fileWatcher: FileWatcher?

    // MARK: - Init

    init() {
        let home = FileManager.default.homeDirectoryForCurrentUser
        self.ccfgDir = home.appendingPathComponent(".ccfg")
        self.profilesPath = ccfgDir.appendingPathComponent("profiles.json")
        self.claudeDir = home.appendingPathComponent(".claude")
        self.settingsPath = claudeDir.appendingPathComponent("settings.json")

        loadConfig()
        startWatching()
    }

    // MARK: - 配置读写

    /// 加载 profiles.json
    func loadConfig() {
        do {
            try ensureDirectory(ccfgDir)

            if FileManager.default.fileExists(atPath: profilesPath.path) {
                let data = try Data(contentsOf: profilesPath)
                config = try JSONDecoder().decode(CCFGConfig.self, from: data)
            } else {
                // 首次运行，创建默认配置
                config = CCFGConfig(activeProfile: "", profiles: [], presets: DefaultPresets.all)
                try saveConfig()
            }
            errorMessage = nil
        } catch {
            errorMessage = "加载配置失败: \(error.localizedDescription)"
        }
    }

    /// 保存 profiles.json
    func saveConfig() throws {
        try ensureDirectory(ccfgDir)
        let encoder = JSONEncoder()
        encoder.outputFormatting = [.prettyPrinted, .sortedKeys]
        let data = try encoder.encode(config)
        try data.write(to: profilesPath, options: .atomic)
    }

    // MARK: - settings.json 操作

    /// 读取 Claude settings.json
    private func loadSettings() throws -> ClaudeSettings {
        guard FileManager.default.fileExists(atPath: settingsPath.path) else {
            return ClaudeSettings(raw: [:])
        }
        let data = try Data(contentsOf: settingsPath)
        return try ClaudeSettings.load(from: data)
    }

    /// 写入 Claude settings.json
    private func saveSettings(_ settings: ClaudeSettings) throws {
        try ensureDirectory(claudeDir)
        let data = try settings.toData()
        try data.write(to: settingsPath, options: .atomic)
    }

    // MARK: - 切换逻辑

    /// 切换到指定 Profile
    func switchTo(_ profileId: String) {
        do {
            guard let profile = config.profiles.first(where: { $0.id == profileId }) else {
                throw CCFGError.profileNotFound(profileId)
            }

            // 构建 env
            var env: [String: String] = [
                "ANTHROPIC_AUTH_TOKEN": profile.env.anthropicAuthToken,
                "ANTHROPIC_BASE_URL": profile.env.anthropicBaseURL,
                "ANTHROPIC_MODEL": profile.env.anthropicModel,
            ]
            if let optional = profile.optionalEnv {
                for (key, value) in optional where !value.isEmpty {
                    env[key] = value
                }
            }

            // 修改 settings.json（只改 env）
            var settings = try loadSettings()
            settings.env = env
            try saveSettings(settings)

            // 更新 activeProfile
            config.activeProfile = profileId
            try saveConfig()
            errorMessage = nil
        } catch {
            errorMessage = "切换失败: \(error.localizedDescription)"
        }
    }

    /// 切换回 Anthropic 官方默认（清除 env）
    func resetToDefault() {
        do {
            var settings = try loadSettings()
            settings.env = nil
            try saveSettings(settings)

            config.activeProfile = ""
            try saveConfig()
            errorMessage = nil
        } catch {
            errorMessage = "重置失败: \(error.localizedDescription)"
        }
    }

    // MARK: - Profile CRUD

    /// 添加 Profile
    func addProfile(_ profile: Profile) throws {
        guard !config.profiles.contains(where: { $0.id == profile.id }) else {
            throw CCFGError.profileAlreadyExists(profile.id)
        }
        config.profiles.append(profile)
        try saveConfig()
    }

    /// 更新 Profile
    func updateProfile(_ profile: Profile) throws {
        guard let idx = config.profiles.firstIndex(where: { $0.id == profile.id }) else {
            throw CCFGError.profileNotFound(profile.id)
        }
        config.profiles[idx] = profile

        // 如果更新的是当前激活 Profile，同步到 settings.json
        if config.activeProfile == profile.id {
            switchTo(profile.id)
        }

        try saveConfig()
    }

    /// 删除 Profile
    func removeProfile(_ id: String) throws {
        guard let idx = config.profiles.firstIndex(where: { $0.id == id }) else {
            throw CCFGError.profileNotFound(id)
        }
        config.profiles.remove(at: idx)

        if config.activeProfile == id {
            config.activeProfile = ""
        }

        try saveConfig()
    }

    // MARK: - 文件监听

    /// 监听 profiles.json 变化（CLI 切换时自动刷新）
    private func startWatching() {
        fileWatcher = FileWatcher(path: profilesPath.path) { [weak self] in
            Task { @MainActor in
                self?.loadConfig()
            }
        }
        fileWatcher?.start()
    }

    // MARK: - 工具

    private func ensureDirectory(_ url: URL) throws {
        if !FileManager.default.fileExists(atPath: url.path) {
            try FileManager.default.createDirectory(at: url, withIntermediateDirectories: true)
        }
    }
}
