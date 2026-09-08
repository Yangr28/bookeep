import { Transaction, Account, Category, Transfer, RecurringRecord, RecordTemplate, FixedDeposit, Loan } from '../types';
import { Budget } from '../store/budgetsSlice';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { loadFromStorage, saveToStorage } from './storage';

export interface ExportData {
  version: string;
  exportTime: string;
  transactions: Transaction[];
  accounts: Account[];
  categories: Category[];
  transfers: Transfer[];
  recurringRecords: RecurringRecord[];
  templates: RecordTemplate[];
  budgets: Budget[];
  fixedDeposits: FixedDeposit[];
  loans: Loan[];
}

/** 备份文件记录（保存在 localStorage） */
export interface BackupRecord {
  id: string;
  fileName: string;
  fileUri: string;
  exportTime: string;
  stats: {
    transactions: number;
    accounts: number;
    categories: number;
    transfers: number;
    recurringRecords: number;
    templates: number;
    budgets: number;
    fixedDeposits: number;
    loans: number;
  };
}

const BACKUPS_KEY = 'bookeep_backups';

export const CURRENT_EXPORT_VERSION = '4.5.0';

interface ExportParams {
  transactions: Transaction[];
  accounts: Account[];
  categories: Category[];
  transfers: Transfer[];
  recurringRecords: RecurringRecord[];
  templates: RecordTemplate[];
  budgets: Budget[];
  fixedDeposits: FixedDeposit[];
  loans: Loan[];
}

export const exportData = (params: ExportParams): ExportData => {
  return {
    version: CURRENT_EXPORT_VERSION,
    exportTime: new Date().toISOString(),
    transactions: params.transactions,
    accounts: params.accounts,
    categories: params.categories,
    transfers: params.transfers,
    recurringRecords: params.recurringRecords,
    templates: params.templates,
    budgets: params.budgets,
    fixedDeposits: params.fixedDeposits,
    loans: params.loans,
  };
};

export const downloadExportFile = async (data: ExportData): Promise<{ uri: string; fileName: string }> => {
  const json = JSON.stringify(data, null, 2);
  const fileName = `bookeep_backup_${new Date().toISOString().split('T')[0]}_${Date.now()}.json`;

  try {
    const result = await Filesystem.writeFile({
      path: fileName,
      data: json,
      directory: Directory.Documents,
      encoding: Encoding.UTF8,
    });

    return { uri: result.uri, fileName };
  } catch (error) {
    console.warn('Filesystem write failed, falling back to browser download:', error);

    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    return { uri: `downloads://${fileName}`, fileName };
  }
};

/** 保存一条备份记录到 localStorage */
export const saveBackupRecord = (record: BackupRecord): void => {
  const list = loadBackupRecords();
  list.unshift(record);
  saveToStorage(BACKUPS_KEY, list);
};

/** 读取所有备份记录（按导出时间倒序） */
export const loadBackupRecords = (): BackupRecord[] => {
  return loadFromStorage<BackupRecord[]>(BACKUPS_KEY, []);
};

/** 删除一条备份记录（可选删除对应文件） */
export const deleteBackupRecord = async (id: string, deleteFile = true): Promise<void> => {
  const list = loadBackupRecords();
  const target = list.find((r) => r.id === id);
  if (!target) return;

  if (deleteFile && target.fileUri && !target.fileUri.startsWith('downloads://')) {
    try {
      await Filesystem.deleteFile({
        path: target.fileName,
        directory: Directory.Documents,
      });
    } catch (e) {
      // 文件可能已被用户手动删除，忽略错误
      console.warn('删除备份文件失败:', e);
    }
  }

  saveToStorage(BACKUPS_KEY, list.filter((r) => r.id !== id));
};

/** 读取一条备份记录对应的文件内容（用于应用内恢复） */
export const readBackupFile = async (record: BackupRecord): Promise<ExportData> => {
  if (record.fileUri.startsWith('downloads://')) {
    throw new Error('此备份文件为浏览器下载，请使用「导入数据」功能恢复');
  }
  const result = await Filesystem.readFile({
    path: record.fileName,
    directory: Directory.Documents,
    encoding: Encoding.UTF8,
  });
  // 使用 UTF8 编码时，data 为 string；否则为 Blob
  const text = typeof result.data === 'string' ? result.data : await (result.data as Blob).text();
  return parseImportData(text);
};

/**
 * 解析并校验导入的备份数据
 * - 校验 JSON 合法性
 * - 校验必备字段存在
 * - 兼容旧版备份（缺少 transfers 等字段时补空数组）
 */
export const parseImportData = (jsonString: string): ExportData => {
  const raw = JSON.parse(jsonString);

  if (!raw || typeof raw !== 'object') {
    throw new Error('备份文件格式无效');
  }

  // 必备字段校验
  const required = ['transactions', 'accounts', 'categories'];
  for (const key of required) {
    if (!Array.isArray(raw[key])) {
      throw new Error(`备份文件缺少必备字段: ${key}`);
    }
  }

  // 兼容旧版备份：缺少的字段补空数组
  return {
    version: raw.version || 'unknown',
    exportTime: raw.exportTime || new Date().toISOString(),
    transactions: raw.transactions,
    accounts: raw.accounts,
    categories: raw.categories,
    transfers: Array.isArray(raw.transfers) ? raw.transfers : [],
    recurringRecords: Array.isArray(raw.recurringRecords) ? raw.recurringRecords : [],
    templates: Array.isArray(raw.templates) ? raw.templates : [],
    budgets: Array.isArray(raw.budgets) ? raw.budgets : [],
    fixedDeposits: Array.isArray(raw.fixedDeposits) ? raw.fixedDeposits : [],
    loans: Array.isArray(raw.loans) ? raw.loans : [],
  };
};
