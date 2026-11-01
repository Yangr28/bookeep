package io.github.trae.bookeep;

import android.content.Context;
import android.content.SharedPreferences;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

/**
 * 支付通知缓存：NotificationListenerService 运行在独立进程/后台时 JS 层可能还没就绪，
 * 先把识别到的通知落到本地队列，等首页启动或回到前台时由插件一次性取走。
 */
final class PaymentNotificationStore {

    private static final String PREF_NAME = "bookeep_payment_notifications";
    private static final String KEY_PENDING = "pending";
    private static final int MAX_PENDING = 10;

    private PaymentNotificationStore() {
    }

    static synchronized void append(Context context, String packageName, String title, String text, long time) {
        if (context == null) return;
        SharedPreferences sp = context.getSharedPreferences(PREF_NAME, Context.MODE_PRIVATE);
        JSONArray list;
        try {
            list = new JSONArray(sp.getString(KEY_PENDING, "[]"));
        } catch (JSONException e) {
            list = new JSONArray();
        }
        JSONObject item = new JSONObject();
        try {
            item.put("packageName", packageName);
            item.put("title", title);
            item.put("text", text);
            item.put("time", time);
        } catch (JSONException e) {
            return;
        }
        list.put(item);
        while (list.length() > MAX_PENDING) {
            list.remove(0);
        }
        sp.edit().putString(KEY_PENDING, list.toString()).apply();
    }

    /** 取走全部待处理通知（取完即清空，避免重复弹确认） */
    static synchronized String takeAll(Context context) {
        if (context == null) return "[]";
        SharedPreferences sp = context.getSharedPreferences(PREF_NAME, Context.MODE_PRIVATE);
        String raw = sp.getString(KEY_PENDING, "[]");
        sp.edit().putString(KEY_PENDING, "[]").apply();
        return raw;
    }
}
