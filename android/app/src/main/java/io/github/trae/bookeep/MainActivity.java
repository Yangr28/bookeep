package io.github.trae.bookeep;

import android.content.Intent;
import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    // 存储从小组件快速输入界面传来的文本
    public static String pendingQuickInput = null;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(WidgetLaunchPlugin.class);
        registerPlugin(AppUpdatePlugin.class);
        super.onCreate(savedInstanceState);
        // 恢复热更新版本（失败自动回滚 / APK 升级后自动弃用旧热更新包）
        if (getBridge() != null) {
            AppUpdatePlugin.applyStartupHotUpdate(getBridge());
        }
        // 检查启动 Intent 是否来自小组件输入界面
        checkWidgetIntent(getIntent());
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        checkWidgetIntent(intent);
    }

    private void checkWidgetIntent(Intent intent) {
        if (intent == null) return;

        // 检查是否有快速输入文本
        String quickInput = intent.getStringExtra(QuickRecordActivity.EXTRA_QUICK_INPUT);
        if (quickInput != null && !quickInput.isEmpty()) {
            pendingQuickInput = quickInput;
        }
    }
}
