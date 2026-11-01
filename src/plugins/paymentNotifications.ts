import { registerPlugin } from '@capacitor/core';

/** 一条被监听到的支付通知（原生设备通知栏原文） */
export interface PaymentNotificationPayload {
  /** 通知来源包名，如 com.tencent.mm（微信）、com.eg.android.AlipayGphone（支付宝） */
  packageName: string;
  title: string;
  text: string;
  /** 通知发出的时间戳（毫秒） */
  time: number;
}

export interface PaymentNotificationsPlugin {
  /** 是否已获得「通知使用权」 */
  isEnabled(): Promise<{ enabled: boolean }>;
  /** 跳转系统「通知使用权」设置页 */
  requestPermission(): Promise<void>;
  /** 打开本应用详情页（用于后台白名单 / 自启动引导） */
  openAppSettings(): Promise<void>;
  /** 取走待处理的支付通知（原生侧取完即清空） */
  getPendingNotifications(): Promise<{ notifications: PaymentNotificationPayload[] }>;
}

const PaymentNotifications = registerPlugin<PaymentNotificationsPlugin>('PaymentNotifications', {
  web: {
    isEnabled: async () => ({ enabled: false }),
    requestPermission: async () => undefined,
    openAppSettings: async () => undefined,
    getPendingNotifications: async () => ({ notifications: [] }),
  },
});

export default PaymentNotifications;
