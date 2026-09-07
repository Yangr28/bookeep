# Add project specific ProGuard rules here.

# 保留行号信息，方便崩溃日志定位
-keepattributes SourceFile,LineNumberTable
-renamesourcefileattribute SourceFile

# WebView JS 接口：Capacitor 插件通过 @CapacitorPlugin 注册，不能被混淆
-keep class io.github.trae.bookeep.** { *; }
-keep class com.getcapacitor.** { *; }

# Capacitor 插件注册
-keepclassmembers class * extends com.getcapacitor.Plugin {
    public <init>();
    public <methods>;
}
-keepclassmembers class * implements com.getcapacitor.Plugin {
    public <methods>;
}

# 保留 WebView 相关接口
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

# Capacitor 内部依赖（OkHttp 等）
-dontwarn okhttp3.**
-dontwarn okio.**
-dontwarn javax.annotation.**
