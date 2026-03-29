# ccfg

Claude Code 配置切换工具 — 快速切换 API 提供商和配置。

## 功能

- 快速切换 Claude Code 的 API 提供商配置
- 支持多个 Profile 管理（添加、编辑、删除）
- 交互式选择界面
- 支持从现有 `settings.json` 导入配置
- 内置常用提供商预设（Anthropic、DashScope、Ark 等）

## 安装

```bash
npm install -g claudcfg
```

## 使用

### 交互式切换

直接运行命令进入交互式选择界面：

```bash
ccfg
```

### 命令行操作

```bash
# 查看当前激活的 Profile
ccfg current

# 列出所有 Profile
ccfg list

# 切换到指定 Profile
ccfg use <profile-id>

# 添加新 Profile
ccfg add

# 编辑 Profile
ccfg edit <profile-id>

# 删除 Profile
ccfg remove <profile-id>

# 从 settings.json 导入现有配置
ccfg import

# 重置为 Anthropic 官方默认配置
ccfg default
```

## 配置文件

- `~/.ccfg/profiles.json` — 存储所有 Profile 配置
- `~/.claude/settings.json` — Claude Code 设置文件（工具会修改 `env` 字段）

## Profile 结构

每个 Profile 包含：

```json
{
  "id": "dashscope-prod",
  "name": "DashScope 生产环境",
  "provider": "dashscope",
  "env": {
    "ANTHROPIC_AUTH_TOKEN": "sk-xxx",
    "ANTHROPIC_BASE_URL": "https://coding.dashscope.aliyuncs.com/apps/anthropic",
    "ANTHROPIC_MODEL": "claude-sonnet-4-20250514"
  },
  "optionalEnv": {
    "ANTHROPIC_SMALL_FAST_MODEL": "claude-haiku-4-5-20251001"
  },
  "permissions": ["Bash(*)", "Read(*)"],
  "notes": "生产环境配置",
  "createdAt": "2025-03-28T10:00:00.000Z"
}
```

## 内置提供商预设

| 预设 | Base URL |
|------|----------|
| anthropic | `https://api.anthropic.com` |
| dashscope | `https://coding.dashscope.aliyuncs.com/apps/anthropic` |
| ark | `https://ark.cn-beijing.volces.com/api/coding` |
| custom | 自定义 |

## 注意事项

切换配置后需要**重启 Claude Code** 才能使新配置生效。

## License

MIT