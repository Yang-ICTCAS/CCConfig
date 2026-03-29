#!/bin/bash
set -euo pipefail

# CCConfig macOS 状态栏应用构建脚本
# 使用 Swift Package Manager 编译并打包为 .app

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
APP_NAME="CCConfig"
BUILD_DIR="$SCRIPT_DIR/.build"
APP_BUNDLE="$SCRIPT_DIR/$APP_NAME.app"
RESOURCES_DIR="$SCRIPT_DIR/Resources"

echo "⚡ 构建 $APP_NAME..."

# 1. 编译
echo "  → swift build -c release"
cd "$SCRIPT_DIR"
swift build -c release 2>&1

# 获取编译产物路径
EXECUTABLE=$(swift build -c release --show-bin-path)/$APP_NAME

if [ ! -f "$EXECUTABLE" ]; then
    echo "✗ 编译失败：找不到可执行文件"
    exit 1
fi

echo "  → 编译成功"

# 2. 打包 .app
echo "  → 创建 $APP_NAME.app 包"

rm -rf "$APP_BUNDLE"
mkdir -p "$APP_BUNDLE/Contents/MacOS"
mkdir -p "$APP_BUNDLE/Contents/Resources"

# 复制可执行文件
cp "$EXECUTABLE" "$APP_BUNDLE/Contents/MacOS/$APP_NAME"

# 复制 Info.plist
cp "$RESOURCES_DIR/Info.plist" "$APP_BUNDLE/Contents/Info.plist"

echo ""
echo "✓ 构建完成: $APP_BUNDLE"
echo ""
echo "运行方式："
echo "  open $APP_BUNDLE"
echo ""
echo "安装到 /Applications（可选）："
echo "  cp -r $APP_BUNDLE /Applications/"
