# CCConfig

Claude Code 配置切换工具，支持快速切换 API 提供商。

## 项目结构

- **cli** - 命令行工具 (`ccfg`)，用于在终端切换配置
- **app** - macOS 菜单栏应用 (SwiftUI)

## 安装 CLI

```bash
git clone https://github.com/Yang-ICTCAS/CCConfig.git
cd CCConfig/cli
npm install
npm link
```

安装后即可使用 `ccfg` 命令。

## 使用

```bash
# 交互式切换
ccfg

# 查看当前配置
ccfg current

# 列出所有 Profile
ccfg list

# 添加新 Profile
ccfg add

# 更多命令
ccfg --help
```

详细文档见 [cli/README.md](cli/README.md)。

## 支持的提供商

| 提供商 | Base URL |
|--------|----------|
| Anthropic | `https://api.anthropic.com` |
| DashScope | `https://coding.dashscope.aliyuncs.com/apps/anthropic` |
| Ark | `https://ark.cn-beijing.volces.com/api/coding` |
| 自定义 | 用户自定义 |

## License

MIT