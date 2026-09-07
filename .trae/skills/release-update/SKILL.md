---
name: "release-update"
description: "Bookeep 应用发版全流程：升版本号、构建热更新包、发布 GitHub Release、推送代码。当用户要求发版/发布新版本/更新版本/打包热更新/上线新功能时调用此 skill。"
---

# Bookeep 发版流程

将 Bookeep（Capacitor + React 记账应用）的新改动发布给手机端，支持两种更新方式：

- **热更新**（默认）：仅 Web 界面改动。发布 dist zip 到 GitHub Release，用户 App 内自动提示并应用，无需重装 APK。
- **整包更新**：涉及原生代码（插件、权限、build.gradle 配置）时，额外构建并上传 APK。

## 前置检查

1. GitHub CLI 已登录：`gh auth status`（未登录则引导用户完成 `gh auth login` 设备授权流程）
2. [.env](file:///c:/trae%20project/bookeep/.env) 中 `VITE_GITHUB_REPO=Yangr28/bookeep`
3. 仓库：https://github.com/Yangr28/bookeep（公开仓库，App 免 token 拉取）

## 发版步骤

### 第 1 步：升版本号

- 改 `package.json` 的 `version`（如 4.4.5 → 4.4.6）
- 同步改 `.env` 的 `APP_VERSION`（必须一致）
- **仅原生改动时**：改 `android/app/build.gradle` 的 `versionName`（同版本号）和 `versionCode`（+1）

### 第 2 步：构建并打包

```bash
node scripts/release-update.mjs
```

脚本自动完成：npm run build → 用 tar 打包 dist 为 `release-assets/dist_v<版本>.zip` → 生成 `update.json`（minNativeVersion 自动取 gradle 的 versionName）。

**⚠️ 关键约束：绝对不要用 PowerShell 的 Compress-Archive 打 zip！**
其 zip 条目路径用反斜杠（`assets\index.js`），Android 解压成带 `\` 的文件而非目录，WebView 加载 404 导致白屏（2026-09 已踩坑）。必须用脚本内的 `tar -a -c -f`（Windows 自带 bsdtar，条目为正斜杠）。脚本参数也不要加 `shell: true`（项目路径含空格会被拆分）。

**涉及原生改动时**额外执行：

```bash
cd android; .\gradlew assembleRelease
```

产物：`android/app/build/outputs/apk/release/bookeep_v<版本>.apk`。

### 第 3 步：发布 Release

```bash
gh release create v<版本> release-assets/dist_v<版本>.zip release-assets/update.json --title "v<版本>" --notes "<更新日志>"
```

- tag 必须为 `v<版本号>` 格式，Release 正文即 App 内展示的更新日志
- 原生改动时把 APK 也上传到**同一个 Release**：`gh release upload v<版本> android/app/build/outputs/apk/release/bookeep_v<版本>.apk`
- `update.json` 的 `mandatory: true` 表示强制更新（用户不可跳过），默认 false

### 第 4 步：提交并推送

```bash
git add -A; git commit -m "chore: 发布 v<版本>"; git push
```

**网络注意**：国内直连 GitHub 时好时坏，gh/git 失败是常态。用循环重试（每 30-45 秒一次，最多 10-40 次），不要立即放弃。代码推送失败不阻塞发版（Release 已可通过 API 发布），但最终必须补推成功。

### 第 5 步：验证

提醒用户在手机上验证：
1. 打开 App 等 3 秒自动弹更新提示（或 设置 → 检查更新）
2. 立即更新 → 下载（热更新包通常仅 1-2 MB）→ 自动应用
3. 设置页版本号变为新版本

**若更新后白屏**：让用户彻底关闭 App 再连续打开 2 次，内置机制会自动回滚到旧版本（连续 2 次启动未 markReady 即回滚）。然后从"第 2 步"检查 zip 打包方式是否正确后重新发布。

## 常见坑

| 坑 | 规避 |
|----|------|
| Compress-Archive 反斜杠 zip → 白屏 | 必须用 tar 打包（见第 2 步） |
| 版本字符串比较 `"1.0.10" < "1.0.2"` | 比较逻辑在 src/utils/update.ts 的 compareVersions（按数字段），勿改成字符串比较 |
| 整包升级后仍加载旧热更新包 | 原生已内置自动弃用逻辑（AppUpdatePlugin.applyStartupHotUpdate），勿删除 |
| APK 误入 git 仓库 | .gitignore 已含 `*.apk`、`build-outputs`、`release-assets`，保持生效 |
| update.json 拉取失败 | 不阻断流程，按默认规则（非强制、minNativeVersion=当前版本）处理 |
