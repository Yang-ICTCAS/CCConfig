import SwiftUI

/// 状态栏下拉菜单视图
struct MenuBarView: View {
    @EnvironmentObject private var manager: ProfileManager

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            // ── 标题 ──
            headerSection

            Divider().padding(.vertical, 4)

            // ── 当前状态 ──
            currentStatusSection

            Divider().padding(.vertical, 4)

            // ── Profile 列表 ──
            profileListSection

            Divider().padding(.vertical, 4)

            // ── 操作按钮 ──
            actionSection
        }
        .padding(8)
        .frame(width: 280)
    }

    // MARK: - Header

    private var headerSection: some View {
        HStack {
            Image(systemName: "bolt.fill")
                .foregroundStyle(.yellow)
            Text("CCConfig")
                .font(.headline)
            Spacer()
            Text("v1.0")
                .font(.caption2)
                .foregroundStyle(.secondary)
        }
        .padding(.horizontal, 4)
    }

    // MARK: - 当前状态

    private var currentStatusSection: some View {
        VStack(alignment: .leading, spacing: 2) {
            Text("当前配置")
                .font(.caption)
                .foregroundStyle(.secondary)
                .padding(.horizontal, 4)

            if let profile = manager.activeProfile {
                HStack {
                    Circle()
                        .fill(.green)
                        .frame(width: 8, height: 8)
                    Text(profile.name)
                        .font(.system(.body, weight: .medium))
                    Spacer()
                    Text(profile.env.anthropicModel)
                        .font(.caption)
                        .foregroundStyle(.cyan)
                        .padding(.horizontal, 6)
                        .padding(.vertical, 2)
                        .background(.cyan.opacity(0.15))
                        .clipShape(RoundedRectangle(cornerRadius: 4))
                }
                .padding(.horizontal, 4)
            } else {
                HStack {
                    Circle()
                        .fill(.green)
                        .frame(width: 8, height: 8)
                    Text("Anthropic 官方默认")
                        .font(.system(.body, weight: .medium))
                }
                .padding(.horizontal, 4)
            }
        }
    }

    // MARK: - Profile 列表

    private var profileListSection: some View {
        VStack(alignment: .leading, spacing: 2) {
            // 默认选项
            ProfileRow(
                name: "Anthropic 官方默认",
                subtitle: "无 env 配置",
                isActive: manager.isDefault
            ) {
                manager.resetToDefault()
            }

            // 各 Profile
            ForEach(manager.config.profiles) { profile in
                ProfileRow(
                    name: profile.name,
                    subtitle: "\(profile.provider) / \(profile.env.anthropicModel)",
                    isActive: profile.id == manager.config.activeProfile
                ) {
                    manager.switchTo(profile.id)
                }
            }

            if manager.config.profiles.isEmpty {
                Text("暂无自定义 Profile")
                    .font(.caption)
                    .foregroundStyle(.secondary)
                    .padding(.horizontal, 4)
                    .padding(.vertical, 4)
            }
        }
    }

    // MARK: - 操作按钮

    private var actionSection: some View {
        VStack(spacing: 2) {
            SettingsButton()
            QuitButton()
        }
    }
}

// MARK: - Profile 行

private struct ProfileRow: View {
    let name: String
    let subtitle: String
    let isActive: Bool
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack {
                Image(systemName: isActive ? "checkmark.circle.fill" : "circle")
                    .foregroundStyle(isActive ? .green : .secondary)
                    .font(.body)

                VStack(alignment: .leading, spacing: 1) {
                    Text(name)
                        .font(.system(.body, weight: isActive ? .medium : .regular))
                    Text(subtitle)
                        .font(.caption2)
                        .foregroundStyle(.secondary)
                }

                Spacer()

                if isActive {
                    Text("✓")
                        .foregroundStyle(.green)
                        .font(.caption)
                        .fontWeight(.bold)
                }
            }
            .contentShape(Rectangle())
            .padding(.horizontal, 4)
            .padding(.vertical, 4)
        }
        .buttonStyle(.plain)
        .background(
            RoundedRectangle(cornerRadius: 4)
                .fill(isActive ? Color.accentColor.opacity(0.08) : .clear)
        )
    }
}

// MARK: - 管理配置按钮

private struct SettingsButton: View {
    @Environment(\.openWindow) private var openWindow

    var body: some View {
        Button {
            openWindow(id: "settings")
            // 激活应用，确保窗口浮到最前
            NSApp.activate(ignoringOtherApps: true)
        } label: {
            HStack {
                Image(systemName: "gearshape")
                Text("管理配置…")
                Spacer()
            }
            .padding(.horizontal, 4)
            .padding(.vertical, 4)
        }
        .buttonStyle(.plain)
    }
}

// MARK: - 退出按钮

private struct QuitButton: View {
    var body: some View {
        Button {
            NSApplication.shared.terminate(nil)
        } label: {
            HStack {
                Image(systemName: "power")
                Text("退出")
                Spacer()
            }
            .padding(.horizontal, 4)
            .padding(.vertical, 4)
        }
        .buttonStyle(.plain)
    }
}
