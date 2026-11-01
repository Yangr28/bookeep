package io.github.trae.bookeep;

import android.content.Intent;
import android.net.Uri;
import android.provider.Settings;

import androidx.core.app.NotificationManagerCompat;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import org.json.JSONArray;
import org.json.JSONException;

/**
 * 通知使用权相关能力：状态检测、跳转系统授权页、打开应用详情页（ROM 后台白名单引导），
 * 以及把监听服务收集到的支付通知交给 Web 层解析。
 */
@CapacitorPlugin(name = "PaymentNotifications")
public class PaymentNotificationsPlugin extends Plugin {

    @PluginMethod
    public void isEnabled(PluginCall call) {
        JSObject result = new JSObject();
        result.put("enabled", isNotificationAccessEnabled());
        call.resolve(result);
    }

    @PluginMethod
    public void requestPermission(PluginCall call) {
        try {
            Intent intent = new Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS);
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(intent);
            call.resolve();
        } catch (Exception e) {
            call.reject("无法打开通知使用权设置", e);
        }
    }

    @PluginMethod
    public void openAppSettings(PluginCall call) {
        try {
            Intent intent = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS);
            intent.setData(Uri.parse("package:" + getContext().getPackageName()));
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(intent);
            call.resolve();
        } catch (Exception e) {
            call.reject("无法打开应用设置", e);
        }
    }

    /** 取走待处理的支付通知（取完清空） */
    @PluginMethod
    public void getPendingNotifications(PluginCall call) {
        String raw = PaymentNotificationStore.takeAll(getContext());
        JSObject result = new JSObject();
        try {
            result.put("notifications", new JSONArray(raw));
        } catch (JSONException e) {
            result.put("notifications", new JSONArray());
        }
        call.resolve(result);
    }

    private boolean isNotificationAccessEnabled() {
        try {
            return NotificationManagerCompat.getEnabledListenerPackages(getContext())
                .contains(getContext().getPackageName());
        } catch (Exception e) {
            return false;
        }
    }
}
