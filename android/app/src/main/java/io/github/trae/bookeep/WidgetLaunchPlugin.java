package io.github.trae.bookeep;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "WidgetLaunch")
public class WidgetLaunchPlugin extends Plugin {

    @PluginMethod
    public void getLaunchAction(PluginCall call) {
        String quickInput = MainActivity.pendingQuickInput;
        JSObject result = new JSObject();
        if (quickInput != null && !quickInput.isEmpty()) {
            result.put("quickInput", quickInput);
            MainActivity.pendingQuickInput = null;
        } else {
            result.put("action", "");
            result.put("quickInput", "");
        }
        call.resolve(result);
    }
}
