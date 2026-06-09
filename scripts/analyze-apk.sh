#!/bin/bash
# ============================================================
# APK 体积分析脚本
# 用法: ./scripts/analyze-apk.sh [apk路径]
# 默认路径: android/app/build/outputs/apk/release/app-release.apk
# ============================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
APK_PATH="${1:-$PROJECT_DIR/android/app/build/outputs/apk/release/app-release.apk}"

if [ ! -f "$APK_PATH" ]; then
    echo "❌ APK 不存在: $APK_PATH"
    echo "请先构建 release: cd android && ./gradlew assembleRelease"
    exit 1
fi

APK_SIZE=$(stat -f%z "$APK_PATH" 2>/dev/null || stat --printf="%s" "$APK_PATH" 2>/dev/null)
APK_SIZE_MB=$(echo "scale=2; $APK_SIZE / 1048576" | bc)

echo "============================================"
echo "  📦 APK 体积分析"
echo "============================================"
echo ""
echo "文件: $APK_PATH"
echo "大小: ${APK_SIZE_MB}MB ($APK_SIZE bytes)"
echo ""

# 解压分析各部分占比
TMP_DIR=$(mktemp -d)
cp "$APK_PATH" "$TMP_DIR/app.apk"
cd "$TMP_DIR"
unzip -q -o app.apk -d apk_contents

echo "📊 各部分体积占比:"
echo "--------------------------------------------"

# 统计 dex 文件
DEX_SIZE=$(find apk_contents -name "*.dex" -exec stat -f%z {} \; 2>/dev/null | awk '{s+=$1} END {print s+0}')
if [ "$DEX_SIZE" -gt 0 ]; then
    DEX_MB=$(echo "scale=2; $DEX_SIZE / 1048576" | bc)
    DEX_PCT=$(echo "scale=1; $DEX_SIZE * 100 / $APK_SIZE" | bc)
    printf "  %-20s %8.2fMB  (%5.1f%%)\n" "代码 (dex)" "$DEX_MB" "$DEX_PCT"
fi

# 统计 so 库
LIB_SIZE=$(find apk_contents -name "*.so" -exec stat -f%z {} \; 2>/dev/null | awk '{s+=$1} END {print s+0}')
if [ "$LIB_SIZE" -gt 0 ]; then
    LIB_MB=$(echo "scale=2; $LIB_SIZE / 1048576" | bc)
    LIB_PCT=$(echo "scale=1; $LIB_SIZE * 100 / $APK_SIZE" | bc)
    printf "  %-20s %8.2fMB  (%5.1f%%)\n" "Native 库 (so)" "$LIB_MB" "$LIB_PCT"
fi

# 统计资源
RES_SIZE=$(find apk_contents -path "*/res/*" -exec stat -f%z {} \; 2>/dev/null | awk '{s+=$1} END {print s+0}')
if [ "$RES_SIZE" -gt 0 ]; then
    RES_MB=$(echo "scale=2; $RES_SIZE / 1048576" | bc)
    RES_PCT=$(echo "scale=1; $RES_SIZE * 100 / $APK_SIZE" | bc)
    printf "  %-20s %8.2fMB  (%5.1f%%)\n" "资源 (res)" "$RES_MB" "$RES_PCT"
fi

# 统计 assets (JS bundle, webview 等)
ASSETS_SIZE=$(find apk_contents -path "*/assets/*" -exec stat -f%z {} \; 2>/dev/null | awk '{s+=$1} END {print s+0}')
if [ "$ASSETS_SIZE" -gt 0 ]; then
    ASSETS_MB=$(echo "scale=2; $ASSETS_SIZE / 1048576" | bc)
    ASSETS_PCT=$(echo "scale=1; $ASSETS_SIZE * 100 / $APK_SIZE" | bc)
    printf "  %-20s %8.2fMB  (%5.1f%%)\n" "Assets (JS/H5)" "$ASSETS_MB" "$ASSETS_PCT"
fi

# 其他 (META-INF, manifest 等)
OTHER_SIZE=$(find apk_contents -not -name "*.dex" -not -name "*.so" -not -path "*/res/*" -not -path "*/assets/*" -type f -exec stat -f%z {} \; 2>/dev/null | awk '{s+=$1} END {print s+0}')
if [ "$OTHER_SIZE" -gt 0 ]; then
    OTHER_MB=$(echo "scale=2; $OTHER_SIZE / 1048576" | bc)
    OTHER_PCT=$(echo "scale=1; $OTHER_SIZE * 100 / $APK_SIZE" | bc)
    printf "  %-20s %8.2fMB  (%5.1f%%)\n" "其他" "$OTHER_MB" "$OTHER_PCT"
fi

echo "--------------------------------------------"
printf "  %-20s %8.2fMB  (100.0%%)\n" "总计" "$APK_SIZE_MB"

# so 库细分
SO_FILES=$(find apk_contents -name "*.so" -type f 2>/dev/null)
if [ -n "$SO_FILES" ]; then
    echo ""
    echo "🔧 Native 库细分:"
    echo "--------------------------------------------"
    echo "$SO_FILES" | while read -r so; do
        SO_NAME=$(basename "$so")
        SO_SIZE=$(stat -f%z "$so" 2>/dev/null || echo 0)
        SO_KB=$(echo "scale=1; $SO_SIZE / 1024" | bc)
        printf "  %-40s %8.1fKB\n" "$SO_NAME" "$SO_KB"
    done
fi

# 保存分析结果到文件
REPORT_FILE="$PROJECT_DIR/apk-size-report.txt"
{
    echo "APK 体积分析报告 - $(date '+%Y-%m-%d %H:%M:%S')"
    echo "============================================"
    echo "文件: $APK_PATH"
    echo "大小: ${APK_SIZE_MB}MB ($APK_SIZE bytes)"
    echo ""
    echo "minifyEnabled: $(grep 'minifyEnabled' "$PROJECT_DIR/android/app/build.gradle" | head -1 | xargs)"
    echo "shrinkResources: $(grep 'shrinkResources' "$PROJECT_DIR/android/app/build.gradle" | head -1 | xargs)"
    echo ""
    echo "dex: ${DEX_MB:-0}MB"
    echo "so: ${LIB_MB:-0}MB"
    echo "res: ${RES_MB:-0}MB"
    echo "assets: ${ASSETS_MB:-0}MB"
    echo "other: ${OTHER_MB:-0}MB"
} > "$REPORT_FILE"

echo ""
echo "📄 报告已保存: $REPORT_FILE"

# 清理
rm -rf "$TMP_DIR"
