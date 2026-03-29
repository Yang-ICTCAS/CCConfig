import Foundation

// MARK: - Profile 环境变量（必填）

struct ProfileEnv: Codable, Equatable {
    var anthropicAuthToken: String
    var anthropicBaseURL: String
    var anthropicModel: String

    enum CodingKeys: String, CodingKey {
        case anthropicAuthToken = "ANTHROPIC_AUTH_TOKEN"
        case anthropicBaseURL = "ANTHROPIC_BASE_URL"
        case anthropicModel = "ANTHROPIC_MODEL"
    }
}

// MARK: - 单个 Profile

struct Profile: Codable, Identifiable, Equatable {
    let id: String
    var name: String
    var provider: String
    var env: ProfileEnv
    var optionalEnv: [String: String]?
    var permissions: [String]?
    var notes: String?
    var createdAt: String

    /// 掩码显示 API Key
    var maskedApiKey: String {
        let key = env.anthropicAuthToken
        if key.count <= 12 { return "****" }
        return "\(key.prefix(6))...\(key.suffix(4))"
    }
}

// MARK: - 预置提供商

struct Preset: Codable {
    let baseUrl: String
}

// MARK: - 完整配置

struct CCFGConfig: Codable {
    var activeProfile: String
    var profiles: [Profile]
    var presets: [String: Preset]
}

// MARK: - Claude settings.json

/// 只关心 env 字段，其他保留
struct ClaudeSettings {
    var raw: [String: Any]

    var env: [String: String]? {
        get { raw["env"] as? [String: String] }
        set {
            if let val = newValue {
                raw["env"] = val
            } else {
                raw.removeValue(forKey: "env")
            }
        }
    }

    /// 从 JSON Data 解析
    static func load(from data: Data) throws -> ClaudeSettings {
        guard let dict = try JSONSerialization.jsonObject(with: data) as? [String: Any] else {
            throw CCFGError.invalidJSON
        }
        return ClaudeSettings(raw: dict)
    }

    /// 序列化为 JSON Data（保留所有字段）
    func toData() throws -> Data {
        return try JSONSerialization.data(withJSONObject: raw, options: [.prettyPrinted, .sortedKeys])
    }
}

// MARK: - 默认预置

enum DefaultPresets {
    static let all: [String: Preset] = [
        "anthropic": Preset(baseUrl: "https://api.anthropic.com"),
        "dashscope": Preset(baseUrl: "https://coding.dashscope.aliyuncs.com/apps/anthropic"),
        "ark":       Preset(baseUrl: "https://ark.cn-beijing.volces.com/api/coding"),
        "custom":    Preset(baseUrl: ""),
    ]
}

// MARK: - 错误类型

enum CCFGError: LocalizedError {
    case profileNotFound(String)
    case profileAlreadyExists(String)
    case invalidJSON
    case fileNotFound(String)

    var errorDescription: String? {
        switch self {
        case .profileNotFound(let id):     return "Profile \"\(id)\" 不存在"
        case .profileAlreadyExists(let id): return "Profile \"\(id)\" 已存在"
        case .invalidJSON:                  return "JSON 格式无效"
        case .fileNotFound(let path):       return "文件不存在: \(path)"
        }
    }
}
