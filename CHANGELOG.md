# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/zh-CN/1.0.0/)
and this project adheres to [Semantic Versioning](https://semver.org/lang/zh-CN/)

## [Unreleased]

## [1.1.1] - 2026-05-19

### Added
- 发布脚本集成 Claude 自动更新文档，发布前需确认

### Fixed
- 修复发布脚本中 claude -p prompt 过长报错的问题

## [1.1.0] - 2026-05-19

### Added
- 本地进度缓存，当日猜词进度自动保存到 `~/.caiyan-cli/progress.json`，重启后自动恢复
- 新增 `r` 命令查看最近猜测记录（按时间倒序）
- 宽字符（中文）对齐支持，历史列表排版更整齐
- 发布脚本 `publish.sh`，支持选择版本号并发布到 npm 官方源
- `.gitignore` 文件

### Fixed
- 修复重复猜相同词语时仍显示排名的问题

### Changed
- 仓库地址迁移至 GitHub

## [1.0.0] - 2026-05-08

### Added
- 猜盐猜词终端版初始发布
- 每日猜词挑战，支持相似度反馈和热度图标
- `h` 命令查看猜测记录（按相似度排序）
- `--list` 参数开启每次猜测后自动展示排序列表
- 零依赖，装完即用
