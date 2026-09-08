package io.github.trae.bookeep;

import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageInfo;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;
import android.util.Log;

import androidx.activity.result.ActivityResult;
import androidx.core.content.FileProvider;

import com.getcapacitor.Bridge;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;

/**
 * 应用内更新插件：
 * - 热更新（Web 资源包）：下载 zip -> 解压到 filesDir/hot-updates/<version> -> bridge.setServerBasePath 切换加载目录
 * - 整包更新（APK）：下载 apk -> FileProvider + ACTION_VIEW 调起系统安装器
 * - 版本状态持久化在 SharedPreferences，支持启动恢复、失败自动回滚、APK 升级后自动弃用旧热更新包
 */
@CapacitorPlugin(name = "AppUpdate")
public class AppUpdatePlugin extends Plugin {

    private static final String TAG = "AppUpdate";
    private static final String PREFS = "app_update_prefs";
    private static final String KEY_HOT_VERSION = "hot_version";
    private static final String KEY_HOT_BASE_NATIVE = "hot_base_native";
    private static final String KEY_HOT_PENDING = "hot_pending";
    private static final String KEY_HOT_PENDING_COUNT = "hot_pending_count";
    private static final String KEY_HOT_PREVIOUS = "hot_previous";
    private static final String KEY_LAST_APK = "last_apk_path";

    private SharedPreferences prefs() {
        return getContext().getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    }

    private String getNativeVersion() {
        try {
            PackageInfo info = getContext().getPackageManager().getPackageInfo(getContext().getPackageName(), 0);
            return info.versionName != null ? info.versionName : "0.0.0";
        } catch (Exception e) {
            return "0.0.0";
        }
    }

    private File hotUpdatesDir() {
        return new File(getContext().getFilesDir(), "hot-updates");
    }

    private File hotVersionDir(String version) {
        return new File(hotUpdatesDir(), version);
    }

    private File downloadsDir() {
        File d = new File(getContext().getCacheDir(), "downloads");
        if (!d.exists()) d.mkdirs();
        return d;
    }

    /**
     * 应用启动时调用（MainActivity.onCreate 中 bridge 初始化后）：
     * 1. APK 整包升级后弃用旧热更新包（新 APK 内置了新 Web 资源）
     * 2. 待确认版本连续两次启动未 markReady -> 回滚到上一版本
     * 3. 恢复有效的热更新版本
     */
    public static void applyStartupHotUpdate(Bridge bridge) {
        Context context = bridge.getContext();
        SharedPreferences prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);

        String nativeVersion;
        try {
            PackageInfo info = context.getPackageManager().getPackageInfo(context.getPackageName(), 0);
            nativeVersion = info.versionName;
        } catch (Exception e) {
            return;
        }

        String hotVersion = prefs.getString(KEY_HOT_VERSION, "");
        String hotBaseNative = prefs.getString(KEY_HOT_BASE_NATIVE, "");
        String pending = prefs.getString(KEY_HOT_PENDING, "");
        String previous = prefs.getString(KEY_HOT_PREVIOUS, "");

        SharedPreferences.Editor editor = prefs.edit();

        // 整包 APK 升级覆盖安装后，filesDir/prefs 仍保留，但内置 Web 资源已是新版，弃用旧热更新包
        if (!hotVersion.isEmpty() && !hotBaseNative.isEmpty() && !hotBaseNative.equals(nativeVersion)) {
            Log.i(TAG, "Native version changed (" + hotBaseNative + " -> " + nativeVersion
                    + "), discarding hot update " + hotVersion);
            editor.remove(KEY_HOT_VERSION).remove(KEY_HOT_BASE_NATIVE)
                  .remove(KEY_HOT_PENDING).remove(KEY_HOT_PENDING_COUNT)
                  .remove(KEY_HOT_PREVIOUS);
            editor.apply();
            return;
        }

        // 待确认版本：第二次启动仍未 markReady，说明新版本启动失败（白屏/崩溃），回滚
        if (!pending.isEmpty()) {
            int count = prefs.getInt(KEY_HOT_PENDING_COUNT, 0) + 1;
            if (count >= 2) {
                Log.w(TAG, "Hot update " + pending + " not confirmed, rolling back to "
                        + (previous.isEmpty() ? "builtin" : previous));
                hotVersion = previous;
                editor.putString(KEY_HOT_VERSION, hotVersion);
                editor.remove(KEY_HOT_PENDING);
                editor.putInt(KEY_HOT_PENDING_COUNT, 0);
                editor.apply();
            } else {
                editor.putInt(KEY_HOT_PENDING_COUNT, count);
                editor.apply();
            }
        }

        if (!hotVersion.isEmpty()) {
            File dir = new File(context.getFilesDir(), "hot-updates/" + hotVersion);
            if (new File(dir, "index.html").exists()) {
                Log.i(TAG, "Loading hot update version " + hotVersion);
                bridge.setServerBasePath(dir.getAbsolutePath());
            } else {
                Log.w(TAG, "Hot update dir invalid, fallback to builtin: " + dir);
                editor.remove(KEY_HOT_VERSION).remove(KEY_HOT_BASE_NATIVE)
                      .remove(KEY_HOT_PENDING).remove(KEY_HOT_PENDING_COUNT)
                      .remove(KEY_HOT_PREVIOUS);
                editor.apply();
            }
        }
    }

    @PluginMethod
    public void getVersionInfo(PluginCall call) {
        String nativeVersion = getNativeVersion();
        String hotVersion = prefs().getString(KEY_HOT_VERSION, "");
        JSObject ret = new JSObject();
        ret.put("nativeVersion", nativeVersion);
        ret.put("hotVersion", hotVersion);
        ret.put("webVersion", hotVersion.isEmpty() ? nativeVersion : hotVersion);
        call.resolve(ret);
    }

    /**
     * 新版本 Web 资源加载成功后由 JS 调用，清除待确认标记
     */
    @PluginMethod
    public void markReady(PluginCall call) {
        prefs().edit()
            .remove(KEY_HOT_PENDING)
            .putInt(KEY_HOT_PENDING_COUNT, 0)
            .apply();
        call.resolve();
    }

    /**
     * 下载热更新 zip 并解压到 filesDir/hot-updates/<version>/
     * 参数：url, version
     * 进度事件：downloadProgress { kind: "hot", percent, loaded, total }
     */
    @PluginMethod
    public void downloadHotUpdate(PluginCall call) {
        String url = call.getString("url");
        String version = call.getString("version");
        if (url == null || version == null) {
            call.reject("url and version required");
            return;
        }
        call.setKeepAlive(true);
        new Thread(() -> {
            File zip = new File(downloadsDir(), "dist_" + version + ".zip");
            try {
                downloadFile(url, zip, "hot");
                File target = hotVersionDir(version);
                if (target.exists()) deleteRecursively(target);
                target.mkdirs();
                unzip(zip, target);
                zip.delete();
                if (!new File(target, "index.html").exists()) {
                    throw new Exception("index.html not found after unzip");
                }
                JSObject ret = new JSObject();
                ret.put("version", version);
                ret.put("path", target.getAbsolutePath());
                call.resolve(ret);
            } catch (Exception e) {
                Log.e(TAG, "downloadHotUpdate failed", e);
                call.reject("热更新下载失败: " + e.getMessage());
            }
        }).start();
    }

    /**
     * 切换到指定热更新版本（目录需已解压完成），切换后 WebView 自动重新加载
     * 参数：version
     */
    @PluginMethod
    public void activateHotUpdate(PluginCall call) {
        String version = call.getString("version");
        if (version == null) {
            call.reject("version required");
            return;
        }
        File dir = hotVersionDir(version);
        if (!new File(dir, "index.html").exists()) {
            call.reject("更新包不完整");
            return;
        }
        SharedPreferences prefs = prefs();
        String current = prefs.getString(KEY_HOT_VERSION, "");
        prefs.edit()
            .putString(KEY_HOT_PREVIOUS, current)
            .putString(KEY_HOT_VERSION, version)
            .putString(KEY_HOT_BASE_NATIVE, getNativeVersion())
            .putString(KEY_HOT_PENDING, version)
            .putInt(KEY_HOT_PENDING_COUNT, 0)
            .apply();

        getBridge().setServerBasePath(dir.getAbsolutePath());
        call.resolve();
    }

    /**
     * 下载整包 APK 到 cacheDir/downloads/
     * 参数：url, version
     * 进度事件：downloadProgress { kind: "apk", percent, loaded, total }
     */
    @PluginMethod
    public void downloadApk(PluginCall call) {
        String url = call.getString("url");
        String version = call.getString("version");
        if (url == null || version == null) {
            call.reject("url and version required");
            return;
        }
        call.setKeepAlive(true);
        new Thread(() -> {
            File apk = new File(downloadsDir(), "bookeep_v" + version + ".apk");
            try {
                downloadFile(url, apk, "apk");
                prefs().edit().putString(KEY_LAST_APK, apk.getAbsolutePath()).apply();
                JSObject ret = new JSObject();
                ret.put("path", apk.getAbsolutePath());
                call.resolve(ret);
            } catch (Exception e) {
                Log.e(TAG, "downloadApk failed", e);
                call.reject("安装包下载失败: " + e.getMessage());
            }
        }).start();
    }

    /**
     * 调起系统安装器安装已下载的 APK
     */
    @PluginMethod
    public void installApk(PluginCall call) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            if (!getContext().getPackageManager().canRequestPackageInstalls()) {
                try {
                    Intent intent = new Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES,
                            Uri.parse("package:" + getContext().getPackageName()));
                    startActivityForResult(call, intent, "onInstallPermissionResult");
                    return;
                } catch (Exception e) {
                    call.reject("无法打开安装权限设置: " + e.getMessage());
                    return;
                }
            }
        }
        doInstallApk(call);
    }

    @ActivityCallback
    public void onInstallPermissionResult(PluginCall call, ActivityResult result) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O
                && !getContext().getPackageManager().canRequestPackageInstalls()) {
            call.reject("未获得安装未知应用权限");
            return;
        }
        doInstallApk(call);
    }

    @ActivityCallback
    public void onInstallerResult(PluginCall call, ActivityResult result) {
        JSObject ret = new JSObject();
        ret.put("resultCode", result.getResultCode());
        call.resolve(ret);
    }

    private void doInstallApk(PluginCall call) {
        String path = call.getString("path");
        if (path == null || path.isEmpty()) {
            path = prefs().getString(KEY_LAST_APK, "");
        }
        File apk = new File(path);
        if (!apk.exists()) {
            call.reject("安装包不存在，请重新下载");
            return;
        }
        try {
            Uri uri = FileProvider.getUriForFile(getContext(),
                    getContext().getPackageName() + ".fileprovider", apk);
            Intent intent = new Intent(Intent.ACTION_VIEW);
            intent.setDataAndType(uri, "application/vnd.android.package-archive");
            intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            startActivityForResult(call, intent, "onInstallerResult");
        } catch (Exception e) {
            call.reject("调起安装器失败: " + e.getMessage());
        }
    }

    // ---------- helpers ----------

    private void downloadFile(String urlStr, File target, String kind) throws Exception {
        Exception lastError = null;
        // 国内访问 GitHub 不稳定，最多重试 5 次，间隔递增（1.5s/3s/4.5s/6s）
        for (int attempt = 0; attempt < 5; attempt++) {
            if (attempt > 0) {
                try {
                    Thread.sleep(1500L * attempt);
                } catch (InterruptedException ignored) {
                    Thread.currentThread().interrupt();
                }
            }
            HttpURLConnection conn = null;
            InputStream input = null;
            OutputStream output = null;
            try {
                URL url = new URL(urlStr);
                conn = (HttpURLConnection) url.openConnection();
                conn.setInstanceFollowRedirects(true);
                conn.setConnectTimeout(45000);
                conn.setReadTimeout(180000);
                // 模拟浏览器 User-Agent，避免 GitHub 拒绝默认 Java UA
                conn.setRequestProperty("User-Agent",
                        "Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Mobile Safari/537.36");
                conn.setRequestProperty("Accept-Encoding", "identity");
                conn.connect();
                int code = conn.getResponseCode();
                if (code != HttpURLConnection.HTTP_OK) {
                    throw new Exception("HTTP " + code);
                }
                input = conn.getInputStream();
                output = new FileOutputStream(target);
                long total = conn.getContentLengthLong();
                long read = 0;
                long lastNotify = 0;
                byte[] buffer = new byte[8192];
                int n;
                while ((n = input.read(buffer)) != -1) {
                    output.write(buffer, 0, n);
                    read += n;
                    long now = System.currentTimeMillis();
                    if (now - lastNotify > 200) {
                        lastNotify = now;
                        notifyProgress(kind, read, total);
                    }
                }
                output.flush();
                notifyProgress(kind, read, total > 0 ? total : read);
                return;
            } catch (Exception e) {
                lastError = e;
                Log.w(TAG, "download attempt " + (attempt + 1) + " failed: " + e.getMessage());
            } finally {
                if (output != null) try { output.close(); } catch (Exception ignored) {}
                if (input != null) try { input.close(); } catch (Exception ignored) {}
                if (conn != null) conn.disconnect();
            }
        }
        throw lastError != null ? lastError : new Exception("下载失败");
    }

    private void notifyProgress(String kind, long loaded, long total) {
        JSObject data = new JSObject();
        data.put("kind", kind);
        data.put("loaded", loaded);
        data.put("total", total);
        data.put("percent", total > 0 ? (int) (loaded * 100 / total) : 0);
        notifyListeners("downloadProgress", data);
    }

    private void unzip(File zip, File targetDir) throws Exception {
        try (ZipInputStream zis = new ZipInputStream(new FileInputStream(zip))) {
            ZipEntry entry;
            while ((entry = zis.getNextEntry()) != null) {
                // 规范化路径分隔符：部分打包工具（如旧版 Compress-Archive）会用反斜杠作为条目分隔符
                String name = entry.getName().replace('\\', '/');
                File out = new File(targetDir, name);
                // Zip Slip 防护：解压目标必须在 targetDir 内
                String canonicalTarget = targetDir.getCanonicalPath();
                String canonicalOut = out.getCanonicalPath();
                if (!canonicalOut.startsWith(canonicalTarget + File.separator)
                        && !canonicalOut.equals(canonicalTarget)) {
                    throw new Exception("非法的压缩包路径: " + entry.getName());
                }
                if (entry.isDirectory()) {
                    out.mkdirs();
                } else {
                    File parent = out.getParentFile();
                    if (parent != null) parent.mkdirs();
                    try (FileOutputStream fos = new FileOutputStream(out)) {
                        byte[] buffer = new byte[8192];
                        int n;
                        while ((n = zis.read(buffer)) != -1) {
                            fos.write(buffer, 0, n);
                        }
                    }
                }
                zis.closeEntry();
            }
        }
    }

    private void deleteRecursively(File f) {
        if (f.isDirectory()) {
            File[] children = f.listFiles();
            if (children != null) {
                for (File c : children) deleteRecursively(c);
            }
        }
        f.delete();
    }
}
