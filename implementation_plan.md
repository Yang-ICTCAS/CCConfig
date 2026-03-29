# CCConfig — Claude Code 配置切换工具

一个 macOS 工具，通过命令行和状态栏快速切换 Claude Code 的 Anthropic 兼容 API 配置。

## 理解总结

- **构建什么**：CCConfig，包含 Node.js CLI (`ccfg`) 和 Swift 状态栏应用
- **为什么**：手动编辑 `settings.json` 切换 API 提供商繁琐易错
- **目标用户**：使用 Claude Code 且需要在多个 API 之间切换的开发者
- **核心能力**：既能切换不同提供商，也能管理同一提供商下多个 Key
- **配置生效**：直接修改 `~/.claude/settings.json` 的 `env` 字段

## 假设

1. 切换时只修改全局 `~/.claude/settings.json`，不处理项目级配置
2. CLI 通过 `npm install -g` 安装，命令名 `ccfg`
3. 状态栏应用是独立 Xcode 项目，手动编译或 `.app` 安装
4. 切换后需重启 Claude Code 生效（工具不自动重启）
5. API Key 明文存储在配置文件中，UI 显示时掩码

---

## Proposed Changes

### 组件 1：共享配置层

#### [NEW] 数据结构 `~/.ccfg/profiles.json`

```json
{
  "activeProfile": "dashscope-glm5",
  "profiles": [
    {
      "id": "dashscope-glm5",
      "name": "DashScope GLM-5",
      "provider": "dashscope",
      "env": {
        "ANTHROPIC_AUTH_TOKEN": "sk-sp-xxx",
        "ANTHROPIC_BASE_URL": "https://coding.dashscope.aliyuncs.com/apps/anthropic",
        "ANTHROPIC_MODEL": "glm-5"
      },
      "optionalEnv": {
        "ANTHROPIC_SMALL_FAST_MODEL": ""
      },
      "permissions": [],
      "notes": "阿里云百炼平台",
      "createdAt": "2026-03-28T09:30:00Z"
    }
  ],
  "presets": {
    "anthropic": { "baseUrl": "https://api.anthropic.com" },
    "dashscope": { "baseUrl": "https://coding.dashscope.aliyuncs.com/apps/anthropic" },
    "ark": { "baseUrl": "https://ark.cn-beijing.volces.com/api/coding" },
    "custom": { "baseUrl": "" }
  }
}
```

#### 切换机制

切换 Profile 时执行以下步骤：

1. **读取** `~/.claude/settings.json`（保留所有非 `env` 字段如 `statusLine`、`enabledPlugins` 等）
2. **合并写入** `env` — Profile 的 `env` + 非空 `optionalEnv`
3. **条件合并** `permissions` — Profile 有 permissions 时追加
4. **更新** `profiles.json` 的 `activeProfile`
5. **写回** `settings.json`

**关键原则**：只动 `env`（和可选 `permissions`），其他字段原样保留。

---

### 组件 2：Node.js CLI (`ccfg`)

#### [NEW] [package.json](file:///Users/yangxiaodong/Desktop/CCConfig/cli/package.json)

npm 包配置，`bin` 字段注册 `ccfg` 命令。

依赖：
- `commander` — 命令解析
- `inquirer` — 交互式选择
- `chalk` — 终端着色

#### [NEW] [src/index.ts](file:///Users/yangxiaodong/Desktop/CCConfig/cli/src/index.ts)

CLI 入口，注册所有命令。

#### [NEW] [src/config.ts](file:///Users/yangxiaodong/Desktop/CCConfig/cli/src/config.ts)

核心配置管理模块：
- `loadProfiles()` — 读取 profiles.json
- `saveProfiles()` — 写入 profiles.json
- `switchProfile(id)` — 切换并修改 settings.json
- `getCurrentProfile()` — 获取当前激活 Profile

#### [NEW] [src/commands/](file:///Users/yangxiaodong/Desktop/CCConfig/cli/src/commands/)

各命令实现：

| 命令 | 功能 |
|------|------|
| `ccfg` (无参数) | 交互式选择切换 |
| `ccfg use <id>` | 快捷切换 |
| `ccfg current` | 查看当前配置 |
| `ccfg list` | 列出所有 Profile |
| `ccfg add` | 交互式添加 |
| `ccfg edit <id>` | 编辑 Profile |
| `ccfg remove <id>` | 删除 Profile |
| `ccfg import` | 从现有 settings.json 导入 |

---

### 组件 3：Swift 状态栏应用

#### [NEW] [CCConfigApp.swift](file:///Users/yangxiaodong/Desktop/CCConfig/app/CCConfig/CCConfigApp.swift)

应用入口，使用 `MenuBarExtra` 注册状态栏菜单。

#### [NEW] [MenuBarView.swift](file:///Users/yangxiaodong/Desktop/CCConfig/app/CCConfig/Views/MenuBarView.swift)

下拉菜单视图：

```
┌─────────────────────────────┐
│  ⚡ CCConfig                │
├─────────────────────────────┤
│  当前: DashScope GLM-5      │
├─────────────────────────────┤
│  ○ Anthropic Official       │
│  ● DashScope GLM-5      ✓  │
│  ○ Ark MiniMax-M2.5        │
├─────────────────────────────┤
│  ⚙ 管理配置...              │
│  ─ 退出                     │
└─────────────────────────────┘
```

#### [NEW] [SettingsView.swift](file:///Users/yangxiaodong/Desktop/CCConfig/app/CCConfig/Views/SettingsView.swift)

弹出面板，包含：
- Profile 列表（拖拽排序）
- 添加/编辑/删除表单
- 预置提供商模板下拉选择
- API Key 掩码显示/切换
- 连接测试按钮（可选）

#### [NEW] [ProfileManager.swift](file:///Users/yangxiaodong/Desktop/CCConfig/app/CCConfig/Models/ProfileManager.swift)

配置管理模型：
- 读写 `~/.ccfg/profiles.json`
- 修改 `~/.claude/settings.json`
- `FSEvents` 文件监听，CLI 修改后自动刷新

#### 技术要求
- SwiftUI + macOS 13 Ventura+
- `MenuBarExtra` API
- `DispatchSource.makeFileSystemObjectSource` 文件监听

---

## 项目目录结构

```
CCConfig/
├── cli/                          # Node.js CLI
│   ├── package.json
│   ├── tsconfig.json
│   ├── src/
│   │   ├── index.ts              # CLI 入口
│   │   ├── config.ts             # 配置管理核心
│   │   ├── types.ts              # TypeScript 类型定义
│   │   └── commands/
│   │       ├── use.ts
│   │       ├── list.ts
│   │       ├── add.ts
│   │       ├── edit.ts
│   │       ├── remove.ts
│   │       ├── current.ts
│   │       └── import.ts
│   └── README.md
│
├── app/                          # Swift 状态栏应用
│   └── CCConfig/
│       ├── CCConfig.xcodeproj
│       ├── CCConfigApp.swift
│       ├── Models/
│       │   ├── Profile.swift
│       │   └── ProfileManager.swift
│       ├── Views/
│       │   ├── MenuBarView.swift
│       │   └── SettingsView.swift
│       └── Utils/
│           └── FileWatcher.swift
│
└── README.md                     # 项目总览
```

---

## 决策日志

| # | 决策 | 备选方案 | 选择原因 |
|---|------|----------|----------|
| 1 | 使用场景：切换提供商 + 管理多 Key | 单一功能 | 用户需求明确两者兼顾 |
| 2 | 技术栈：Swift 状态栏 + Node.js CLI | 纯 Swift / Electron | 各取所长，状态栏原生体验好，CLI 通过 npm 易分发 |
| 3 | 配置生效：修改 settings.json | 环境变量 / 两者结合 | 直接明确，无需修改 shell 配置 |
| 4 | 安全存储：明文 JSON | Keychain / 加密 | 简单直接，与现有习惯一致 |
| 5 | 通信方式：共享文件 + FSEvents | CLI 子进程 / IPC | 完全解耦，简单可靠 |
| 6 | CLI 命令名：`ccfg` | `ccconfig` / `ccc` | 简短好记 |
| 7 | 最低系统版本：macOS 13 | macOS 12 | MenuBarExtra 需要 macOS 13+ |

---

## Verification Plan

### 自动化测试

#### CLI 测试
```bash
# 单元测试：配置读写逻辑
npm test

# 集成测试：完整切换流程
ccfg add        # 添加测试 Profile
ccfg list       # 确认出现
ccfg use <id>   # 切换
ccfg current    # 验证切换结果
cat ~/.claude/settings.json  # 确认 env 字段正确
ccfg remove <id>  # 清理
```

### 手动验证

1. CLI 切换后，检查 `~/.claude/settings.json` 的 `env` 字段是否正确更新
2. 切换后其他字段（`enabledPlugins`、`statusLine` 等）是否保持不变
3. 状态栏应用：点击 Profile 切换后下拉菜单标记是否正确更新
4. 状态栏应用：CLI 切换后状态栏是否通过文件监听自动刷新
5. 弹出面板：添加/编辑/删除 Profile 是否正常工作
6. 重启 Claude Code 后新配置是否生效
