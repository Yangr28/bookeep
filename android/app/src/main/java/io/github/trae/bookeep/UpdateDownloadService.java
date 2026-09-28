package io.github.trae.bookeep;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.pm.ServiceInfo;
import android.net.wifi.WifiManager;
import android.os.Build;
import android.os.IBinder;
import android.os.PowerManager;

import androidx.core.app.NotificationCompat;

/**
 * 更新下载前台服务：
 * - 以前台服务优先级运行，息屏 / 切后台 / Doze 下网络与 CPU 不被系统挂起，
 *   避免下载线程被当作后台进程杀掉后从头开始。
 * - 常驻通知显示下载进度，点击回到 App。
 * - 下载期间持有 PARTIAL_WAKE_LOCK（CPU 运行）与高性能 WifiLock，完成后立即释放。
 *
 * 由 AppUpdatePlugin 在下载开始时 start、结束（成功/失败）时 stop。
 */
public class UpdateDownloadService extends Service {

    private static final String CHANNEL_ID = "update_download";
    private static final int NOTIF_ID = 0xA71;
    private static final long NOTIF_THROTTLE_MS = 500;
    private static final long LOCK_TIMEOUT_MS = 15 * 60 * 1000L;

    private static UpdateDownloadService instance;

    private NotificationManager nm;
    private PowerManager.WakeLock wakeLock;
    private WifiManager.WifiLock wifiLock;
    private long lastNotifTime = 0;
    private int lastPercent = -1;
    private String fileLabel = "";

    /** 启动下载保活服务（调用方在 App 前台由用户点击触发，满足 FGS 启动限制） */
    public static void start(Context ctx, String label) {
        try {
            Intent i = new Intent(ctx.getApplicationContext(), UpdateDownloadService.class);
            i.putExtra("label", label == null ? "" : label);
            androidx.core.content.ContextCompat.startForegroundService(ctx.getApplicationContext(), i);
        } catch (Exception e) {
            // 个别 ROM 禁止后台启动 FGS 时退化为普通下载（断点续传仍生效）
            android.util.Log.w("UpdateDownload", "startForegroundService failed: " + e.getMessage());
        }
    }

    public static void stop(Context ctx) {
        try {
            ctx.getApplicationContext().stopService(
                    new Intent(ctx.getApplicationContext(), UpdateDownloadService.class));
        } catch (Exception ignored) {
        }
    }

    /** 下载线程上报进度（0-100），服务内做节流刷新通知 */
    public static void reportProgress(int percent, String label) {
        UpdateDownloadService s = instance;
        if (s != null) s.updateProgress(percent, label);
    }

    @Override
    public void onCreate() {
        super.onCreate();
        instance = this;
        nm = (NotificationManager) getSystemService(NOTIFICATION_SERVICE);
        createChannel();
        acquireLocks();
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent != null) {
            String l = intent.getStringExtra("label");
            if (l != null) fileLabel = l;
        }
        Notification n = buildNotification(0);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            startForeground(NOTIF_ID, n, ServiceInfo.FOREGROUND_SERVICE_TYPE_DATA_SYNC);
        } else {
            startForeground(NOTIF_ID, n);
        }
        return START_NOT_STICKY;
    }

    @Override
    public void onDestroy() {
        releaseLocks();
        instance = null;
        super.onDestroy();
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    private void createChannel() {
        NotificationChannel ch = new NotificationChannel(
                CHANNEL_ID, "应用更新下载", NotificationManager.IMPORTANCE_LOW);
        ch.setDescription("更新包下载进度通知");
        ch.setShowBadge(false);
        ch.enableVibration(false);
        ch.setSound(null, null);
        nm.createNotificationChannel(ch);
    }

    private synchronized void updateProgress(int percent, String label) {
        if (label != null && !label.isEmpty()) fileLabel = label;
        long now = System.currentTimeMillis();
        if (percent != 100 && percent == lastPercent && now - lastNotifTime < NOTIF_THROTTLE_MS) return;
        lastNotifTime = now;
        lastPercent = percent;
        try {
            nm.notify(NOTIF_ID, buildNotification(percent));
        } catch (Exception ignored) {
        }
    }

    private Notification buildNotification(int percent) {
        Intent openIntent = new Intent(this, MainActivity.class);
        openIntent.addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP);
        int piFlags = PendingIntent.FLAG_UPDATE_CURRENT
                | (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M ? PendingIntent.FLAG_IMMUTABLE : 0);
        PendingIntent pi = PendingIntent.getActivity(this, 0, openIntent, piFlags);

        String title = "正在下载更新…";
        String text = (fileLabel != null && !fileLabel.isEmpty() ? fileLabel + " · " : "") + percent + "%";
        return new NotificationCompat.Builder(this, CHANNEL_ID)
                .setSmallIcon(android.R.drawable.stat_sys_download)
                .setContentTitle(title)
                .setContentText(text)
                .setOngoing(true)
                .setOnlyAlertOnce(true)
                .setPriority(NotificationCompat.PRIORITY_LOW)
                .setProgress(100, percent, percent <= 0)
                .setContentIntent(pi)
                .build();
    }

    private void acquireLocks() {
        try {
            PowerManager pm = (PowerManager) getSystemService(POWER_SERVICE);
            wakeLock = pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "bookeep:update-download");
            wakeLock.acquire(LOCK_TIMEOUT_MS);
        } catch (Exception ignored) {
        }
        try {
            WifiManager wm = (WifiManager) getApplicationContext().getSystemService(Context.WIFI_SERVICE);
            int mode = Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q
                    ? WifiManager.WIFI_MODE_FULL_HIGH_PERF : 3;
            wifiLock = wm.createWifiLock(mode, "bookeep:update-wifi");
            wifiLock.setReferenceCounted(false);
            wifiLock.acquire();
        } catch (Exception ignored) {
        }
    }

    private void releaseLocks() {
        try {
            if (wakeLock != null && wakeLock.isHeld()) wakeLock.release();
        } catch (Exception ignored) {
        }
        try {
            if (wifiLock != null && wifiLock.isHeld()) wifiLock.release();
        } catch (Exception ignored) {
        }
        wakeLock = null;
        wifiLock = null;
    }
}
