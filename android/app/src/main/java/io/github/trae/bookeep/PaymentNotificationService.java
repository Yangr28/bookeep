package io.github.trae.bookeep;

import android.app.Notification;
import android.os.Bundle;
import android.service.notification.NotificationListenerService;
import android.service.notification.StatusBarNotification;

import java.util.Arrays;
import java.util.HashSet;
import java.util.Set;

/**
 * 支付通知监听：只监听白名单内的支付类应用，命中「支付/付款/支出」关键词的通知
 * 才写入本地队列，由 PaymentNotificationsPlugin 交给 Web 层解析并弹确认入账。
 */
public class PaymentNotificationService extends NotificationListenerService {

    private static final Set<String> SUPPORTED_PACKAGES = new HashSet<>(Arrays.asList(
        "com.tencent.mm",               // 微信
        "com.eg.android.AlipayGphone"   // 支付宝
    ));

    private static final String[] KEYWORDS = {"支付", "付款", "支出", "消费", "扣款"};

    @Override
    public void onNotificationPosted(StatusBarNotification sbn) {
        if (sbn == null) return;
        String packageName = sbn.getPackageName();
        if (packageName == null || !SUPPORTED_PACKAGES.contains(packageName)) return;

        Notification notification = sbn.getNotification();
        if (notification == null) return;
        Bundle extras = notification.extras;
        if (extras == null) return;

        String title = toText(extras.getCharSequence(Notification.EXTRA_TITLE));
        String text = toText(extras.getCharSequence(Notification.EXTRA_TEXT));
        String bigText = toText(extras.getCharSequence(Notification.EXTRA_BIG_TEXT));
        if (bigText.length() > text.length()) {
            text = bigText;
        }
        if (title.isEmpty() && text.isEmpty()) return;

        String merged = title + " " + text;
        boolean hit = false;
        for (String keyword : KEYWORDS) {
            if (merged.contains(keyword)) {
                hit = true;
                break;
            }
        }
        if (!hit) return;

        PaymentNotificationStore.append(getApplicationContext(), packageName, title, text, sbn.getPostTime());
    }

    private static String toText(CharSequence value) {
        return value == null ? "" : value.toString().trim();
    }
}
