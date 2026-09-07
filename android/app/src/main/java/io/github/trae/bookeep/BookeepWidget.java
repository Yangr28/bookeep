package io.github.trae.bookeep;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;
import android.content.Intent;
import android.widget.RemoteViews;

public class BookeepWidget extends AppWidgetProvider {

    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        for (int appWidgetId : appWidgetIds) {
            updateAppWidget(context, appWidgetManager, appWidgetId);
        }
    }

    static void updateAppWidget(Context context, AppWidgetManager appWidgetManager, int appWidgetId) {
        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_layout);

        // 主按钮 → 打开 QuickRecordActivity（透明输入界面）
        Intent inputIntent = new Intent(context, QuickRecordActivity.class);
        inputIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        PendingIntent inputPendingIntent = PendingIntent.getActivity(
            context, 0, inputIntent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        views.setOnClickPendingIntent(R.id.widget_input_button, inputPendingIntent);

        appWidgetManager.updateAppWidget(appWidgetId, views);
    }
}
