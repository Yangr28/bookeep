const TRANSACTIONS_KEY = 'bookeep_transactions';
const CATEGORIES_KEY = 'bookeep_categories';
const ACCOUNTS_KEY = 'bookeep_accounts';
const FIXED_DEPOSITS_KEY = 'bookeep_fixed_deposits';
const LOANS_KEY = 'bookeep_loans';
const TRANSFERS_KEY = 'bookeep_transfers';

/** 存储写入失败时的全局回调（由 App 层设置，用于提示用户导出备份） */
let onStorageError: ((key: string) => void) | null = null;

/** 设置存储失败回调（在 App 初始化时调用） */
export const setStorageErrorCallback = (cb: (key: string) => void) => {
  onStorageError = cb;
};

export const loadFromStorage = <T>(key: string, defaultValue: T): T => {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : defaultValue;
  } catch {
    return defaultValue;
  }
};

export const saveToStorage = <T>(key: string, value: T): void => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    // 容量超限（QuotaExceededError）或其他写入失败
    console.error(`存储写入失败 [${key}]:`, e);
    if (onStorageError) onStorageError(key);
  }
};

export const loadTransactions = <T>(defaultValue: T): T => {
  return loadFromStorage(TRANSACTIONS_KEY, defaultValue);
};

export const saveTransactions = <T>(value: T): void => {
  saveToStorage(TRANSACTIONS_KEY, value);
};

export const loadCategories = <T>(defaultValue: T): T => {
  return loadFromStorage(CATEGORIES_KEY, defaultValue);
};

export const saveCategories = <T>(value: T): void => {
  saveToStorage(CATEGORIES_KEY, value);
};

export const loadAccounts = <T>(defaultValue: T): T => {
  return loadFromStorage(ACCOUNTS_KEY, defaultValue);
};

export const saveAccounts = <T>(value: T): void => {
  saveToStorage(ACCOUNTS_KEY, value);
};

export const loadFixedDeposits = <T>(defaultValue: T): T => {
  return loadFromStorage(FIXED_DEPOSITS_KEY, defaultValue);
};

export const saveFixedDeposits = <T>(value: T): void => {
  saveToStorage(FIXED_DEPOSITS_KEY, value);
};

export const loadLoans = <T>(defaultValue: T): T => {
  return loadFromStorage(LOANS_KEY, defaultValue);
};

export const saveLoans = <T>(value: T): void => {
  saveToStorage(LOANS_KEY, value);
};

export const loadTransfers = <T>(defaultValue: T): T => {
  return loadFromStorage(TRANSFERS_KEY, defaultValue);
};

export const saveTransfers = <T>(value: T): void => {
  saveToStorage(TRANSFERS_KEY, value);
};