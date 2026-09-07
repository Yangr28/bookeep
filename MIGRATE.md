# 换电脑迁移指南

## 新电脑上只需 3 步

### 1. 安装基础工具

| 工具 | 说明 |
|------|------|
| Node.js 18+ | 前端构建 |
| Android Studio | Android SDK + 构建工具（安装后打开一次，等 SDK 下载完成） |
| Git | 版本管理 |
| GitHub CLI | 发版用（可选，不装也能开发） |
| Trae IDE | 开发 + skill + 记忆 |

### 2. 克隆仓库

```bash
git clone https://github.com/Yangr28/bookeep.git
cd bookeep
```

### 3. 一键配置

```bash
node scripts/setup.mjs
```

这个脚本会自动完成：
- 安装 npm 依赖
- 验证签名密钥（已随仓库带走）
- 检查 Android SDK
- 同步 Capacitor 安卓资源
- 验证前端构建

**脚本跑完就能直接开发了。**

---

## 仓库里已包含的东西（不需要额外拷贝）

| 文件 | 位置 | 说明 |
|------|------|------|
| 源代码 | `src/` | 全部前端代码 |
| 安卓原生 | `android/` | 原生插件、主题、权限 |
| 签名密钥 | `android/keystore/debug.keystore` | APK 签名（3KB，已随仓库走） |
| 发版 Skill | `.trae/skills/release-update/SKILL.md` | Trae IDE 发版自动化 |
| 发布脚本 | `scripts/release-update.mjs` | 构建热更新包 |
| 迁移脚本 | `scripts/setup.mjs` | 一键环境配置 |
| 环境配置 | `.env` | 版本号 + GitHub 仓库地址 |
| Capacitor 配置 | `capacitor.config.ts` | 应用配置 |

## 不会随仓库迁移的东西

| 项目 | 原因 | 恢复方式 |
|------|------|---------|
| `node_modules` | .gitignore 排除 | `node scripts/setup.mjs` 自动安装 |
| Android SDK | 本地安装 | 安装 Android Studio 后自动下载 |
| Trae 记忆 | 在 `~/.trae-cn/memory/` | 新电脑会重新积累；或从旧电脑拷贝此目录 |

## 常用命令

```bash
# 开发调试
npm run dev

# 类型检查
npm run check

# 构建前端
npm run build

# 同步到安卓
npx cap sync android

# 构建 APK
cd android && ./gradlew assembleRelease

# 发版（在 Trae IDE 中说"发个版"即可自动执行）
node scripts/release-update.mjs
```
