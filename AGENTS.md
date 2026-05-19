# AGENTS.md

## 项目概要

Electron 28 + React 18 桌面应用，管理本地 AI Skills 文件。左侧列表浏览，右侧详情/编辑/翻译。

## 常用命令

```bash
npm start          # 开发运行 Electron
npm run make       # 打包当前平台 (macOS → .zip)
npm run package    # 仅打包，不制作安装包
```

无 lint、无 typecheck、无 test。

## 架构

```
src/main/
  index.js            # Electron 主进程：窗口创建、IPC 处理
  preload.js           # contextBridge 暴露 window.api 给渲染进程
  skillsManager.js     # 核心逻辑：读/写技能目录、解析 SKILL.md、zip 导入
  logger.js            # 文件日志 ~/.ai-skills-manager.log
src/renderer/
  App.jsx              # 主组件：状态管理、业务编排
  App.css              # 全局样式 (Premium Minimal 主题)
  components/
    Header.jsx         # 顶栏：新增/导入/截图/主题/设置
    SkillListItem.jsx  # 左侧列表项
    SkillDetail.jsx    # 右侧详情/编辑/翻译面板
    ConfirmModal.jsx   # 通用确认弹窗
    SettingsModal.jsx   # 设置：目录预设、API Key、同步、日志
    EmptyState.jsx     # 空状态插画
    Toast.jsx          # 通知提示
    SkillCard.jsx      # (未使用，保留)
    SkillForm.jsx      # (未使用，保留)
```

## 关键约定

### SKILL.md 格式
技能目录下必须有 `SKILL.md`（大小写兼容）。YAML frontmatter 结构：
```yaml
---
name: 显示名称
description: 描述
metadata:
  skillhub.creator: "作者"
  skillhub.version: "V1"
---
# Markdown 正文...
```
`name` 字段仅用于展示，**文件操作以目录名为准**（`readSkillInfo` 返回 `name = 目录 basename`）。

### 启用/禁用
通过目录搬迁实现：启用 → `~/.claude/skills/`，禁用 → `~/.claude/skills_disabled/`。不修改文件内容。

### 翻译持久化
译文保存为同目录下 `SKILL.zh-CN.md`，不覆盖原文。下次选中自动加载。

### IPC 通信
- 主进程 `ipcMain.handle('xxx')` 处理，`preload.js` 通过 `contextBridge` 暴露
- 渲染进程调用 `window.api.xxx()`
- `nodeIntegration: false`, `contextIsolation: true`（安全沙箱）

### Webpack 注意事项
- Electron Forge 的 webpack 插件用魔法常量 `MAIN_WINDOW_WEBPACK_ENTRY` 注入渲染进程 URL
- preload 编译到 `.webpack/renderer/main_window/preload.js`，主进程用 `path.join(__dirname, '..', 'renderer', 'main_window', 'preload.js')` 引用
- 主进程 `node: { __dirname: false }` 保持真实的 `__dirname`

### 禁止使用
- `prompt()` / `alert()` / `confirm()` — 沙箱环境不支持，用自定义 React 组件替代
- 进程内 `require('electron').shell.openExternal` — `nodeIntegration: false` 下不可用

## 配置存储

- 技能目录: `~/.claude/skills` (默认)，可在设置中切换
- 应用设置: `~/.ai-skills-manager.json` (skillsDir + apiKey)
- 运行日志: `~/.ai-skills-manager.log` (2MB 自动轮转)

## 常见问题

- **白屏** → 检查 preload 路径是否正确
- **闪退** → 查看 `~/.ai-skills-manager.log`，GPU 进程 crash 在 macOS 终端开发环境下正常
- **刷新无效** → 设置保存后需确保 `skillsManager.setSkillsDirectory()` 在 `getSkills()` 之前被调用
- **技能不存在** → `name` 以目录名为准，不是 frontmatter 里的显示名
