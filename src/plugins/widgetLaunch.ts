import { registerPlugin } from '@capacitor/core';

export interface WidgetLaunchResult {
  action: string;
  quickInput: string;
}

export interface WidgetLaunchPlugin {
  getLaunchAction(): Promise<WidgetLaunchResult>;
}

const WidgetLaunch = registerPlugin<WidgetLaunchPlugin>('WidgetLaunch', {
  web: {
    getLaunchAction: async () => ({ action: '', quickInput: '' }),
  },
});

export default WidgetLaunch;
