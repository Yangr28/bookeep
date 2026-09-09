#!/usr/bin/env node
/**
 * 热更新发布包构建脚本
 *
 * 作用：
 *  1. 执行 npm run build 构建 Web 资源
 *  2. 将 dist/ 打包为 dist_v<version>.zip（zip 内 index.html 在根目录，供 App 热更新解压使用）
 *  3. 生成 update.json（minNativeVersion 取 android/app/build.gradle 的 versionName）
 *  4. 产物输出到 release-assets/，并打印 GitHub Release 发布命令
 *
 * 用法：
 *  node scripts/release-update.mjs              # 普通热更新
 *  node scripts/release-update.mjs --require-apk # 标记必须整包更新（含原生改动：图标/权限/插件等）
 *
 * 发布约定（与 src/utils/update.ts 对应）：
 *  - Release tag：v<版本号>
 *  - 资产：dist_v<版本号>.zip（热更新）、bookeep_v<版本号>.apk（整包，可选）、update.json
 *  - Release 正文即为更新日志
 */

import { readFileSync, existsSync, mkdirSync, rmSync, writeFileSync, readdirSync } from 'fs';
import { resolve, join } from 'path';
import { spawnSync } from 'child_process';

const root = process.cwd();
const pkg = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf-8'));
const version = pkg.version;

if (!version) {
  console.error('无法读取 package.json 版本号');
  process.exit(1);
}

// 1. 构建 Web 资源
console.log(`\n[1/4] 构建 Web 资源 (v${version})...`);
const build = spawnSync('npm', ['run', 'build'], { stdio: 'inherit', shell: true });
if (build.status !== 0) {
  console.error('构建失败');
  process.exit(1);
}

const distDir = resolve(root, 'dist');
if (!existsSync(join(distDir, 'index.html'))) {
  console.error('dist/index.html 不存在，构建结果异常');
  process.exit(1);
}

// 2. 准备输出目录
const outDir = resolve(root, 'release-assets');
if (existsSync(outDir)) rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });

// 3. 打包 zip（zip 内为 dist 内容，index.html 在根）
const zipName = `dist_v${version}.zip`;
const zipPath = join(outDir, zipName);
console.log(`\n[2/4] 打包热更新包 ${zipName}...`);

if (process.platform === 'win32') {
  // 注意：不要用 Compress-Archive！其打包的 zip 子目录条目使用反斜杠（assets\index.js），
  // 会导致 Android 端解压成带反斜杠的文件而非目录，WebView 加载 404 白屏。
  // Windows 10+ 自带 bsdtar，-a 按扩展名生成 zip，条目路径始终为正斜杠。
  const tar = spawnSync(
    'tar',
    ['-a', '-c', '-f', zipPath, '-C', distDir, '.'],
    // 不要加 shell: true：项目路径含空格时参数会被错误拆分
    { stdio: 'inherit' },
  );
  if (tar.status !== 0) {
    console.error('zip 打包失败（需要 Windows 10+ 自带的 tar 命令）');
    process.exit(1);
  }
} else {
  const zip = spawnSync('zip', ['-r', zipPath, '.'], { cwd: distDir, stdio: 'inherit' });
  if (zip.status !== 0) {
    console.error('zip 打包失败（需要系统 zip 命令）');
    process.exit(1);
  }
}

// 4. 生成 update.json（minNativeVersion 取原生版本号）
console.log('\n[3/4] 生成 update.json...');
const gradlePath = resolve(root, 'android/app/build.gradle');
let minNativeVersion = version;
if (existsSync(gradlePath)) {
  const gradle = readFileSync(gradlePath, 'utf-8');
  const m = gradle.match(/versionName\s+"([^"]+)"/);
  if (m) minNativeVersion = m[1];
}

// --require-apk 参数：标记该版本必须整包更新（包含原生改动：图标、权限、插件等）
const requireApk = process.argv.includes('--require-apk');

const meta = {
  // 热更新包要求的最低原生版本：当前 APK 原生版本。
  // 若本次 Web 更新依赖新的原生插件/能力，发布前请手动调高该值。
  minNativeVersion,
  // 强制更新：true 时用户无法跳过
  mandatory: false,
  // 必须整包更新：true 时即使有热更新包也强制走 APK 安装
  // 用于包含原生改动的版本（图标更换、权限变化、插件更新等）
  requireApk,
};
writeFileSync(join(outDir, 'update.json'), JSON.stringify(meta, null, 2), 'utf-8');
if (requireApk) {
  console.log('  ⚠ 本版本标记为 requireApk=true，用户将强制走整包更新');
}

// 5. 输出发布指引
console.log('\n[4/4] 完成，产物：');
for (const f of readdirSync(outDir)) {
  console.log('  - release-assets/' + f);
}

console.log(`
发布步骤（需安装 GitHub CLI 并登录 gh auth login）：

  1. 发布热更新（仅 Web 改动，无需重新打 APK）：
     gh release create v${version} release-assets/${zipName} release-assets/update.json \
       --title "v${version}" --notes "在此填写更新内容"

  2. 若包含原生改动，先用 Android Studio 或 gradle 打出 release APK：
     cd android && ./gradlew assembleRelease
     然后上传整包（同一 Release 追加资产）：
     gh release upload v${version} android/app/build/outputs/apk/release/bookeep_v${version}.apk

注意：
  - Release tag 必须为 v<版本号>，正文（body）会作为更新日志展示
  - 发版前同步修改 package.json 的 version（热更新版本）
    与 android/app/build.gradle 的 versionName / versionCode（整包版本）
`);
