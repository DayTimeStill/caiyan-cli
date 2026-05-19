#!/bin/bash

REPO="https://github.com/DayTimeStill/caiyan-cli.git"
BRANCH="main"
NPM_REGISTRY="https://registry.npmjs.org/"

# 检查工作区是否干净
if [ -n "$(git status --porcelain)" ]; then
  echo "❌ 工作区有未提交的更改，请先提交"
  exit 1
fi

# 检查 npm 官方源登录状态
if ! npm whoami --registry "$NPM_REGISTRY" &>/dev/null; then
  echo "未登录 npm 官方源，正在登录..."
  npm login --registry "$NPM_REGISTRY"
  if [ $? -ne 0 ]; then
    echo "❌ 登录失败"
    exit 1
  fi
fi

# 显示当前版本
CURRENT=$(node -p "require('./package.json').version")
echo "当前版本: $CURRENT"
echo ""
echo "选择版本类型:"
echo "  1) patch  (bug 修复)"
echo "  2) minor  (新功能)"
echo "  3) major  (破坏性变更)"
echo "  q) 退出"
echo ""
read -p "请选择 [1/2/3/q]: " choice

case $choice in
  1) TYPE="patch" ;;
  2) TYPE="minor" ;;
  3) TYPE="major" ;;
  q) echo "已取消"; exit 0 ;;
  *) echo "❌ 无效选择"; exit 1 ;;
esac

# 更新版本号
NEW=$(npm version $TYPE --no-git-tag-version)
echo ""
echo "版本: $CURRENT → $NEW"

# 提交并打 tag
git add package.json
git commit -m "chore: release $NEW"
git tag "$NEW"

# 推送
echo "推送到 $REPO ..."
git push "$REPO" "$BRANCH"
git push "$REPO" "$NEW"

# 发布
echo "发布到 npm ..."
npm publish --registry "$NPM_REGISTRY"

echo ""
echo "✅ 发布完成: $NEW"
