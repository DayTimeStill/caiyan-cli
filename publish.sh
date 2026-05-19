#!/bin/bash

REPO="https://github.com/DayTimeStill/caiyan-cli.git"
BRANCH="main"
NPM_REGISTRY="https://registry.npmjs.org/"

# 检查工作区是否干净
if [ -n "$(git status --porcelain)" ]; then
  echo "❌ 工作区有未提交的更改，请先提交"
  exit 1
fi

# 检查 claude 是否可用
if ! command -v claude &>/dev/null; then
  echo "❌ 未安装 claude CLI，请先安装"
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

# 获取上次 tag 以来的变更
LAST_TAG=$(git describe --tags --abbrev=0 2>/dev/null)
if [ -n "$LAST_TAG" ]; then
  CHANGES=$(git log "$LAST_TAG"..HEAD --pretty=format:"- %s" --no-merges)
else
  CHANGES=$(git log --pretty=format:"- %s" --no-merges)
fi

# 使用 claude 自动更新 README.md 和 CHANGELOG.md
echo "正在自动更新文档..."
cat <<PROMPT | claude -p --allowedTools 'Read,Edit,Write'
你正在帮助发布 npm 包 caiyan-cli 的新版本 $NEW (上一版本: $CURRENT)。

以下是自上次发布以来的 git 提交记录:
$CHANGES

请完成以下任务:
1. 读取 README.md，根据代码变更更新功能说明、操作表格等内容（如果已经是最新的则不改）
2. 读取 CHANGELOG.md，在 [Unreleased] 下方添加 ## [$NEW] - $(date +%Y-%m-%d) 章节，按 Added/Changed/Fixed/Removed 分类记录变更（从 git 提交中提取，不要包含 chore/docs 类型的提交）

注意:
- 保持现有文件格式和风格一致
- CHANGELOG 中只记录对用户有意义的变更
- 不要修改历史版本的记录
- 用中文描述变更内容
PROMPT

if [ $? -ne 0 ]; then
  echo "❌ 文档更新失败"
  git checkout -- package.json
  exit 1
fi

# 展示变更并等待确认
echo ""
echo "📄 文档变更如下:"
echo "────────────────────────────────────────"
git diff README.md CHANGELOG.md
echo "────────────────────────────────────────"
echo ""
read -p "确认发布 $NEW？(y/n): " confirm
if [ "$confirm" != "y" ]; then
  echo "已取消，回滚版本号..."
  git checkout -- package.json README.md CHANGELOG.md
  exit 0
fi

# 提交所有变更
git add package.json README.md CHANGELOG.md
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
