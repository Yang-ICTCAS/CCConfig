import SwiftUI

/// Profile 管理面板（独立窗口）
struct SettingsView: View {
    @EnvironmentObject private var manager: ProfileManager

    @State private var showAddSheet = false
    @State private var editingProfile: Profile?
    @State private var profileToDelete: Profile?
    @State private var showDeleteConfirm = false

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                // ── Profile 列表 ──
                if manager.config.profiles.isEmpty {
                    emptyState
                } else {
                    profileList
                }

                Divider()

                // ── 底部工具栏 ──
                bottomBar
            }
            .navigationTitle("CCConfig 配置管理")
            .toolbar {
                ToolbarItem(placement: .primaryAction) {
                    Button {
                        showAddSheet = true
                    } label: {
                        Label("添加 Profile", systemImage: "plus")
                    }
                }
            }
        }
        .sheet(isPresented: $showAddSheet) {
            ProfileFormView(mode: .add)
                .environmentObject(manager)
        }
        .sheet(item: $editingProfile) { profile in
            ProfileFormView(mode: .edit(profile))
                .environmentObject(manager)
        }
        .alert("确认删除", isPresented: $showDeleteConfirm) {
            Button("取消", role: .cancel) {}
            Button("删除", role: .destructive) {
                if let profile = profileToDelete {
                    try? manager.removeProfile(profile.id)
                }
            }
        } message: {
            if let profile = profileToDelete {
                let activeWarning = manager.config.activeProfile == profile.id
                    ? "\n⚠️ 这是当前激活的 Profile"
                    : ""
                Text("确定删除 \"\(profile.name)\"？\(activeWarning)")
            }
        }
    }

    // MARK: - 空状态

    private var emptyState: some View {
        VStack(spacing: 12) {
            Spacer()
            Image(systemName: "tray")
                .font(.system(size: 40))
                .foregroundStyle(.secondary)
            Text("暂无自定义 Profile")
                .font(.title3)
                .foregroundStyle(.secondary)
            Text("点击下方「添加」按钮创建第一个 Profile")
                .font(.caption)
                .foregroundStyle(.tertiary)
            Spacer()
        }
        .frame(maxWidth: .infinity)
    }

    // MARK: - Profile 列表

    private var profileList: some View {
        List {
            ForEach(manager.config.profiles) { profile in
                ProfileListRow(
                    profile: profile,
                    isActive: profile.id == manager.config.activeProfile,
                    onEdit: { editingProfile = profile },
                    onDelete: {
                        profileToDelete = profile
                        showDeleteConfirm = true
                    }
                )
            }
        }
        .listStyle(.inset)
    }

    // MARK: - 底部工具栏

    private var bottomBar: some View {
        HStack {
            Button {
                showAddSheet = true
            } label: {
                Label("添加", systemImage: "plus")
            }

            Spacer()

            if let err = manager.errorMessage {
                Text(err)
                    .font(.caption)
                    .foregroundStyle(.red)
                    .lineLimit(1)
            }

            Spacer()

            Text("\(manager.config.profiles.count) 个 Profile")
                .font(.caption)
                .foregroundStyle(.secondary)
        }
        .padding()
    }
}

// MARK: - Profile 列表行

private struct ProfileListRow: View {
    let profile: Profile
    let isActive: Bool
    let onEdit: () -> Void
    let onDelete: () -> Void

    var body: some View {
        HStack {
            Circle()
                .fill(isActive ? .green : .gray.opacity(0.3))
                .frame(width: 10, height: 10)

            VStack(alignment: .leading, spacing: 2) {
                HStack {
                    Text(profile.name)
                        .font(.system(.body, weight: .medium))
                    if isActive {
                        Text("当前")
                            .font(.caption2)
                            .foregroundStyle(.green)
                            .padding(.horizontal, 6)
                            .padding(.vertical, 1)
                            .background(.green.opacity(0.1))
                            .clipShape(RoundedRectangle(cornerRadius: 3))
                    }
                }

                HStack(spacing: 8) {
                    Label(profile.provider, systemImage: "server.rack")
                    Label(profile.env.anthropicModel, systemImage: "cpu")
                    if let notes = profile.notes, !notes.isEmpty {
                        Text("· \(notes)")
                    }
                }
                .font(.caption)
                .foregroundStyle(.secondary)
            }

            Spacer()

            Text(profile.maskedApiKey)
                .font(.system(.caption, design: .monospaced))
                .foregroundStyle(.tertiary)

            // 操作按钮
            Button(action: onEdit) {
                Image(systemName: "pencil")
            }
            .buttonStyle(.borderless)
            .help("编辑")

            Button(action: onDelete) {
                Image(systemName: "trash")
                    .foregroundStyle(.red.opacity(0.7))
            }
            .buttonStyle(.borderless)
            .help("删除")
        }
        .padding(.vertical, 4)
    }
}

// MARK: - 添加/编辑表单

enum ProfileFormMode: Identifiable {
    case add
    case edit(Profile)

    var id: String {
        switch self {
        case .add: return "add"
        case .edit(let p): return "edit-\(p.id)"
        }
    }
}

struct ProfileFormView: View {
    let mode: ProfileFormMode
    @EnvironmentObject private var manager: ProfileManager
    @Environment(\.dismiss) private var dismiss

    @State private var name = ""
    @State private var provider = "dashscope"
    @State private var baseUrl = ""
    @State private var apiKey = ""
    @State private var model = ""
    @State private var smallModel = ""
    @State private var notes = ""
    @State private var showApiKey = false
    @State private var errorText: String?

    private let providers = [
        ("anthropic", "Anthropic (官方)"),
        ("dashscope", "DashScope (阿里云百炼)"),
        ("ark", "Ark (火山引擎)"),
        ("custom", "自定义"),
    ]

    private var isEditing: Bool {
        if case .edit = mode { return true }
        return false
    }

    private var title: String {
        isEditing ? "编辑 Profile" : "添加 Profile"
    }

    var body: some View {
        VStack(spacing: 0) {
            // 标题
            HStack {
                Text(title)
                    .font(.headline)
                Spacer()
            }
            .padding()

            Divider()

            // 表单
            Form {
                Section("基本信息") {
                    Picker("提供商", selection: $provider) {
                        ForEach(providers, id: \.0) { (value, label) in
                            Text(label).tag(value)
                        }
                    }
                    .onChange(of: provider) { newVal in
                        if let preset = DefaultPresets.all[newVal] {
                            baseUrl = preset.baseUrl
                        }
                    }

                    TextField("名称", text: $name, prompt: Text("如：DashScope GLM-5"))
                }

                Section("API 配置") {
                    TextField("Base URL", text: $baseUrl, prompt: Text("https://..."))

                    HStack {
                        Group {
                            if showApiKey {
                                TextField("API Key", text: $apiKey)
                            } else {
                                SecureField("API Key", text: $apiKey)
                            }
                        }
                        Button {
                            showApiKey.toggle()
                        } label: {
                            Image(systemName: showApiKey ? "eye.slash" : "eye")
                        }
                        .buttonStyle(.borderless)
                    }

                    TextField("模型名称", text: $model, prompt: Text("如：glm-5"))
                    TextField("小快模型（可选）", text: $smallModel, prompt: Text("如：glm-5-mini"))
                }

                Section("其他") {
                    TextField("备注（可选）", text: $notes)
                }
            }
            .formStyle(.grouped)

            if let err = errorText {
                Text(err)
                    .font(.caption)
                    .foregroundStyle(.red)
                    .padding(.horizontal)
            }

            Divider()

            // 按钮
            HStack {
                Button("取消") { dismiss() }
                    .keyboardShortcut(.cancelAction)
                Spacer()
                Button(isEditing ? "保存" : "添加") { save() }
                    .keyboardShortcut(.defaultAction)
                    .disabled(name.isEmpty || apiKey.isEmpty || model.isEmpty || baseUrl.isEmpty)
            }
            .padding()
        }
        .frame(width: 460, height: 480)
        .onAppear { populateForEdit() }
    }

    private func populateForEdit() {
        if case .edit(let profile) = mode {
            name = profile.name
            provider = profile.provider
            baseUrl = profile.env.anthropicBaseURL
            apiKey = profile.env.anthropicAuthToken
            model = profile.env.anthropicModel
            smallModel = profile.optionalEnv?["ANTHROPIC_SMALL_FAST_MODEL"] ?? ""
            notes = profile.notes ?? ""
        } else {
            // 添加模式：根据默认提供商设置 baseUrl
            if let preset = DefaultPresets.all[provider] {
                baseUrl = preset.baseUrl
            }
        }
    }

    private func save() {
        let trimmedName = name.trimmingCharacters(in: .whitespaces)
        let id: String
        if case .edit(let profile) = mode {
            id = profile.id
        } else {
            id = generateId(provider: provider, name: trimmedName)
        }

        let profile = Profile(
            id: id,
            name: trimmedName,
            provider: provider,
            env: ProfileEnv(
                anthropicAuthToken: apiKey.trimmingCharacters(in: .whitespaces),
                anthropicBaseURL: baseUrl.trimmingCharacters(in: .whitespaces),
                anthropicModel: model.trimmingCharacters(in: .whitespaces)
            ),
            optionalEnv: smallModel.isEmpty ? nil : ["ANTHROPIC_SMALL_FAST_MODEL": smallModel.trimmingCharacters(in: .whitespaces)],
            permissions: nil,
            notes: notes.isEmpty ? nil : notes.trimmingCharacters(in: .whitespaces),
            createdAt: isEditing ? (mode.editProfile?.createdAt ?? ISO8601DateFormatter().string(from: Date())) : ISO8601DateFormatter().string(from: Date())
        )

        do {
            if isEditing {
                try manager.updateProfile(profile)
            } else {
                try manager.addProfile(profile)
            }
            dismiss()
        } catch {
            errorText = error.localizedDescription
        }
    }

    private func generateId(provider: String, name: String) -> String {
        return "\(provider)-\(name)"
            .lowercased()
            .replacingOccurrences(of: "[^a-z0-9]+", with: "-", options: .regularExpression)
            .trimmingCharacters(in: CharacterSet(charactersIn: "-"))
    }
}

// 辅助扩展：从 mode 中提取 profile
private extension ProfileFormMode {
    var editProfile: Profile? {
        if case .edit(let p) = self { return p }
        return nil
    }
}
