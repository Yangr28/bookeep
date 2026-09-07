#!/usr/bin/env node
/**
 * Bookeep 项目一键迁移脚本
 *
 * 在新电脑上 git clone 仓库后，运行此脚本即可完成全部环境配置：
 *   node scripts/setup.mjs
 *
 * 执行内容：
 *   1. 安装 npm 依赖
 *   2. 检查 Android SDK 环境
 *   3. 验证签名密钥存在
 *   4. 同步 Capacitor 安卓资源
 *   5. 验证 .env 配置
 */

import { execSync } from 'child_process';
import { existsSync, readFileSync } from 'fs';
import { join, resolve } from 'path';

const ROOT = resolve(import.meta.dirname, '..');
const log = (msg) => console.log(`\x1b[36m[setup]\x1b[0m ${msg}`);
const ok = (msg) => console.log(`\x1b[32m  ✓\x1b[0m ${msg}`);
const fail = (msg) => console.log(`\x1b[31m  ✗\x1b[0m ${msg}`);
const warn = (msg) => console.log(`\x1b[33m  !\x1b[0m ${msg}`);

let hasError = false;

function run(cmd, opts = {}) {
  try {
    execSync(cmd, { stdio: 'inherit', cwd: ROOT, ...opts });
    return true;
  } catch {
    return false;
  }
}

function check(cmd) {
  try {
    execSync(`${cmd} --version`, { stdio: 'pipe', cwd: ROOT, shell: true });
    return true;
  } catch {
    return false;
  }
}

// --- 1. 基础工具检查 ---
log('检查基础工具...');
if (check('node')) ok('Node.js');
else { fail('Node.js 未安装，请先安装 Node.js 18+'); hasError = true; }

if (check('git')) ok('Git');
else { fail('Git 未安装，请先安装 Git'); hasError = true; }

if (check('gh')) ok('GitHub CLI');
else warn('GitHub CLI 未安装（可选，发版需要）');

if (hasError) {
  console.log('\n\x1b[31m基础工具缺失，请先安装后再运行此脚本。\x1b[0m');
  process.exit(1);
}

// --- 2. 安装 npm 依赖 ---
log('安装 npm 依赖...');
if (existsSync(join(ROOT, 'node_modules'))) {
  ok('node_modules 已存在，跳过安装');
} else if (run('npm install')) {
  ok('npm 依赖安装完成');
} else {
  fail('npm install 失败');
  hasError = true;
}

// --- 3. 检查 .env ---
log('检查环境配置...');
const envPath = join(ROOT, '.env');
if (existsSync(envPath)) {
  const env = readFileSync(envPath, 'utf8');
  ok('.env 存在');
  if (env.includes('VITE_GITHUB_REPO=Yangr28/bookeep')) {
    ok('GitHub 仓库地址已配置');
  } else {
    warn('VITE_GITHUB_REPO 需手动确认');
  }
} else {
  fail('.env 不存在（应从仓库克隆自动获得）');
  hasError = true;
}

// --- 4. 验证签名密钥 ---
log('验证签名密钥...');
const keystorePath = join(ROOT, 'android', 'keystore', 'debug.keystore');
if (existsSync(keystorePath)) {
  ok(`签名密钥存在: android/keystore/debug.keystore`);
} else {
  fail('签名密钥不存在: android/keystore/debug.keystore');
  console.log('       请从旧电脑复制 debug.keystore 到此目录，或运行：');
  console.log('       keytool -genkey -v -keystore android/keystore/debug.keystore -alias androiddebugkey -keyalg RSA -keysize 2048 -validity 10000 -storepass android -keypass android');
  hasError = true;
}

// --- 5. 检查 Android SDK ---
log('检查 Android 开发环境...');
const ANDROID_HOME = process.env.ANDROID_HOME || process.env.ANDROID_SDK_ROOT;
if (ANDROID_HOME && existsSync(ANDROID_HOME)) {
  ok(`Android SDK: ${ANDROID_HOME}`);
} else {
  // 尝试默认路径
  const defaultPaths = [
    join(process.env.LOCALAPPDATA || '', 'Android', 'Sdk'),
    join(process.env.HOME || '', 'Library', 'Android', 'sdk'),
  ];
  const found = defaultPaths.find(p => p && existsSync(p));
  if (found) {
    ok(`Android SDK (默认路径): ${found}`);
  } else {
    warn('未找到 Android SDK，请安装 Android Studio');
    console.log('       下载地址: https://developer.android.com/studio');
  }
}

// --- 6. 同步 Capacitor ---
log('同步 Capacitor 安卓资源...');
if (existsSync(join(ROOT, 'node_modules', '@capacitor'))) {
  if (run('npx cap sync android')) {
    ok('Capacitor 同步完成');
  } else {
    warn('Capacitor 同步失败（可稍后手动 npx cap sync android）');
  }
} else {
  warn('node_modules 不完整，跳过 Capacitor 同步');
}

// --- 7. 构建验证 ---
log('验证前端构建...');
if (run('npm run build', { stdio: 'pipe' })) {
  ok('前端构建通过');
} else {
  fail('前端构建失败，请检查 npm run check 输出');
  hasError = true;
}

// --- 总结 ---
console.log('');
if (hasError) {
  console.log('\x1b[31m[setup] 迁移未完成，请按上述提示修复问题后重新运行。\x1b[0m');
  process.exit(1);
} else {
  console.log('\x1b[32m[setup] 迁移完成！你现在可以：\x1b[0m');
  console.log('  • 开发调试: npm run dev');
  console.log('  • 构建 APK: npm run build && cd android && ./gradlew assembleRelease');
  console.log('  • 发布版本: 告诉 Trae "发个版"');
}
