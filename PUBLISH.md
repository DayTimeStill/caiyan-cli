# 发布流程

## 前置条件

```bash
# 确认 npm 已登录
npm whoami

# 确认 git remote 指向正确仓库
git remote -v
# 应为: https://github.com/DayTimeStill/caiyan-cli.git

# 如果 remote 不对，重新设置
git remote set-url origin https://github.com/DayTimeStill/caiyan-cli.git
```

## 发布步骤

### 1. 确认代码已提交

```bash
git status  # 确保工作区干净
```

### 2. 更新版本号

根据改动类型选择：

```bash
npm version patch   # bug 修复:    1.0.0 → 1.0.1
npm version minor   # 新功能:      1.0.0 → 1.1.0
npm version major   # 破坏性变更:  1.0.0 → 2.0.0
```

此命令会自动更新 package.json 并创建 git tag。

### 3. 推送代码和 tag

```bash
git push https://github.com/DayTimeStill/caiyan-cli.git main
git push https://github.com/DayTimeStill/caiyan-cli.git --tags
```

### 4. 发布到 npm

```bash
npm publish
```

### 5. 验证

```bash
npm info caiyan-cli version
```

## 一键发布（复制粘贴）

```bash
npm version minor && \
git push https://github.com/DayTimeStill/caiyan-cli.git main && \
git push https://github.com/DayTimeStill/caiyan-cli.git --tags && \
npm publish
```
