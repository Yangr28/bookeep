import i18n from '../i18n';
import { todayKey, toDateKey, addDays } from './date';

const EN_MONTHS_ABBR = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const isEnglish = (): boolean => !!i18n.language && i18n.language.toLowerCase().startsWith('en');

export const formatCurrency = (amount: number): string => {
  return amount.toLocaleString('zh-CN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

export const formatCurrencyShort = (amount: number): string => {
  const absAmount = Math.abs(amount);
  const sign = amount < 0 ? '-' : '';

  return `${sign}¥${absAmount.toLocaleString('zh-CN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

export const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return dateString || (isEnglish() ? 'Unknown date' : '未知日期');
  if (isEnglish()) {
    return `${EN_MONTHS_ABBR[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
  }
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  return `${year}年${month}月${day}日`;
};

export const formatDateTime = (dateString: string): string => {
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return dateString || (isEnglish() ? 'Unknown date' : '未知日期');
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}`;
};

export const formatDateShort = (dateString: string): string => {
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return dateString || (isEnglish() ? 'Unknown' : '未知');
  if (isEnglish()) {
    return `${EN_MONTHS_ABBR[date.getMonth()]} ${date.getDate()}`;
  }
  const month = date.getMonth() + 1;
  const day = date.getDate();
  return `${month}月${day}日`;
};

export const formatTime = (dateString: string): string => {
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return '--:--';
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes}`;
};

export const getTodayString = (): string => {
  return todayKey();
};

export const isToday = (dateString: string): boolean => {
  return dateString.startsWith(getTodayString());
};

export const isYesterday = (dateString: string): boolean => {
  return dateString.startsWith(toDateKey(addDays(new Date(), -1)));
};

export const getMonthStart = (date: Date = new Date()): Date => {
  return new Date(date.getFullYear(), date.getMonth(), 1);
};

export const getMonthEnd = (date: Date = new Date()): Date => {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
};